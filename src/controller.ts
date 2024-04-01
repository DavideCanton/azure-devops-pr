import {
    Comment,
    CommentPosition,
    CommentThread,
    CommentThreadStatus,
    GitPullRequest,
    GitPullRequestCommentThread,
} from 'azure-devops-node-api/interfaces/GitInterfaces';
import { join } from 'node:path';
import {
    CommentAuthorInformation,
    CommentController,
    CommentMode,
    CommentReaction,
    CommentReply,
    ExtensionContext,
    FileSystemWatcher,
    MarkdownString,
    Position,
    Range,
    RelativePattern,
    Uri,
    Comment as VsComment,
    CommentThread as VsCommentThread,
    commands,
    comments,
    env,
    window,
    workspace,
} from 'vscode';
import { AzureClient, getClient } from './client';
import { ConfigurationManager } from './config';
import * as C from './constants';
import { GitHandler } from './git-utils';
import { log, logException } from './logs';
import { StatusBarHandler } from './status-bar';

class MyComment implements VsComment {
    constructor(
        public body: string | MarkdownString,
        public mode: CommentMode,
        public author: CommentAuthorInformation,
        public azureThread: CommentThread,
        public azureComment?: Comment,
        public reactions?: CommentReaction[],
        public contextValue?: string,
        public label?: string,
        public timestamp?: Date,
    ) {}
}

export class ExtensionController {
    private statusBarHandler: StatusBarHandler;
    private lastBranch: string | null = null;
    private pullRequest: GitPullRequest | null = null;
    private commentController: CommentController;
    private allComments: VsCommentThread[] = [];
    private client: AzureClient;
    private fsWatcher: FileSystemWatcher;

    constructor(
        private gitHandler: GitHandler,
        private configManager: ConfigurationManager,
    ) {}

    async activate(context: ExtensionContext) {
        if (!(await this.gitHandler.load())) {
            window.showErrorMessage('No git repository found');
            return;
        }

        try {
            this.configManager.activate();
        } catch (e) {
            log('Cannot load configuration!');
            logException(e as Error);
            return;
        }
        this.statusBarHandler = new StatusBarHandler();

        this.commentController = comments.createCommentController(
            C.COMMENT_CONTROLLER_ID,
            'Comment Controller',
        );
        // A `CommentingRangeProvider` controls where gutter decorations that allow adding comments are shown
        this.commentController.commentingRangeProvider = {
            provideCommentingRanges: (document, token) => {
                return [new Range(0, 0, document.lineCount, 1)];
            },
        };

        context.subscriptions.push(
            this.commentController,
            this.configManager,
            commands.registerCommand(C.REFRESH_CMD, async () => this.load()),
            commands.registerCommand(
                C.OPEN_FILE_CMD,
                async (filePath, start, end) =>
                    this.openFile(filePath, start, end),
            ),
            commands.registerCommand(C.OPEN_PR_CMD, async () => this.openPR()),
            commands.registerCommand(
                C.CREATE_THREAD_CMD,
                async (reply: CommentReply) => this.createComment(reply),
            ),
            commands.registerCommand(C.REPLY_CMD, async (reply: CommentReply) =>
                this.createComment(reply),
            ),
            workspace.onDidChangeConfiguration(e => {
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

    private setupMonitor(context: ExtensionContext) {
        const repo = this.gitHandler.repositoryRoot;

        // TODO this does not work with worktrees
        this.fsWatcher = workspace.createFileSystemWatcher(
            new RelativePattern(Uri.file(repo), '.git/HEAD'),
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

    private async createComment(reply: CommentReply) {
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
                new MarkdownString(reply.text),
                CommentMode.Preview,
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
                new MarkdownString(reply.text),
                CommentMode.Preview,
                { name },
                azureThread,

                createdComment,
            );
        }

        thread.comments = [...thread.comments, comment];
    }

    private async redownload(currentBranch: string) {
        this.lastBranch = currentBranch;
        this.pullRequest = await this.client.loadPullRequest(this.lastBranch!);

        if (this.pullRequest) {
            log(`Downloaded PR ${this.pullRequest.pullRequestId!}`);
        } else {
            log('No PR found');
        }

        const prId = this.pullRequest?.pullRequestId ?? null;
        this.statusBarHandler.displayPR(prId);

        if (prId === null) {
            return;
        }

        const threads = await this.client.loadThreads(prId);

        log(`Downloaded ${threads.length} threads.`);

        this.clearComments();

        this.allComments = threads
            .filter(t => this.validThread(t))
            .map(t => this.createVscodeThread(t))
            .filter(c => !!c) as VsCommentThread[];
    }

    private async load(reloadClient = false) {
        if (!this.client || reloadClient) {
            try {
                this.client = getClient(this.configManager);
                await this.client.activate();
            } catch (error) {
                this.clearComments();
                window.showErrorMessage(
                    'Error while initializing the extension',
                );
                logException(error as Error);
                throw error;
            }
        }

        try {
            const currentBranch = await this.gitHandler.getCurrentBranch();
            if (!currentBranch) {
                window.showErrorMessage('Cannot detect current branch!');
                return;
            }
            log(`Detected branch ${currentBranch}`);
            await this.redownload(currentBranch);
        } catch (error) {
            this.clearComments();
            window.showErrorMessage('Error while downloading comments');
            logException(error as Error);
        }
    }

    private async openFile(
        filePath: string,
        start: CommentPosition,
        end: CommentPosition,
    ) {
        try {
            window.showTextDocument(this.toUri(filePath), {
                selection: new Range(
                    this.toPosition(start),
                    this.toPosition(end),
                ),
            });
        } catch (error) {
            window.showErrorMessage('Error while displaying comments');
            logException(error as Error);
        }
    }

    private async openPR() {
        const prId = this.pullRequest?.pullRequestId;
        if (!prId) return;

        const uri = Uri.parse(
            this.configManager._configuration.buildPullRequestId(prId),
        );
        env.openExternal(uri);
    }

    private createVscodeThread(
        thread: GitPullRequestCommentThread,
    ): VsCommentThread | null {
        const context = thread.threadContext!;

        const comments =
            thread.comments?.map(comment => {
                return new MyComment(
                    new MarkdownString(comment.content!),
                    CommentMode.Preview,
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
                              } as CommentReaction,
                          ]
                        : undefined,
                );
            }) ?? [];

        // TODO filter out threads on files outside the current folder?
        const ct = this.commentController.createCommentThread(
            this.toUri(context.filePath!),
            // TODO for now let's handle just threads on the right file
            new Range(
                this.toPosition(context.rightFileStart!),
                this.toPosition(context.rightFileEnd!),
            ),
            comments,
        );
        ct.label = `[${
            CommentThreadStatus[thread.status!]
        }] Thread ${thread.id!}`;
        return ct;
    }

    private clearComments() {
        this.allComments.forEach(c => c.dispose());
    }

    private validThread(thread: GitPullRequestCommentThread): boolean {
        return (
            !!thread.threadContext &&
            !!thread.threadContext.filePath &&
            !!thread.threadContext.rightFileStart &&
            !!thread.threadContext.rightFileEnd
        );
    }

    private toPosition(cp: CommentPosition): Position {
        return new Position(cp.line! - 1, cp.offset! - 1);
    }

    private toUri(filePath: string): Uri {
        return Uri.file(
            join(this.gitHandler.repositoryRoot, filePath.replace(/^\//, '')),
        );
    }
}
