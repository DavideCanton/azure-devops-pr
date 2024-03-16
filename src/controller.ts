import * as gi from 'azure-devops-node-api/interfaces/GitInterfaces';
import * as vsc from 'vscode';
import { AzureClient, getClient } from './client';
import { ConfigurationManager } from './config';
import * as C from './constants';
import { log, logException } from './logs';
import path = require('path');
import { GitHandler } from './git-utils';

class MyComment implements vsc.Comment {
    constructor(
        public body: string | vsc.MarkdownString,
        public mode: vsc.CommentMode,
        public author: vsc.CommentAuthorInformation,
        public azureThread: gi.CommentThread,
        public azureComment?: gi.Comment,
        public reactions?: vsc.CommentReaction[],
        public contextValue?: string,
        public label?: string,
        public timestamp?: Date,
    ) {}
}

export class ExtensionController {
    private statusBarItem: vsc.StatusBarItem;
    private lastBranch: string | null = null;
    private pullRequest: gi.GitPullRequest | null = null;
    private commentController: vsc.CommentController;
    private allComments: vsc.CommentThread[] = [];
    private client: AzureClient;
    private fsWatcher: vsc.FileSystemWatcher;

    constructor(
        private gitHandler: GitHandler,
        private configManager: ConfigurationManager,
    ) {}

    async activate(context: vsc.ExtensionContext) {
        await this.gitHandler.load();
        this.configManager.activate();

        this.statusBarItem = vsc.window.createStatusBarItem(
            vsc.StatusBarAlignment.Left,
        );

        this.commentController = vsc.comments.createCommentController(
            C.COMMENT_CONTROLLER_ID,
            'Comment Controller',
        );
        // A `CommentingRangeProvider` controls where gutter decorations that allow adding comments are shown
        this.commentController.commentingRangeProvider = {
            provideCommentingRanges: (document, token) => {
                return [new vsc.Range(0, 0, document.lineCount, 1)];
            },
        };

        context.subscriptions.push(
            this.commentController,
            this.configManager,
            vsc.commands.registerCommand(C.REFRESH_CMD, async () =>
                this.load(),
            ),
            vsc.commands.registerCommand(
                C.OPEN_FILE_CMD,
                async (filePath, start, end) =>
                    this.openFile(filePath, start, end),
            ),
            vsc.commands.registerCommand(C.OPEN_PR_CMD, async () =>
                this.openPR(),
            ),
            vsc.commands.registerCommand(
                C.CREATE_THREAD_CMD,
                async (reply: vsc.CommentReply) => this.createComment(reply),
            ),
            vsc.commands.registerCommand(
                C.REPLY_CMD,
                async (reply: vsc.CommentReply) => this.createComment(reply),
            ),
            vsc.workspace.onDidChangeConfiguration(e => {
                this.configManager.emitChangedConfig(e);
            }),
        );

        this.configManager.onConfigChanged(() => {
            this.load(true);
        });

        await this.load();

        this.setupMonitor(context);
    }

    deactivate() {}

    private async setupMonitor(context: vsc.ExtensionContext) {
        const repo = this.gitHandler.repositoryRoot;

        // TODO this does not work with worktrees
        this.fsWatcher = vsc.workspace.createFileSystemWatcher(
            new vsc.RelativePattern(vsc.Uri.file(repo), '.git/HEAD'),
        );

        const branchChangeCallback = async () => {
            const currentBranch = await this.gitHandler.getCurrentBranch();
            if (currentBranch) await this.redownload(currentBranch);
        };

        this.fsWatcher.onDidCreate(u => branchChangeCallback());
        this.fsWatcher.onDidChange(u => branchChangeCallback());
        this.fsWatcher.onDidDelete(u => branchChangeCallback());

        context.subscriptions.push(this.fsWatcher);
    }

    private async createComment(reply: vsc.CommentReply) {
        const thread = reply.thread;
        const pullRequestId = this.pullRequest!.pullRequestId!;
        const name = 'foo';

        let comment: MyComment;
        if (!thread.comments.length) {
            const azureThread = await this.client.createThread(
                pullRequestId,
                reply.text,
            );
            comment = new MyComment(
                new vsc.MarkdownString(reply.text),
                vsc.CommentMode.Preview,
                { name },
                azureThread,
                azureThread.comments![0],
            );
        } else {
            const lastComment = thread.comments[
                thread.comments.length - 1
            ] as MyComment;
            const azureThread = lastComment.azureThread!;
            const createdComment = await this.client.comment(
                reply.text,
                pullRequestId,
                azureThread.id!,
                lastComment.azureComment!.id!,
            );
            comment = new MyComment(
                new vsc.MarkdownString(reply.text),
                vsc.CommentMode.Preview,
                { name },
                azureThread,

                createdComment,
            );
        }

        thread.comments = [...thread.comments, comment];
    }

    private async redownload(currentBranch: string, force: boolean = false) {
        // redownload pull request if branch has changed or no pr was downloaded
        if (currentBranch !== this.lastBranch || !this.pullRequest || force) {
            this.lastBranch = currentBranch;
            this.pullRequest = await this.client.loadPullRequest(
                this.lastBranch!,
            );

            if (this.pullRequest) {
                log(`Downloaded PR ${this.pullRequest.pullRequestId!}`);
            } else {
                log('No PR found');
            }
        }

        if (!this.pullRequest) {
            vsc.window.showInformationMessage(
                'No pull request found for this branch.',
            );
            return;
        }

        const prId = this.pullRequest!.pullRequestId!;
        const threads = await this.client.loadThreads(prId);

        log(`Downloaded ${threads.length} threads.`);

        this.clearComments();

        this.allComments = threads
            .filter(t => this.validThread(t))
            .map(t => this.createVscodeThread(t))
            .filter(c => !!c) as vsc.CommentThread[];

        this.statusBarItem.text = `$(git-pull-request) PR: #${prId}`;
        this.statusBarItem.command = C.OPEN_PR_CMD;
        this.statusBarItem.show();
    }

    private async load(force: boolean = false) {
        try {
            const currentBranch = await this.gitHandler.getCurrentBranch();
            if (!currentBranch) {
                vsc.window.showErrorMessage('Cannot detect current branch!');
                return;
            }

            log(`Detected branch ${currentBranch}`);

            this.client = getClient(this.configManager);
            await this.client.activate();

            await this.redownload(currentBranch, force);
        } catch (error) {
            this.clearComments();
            vsc.window.showErrorMessage('Error while downloading comments');
            logException(error as Error);
        }
    }

    private async openFile(
        filePath: string,
        start: gi.CommentPosition,
        end: gi.CommentPosition,
    ) {
        try {
            vsc.window.showTextDocument(this.toUri(filePath), {
                selection: new vsc.Range(
                    this.toPosition(start),
                    this.toPosition(end),
                ),
            });
        } catch (error) {
            vsc.window.showErrorMessage('Error while displaying comments');
            logException(error as Error);
        }
    }

    private async openPR() {
        const prId = this.pullRequest?.pullRequestId;
        if (!prId) return;

        const uri = vsc.Uri.parse(
            this.configManager._configuration.buildPullRequestId(prId),
        );
        vsc.env.openExternal(uri);
    }

    private createVscodeThread(
        thread: gi.GitPullRequestCommentThread,
    ): vsc.CommentThread | null {
        const context = thread.threadContext!;

        const comments =
            thread.comments?.map(comment => {
                return new MyComment(
                    new vsc.MarkdownString(comment.content!),
                    vsc.CommentMode.Preview,
                    {
                        name: comment.author?.displayName ?? 'Author',
                        // iconPath: c.author?._links.avatar.href
                    },
                    thread,
                    comment,
                    comment.usersLiked
                        ? [
                              {
                                  count: comment.usersLiked.length,
                                  label: 'Like',
                                  authorHasReacted: false,
                              } as vsc.CommentReaction,
                          ]
                        : undefined,
                );
            }) ?? [];

        // TODO filter out threads on files outside the current folder?
        const ct = this.commentController.createCommentThread(
            this.toUri(context.filePath!),
            // TODO for now let's handle just threads on the right file
            new vsc.Range(
                this.toPosition(context.rightFileStart!),
                this.toPosition(context.rightFileEnd!),
            ),
            comments,
        );
        ct.label = `[${
            gi.CommentThreadStatus[thread.status!]
        }] Thread ${thread.id!}`;
        return ct;
    }

    private clearComments() {
        this.allComments.forEach(c => c.dispose());
    }

    private validThread(thread: gi.GitPullRequestCommentThread): boolean {
        return (
            !!thread.threadContext &&
            !!thread.threadContext.filePath &&
            !!thread.threadContext.rightFileStart &&
            !!thread.threadContext.rightFileEnd
        );
    }

    private toPosition(cp: gi.CommentPosition): vsc.Position {
        return new vsc.Position(cp.line! - 1, cp.offset! - 1);
    }

    private toUri(filePath: string): vsc.Uri {
        return vsc.Uri.file(
            path.join(
                this.gitHandler.repositoryRoot,
                filePath.replace(/^\//, ''),
            ),
        );
    }
}
