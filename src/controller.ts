import * as gi from 'azure-devops-node-api/interfaces/GitInterfaces';
import { IdentityRef } from 'azure-devops-node-api/interfaces/common/VSSInterfaces';
import debounce from 'lodash-es/debounce';
import * as path from 'node:path';
import * as vsc from 'vscode';
import { AzureClient, getClient } from './client';
import { ConfigurationManager } from './config';
import * as C from './constants';
import { GitHandler } from './git-utils';
import { log, logException } from './logs';
import { StatusBarHandler } from './status-bar';

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

const RESOLVED_STATUSES: readonly gi.CommentThreadStatus[] = [
    gi.CommentThreadStatus.ByDesign,
    gi.CommentThreadStatus.Closed,
    gi.CommentThreadStatus.Fixed,
    gi.CommentThreadStatus.WontFix,
];

export class ExtensionController {
    private statusBarHandler: StatusBarHandler;
    private lastBranch: string | null = null;
    private pullRequest: gi.GitPullRequest | null = null;
    private commentController: vsc.CommentController;
    private client: AzureClient;
    private fsWatcher: vsc.FileSystemWatcher;
    private threads: vsc.CommentThread[] = [];

    constructor(
        private gitHandler: GitHandler,
        private configManager: ConfigurationManager,
    ) {}

    async activate(context: vsc.ExtensionContext) {
        if (!(await this.gitHandler.load())) {
            vsc.window.showErrorMessage('No git repository found');
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

        this.commentController = vsc.comments.createCommentController(
            C.COMMENT_CONTROLLER_ID,
            'Comment Controller',
        );
        // A `CommentingRangeProvider` controls where gutter decorations that allow adding comments are shown
        this.commentController.commentingRangeProvider = {
            provideCommentingRanges: (document, token) => {
                if (document.uri.scheme === 'file') {
                    return [new vsc.Range(0, 0, document.lineCount, 1)];
                } else {
                    return undefined;
                }
            },
        };
        // TODO add reaction handler to comment controller to handle like

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

    private setupMonitor(context: vsc.ExtensionContext) {
        const repo = this.gitHandler.repositoryRoot;

        // TODO this does not work with worktrees
        this.fsWatcher = vsc.workspace.createFileSystemWatcher(
            new vsc.RelativePattern(vsc.Uri.file(repo), '.git/HEAD'),
        );

        const branchChangeCallback = debounce(async () => {
            const currentBranch = await this.gitHandler.getCurrentBranch();
            if (currentBranch) await this.redownload(currentBranch);
        }, 1000);

        this.fsWatcher.onDidCreate(u => branchChangeCallback());
        this.fsWatcher.onDidChange(u => branchChangeCallback());
        this.fsWatcher.onDidDelete(u => branchChangeCallback());

        context.subscriptions.push(this.fsWatcher);
    }

    private async createComment(reply: vsc.CommentReply) {
        const thread = reply.thread;
        const pullRequestId = this.pullRequest!.pullRequestId!;

        let comment: MyComment;

        if (!thread.comments.length) {
            const line = reply.thread.range.start.line;
            const editor = vsc.window.visibleTextEditors.find(
                e => e.document.uri.scheme === 'file',
            );
            if (!editor) {
                vsc.window.showErrorMessage('Cannot create comment');
                return;
            }
            const lineLength =
                editor.document.lineAt(line).range.end.character + 1;

            const rel = path.relative(
                this.gitHandler.repositoryRoot,
                reply.thread.uri.fsPath,
            );
            let filePath;
            if (process.platform === 'win32') {
                filePath = path.posix.join(...rel.split(path.win32.sep));
            } else {
                filePath = rel;
            }

            const azureThread = await this.client.createThread(
                pullRequestId,
                reply.text,
                {
                    filePath: '/' + filePath,
                    rightFileStart: {
                        line: line + 1,
                        offset: 1,
                    },
                    rightFileEnd: {
                        line: line + 1,
                        offset: lineLength,
                    },
                },
            );
            comment = new MyComment(
                new vsc.MarkdownString(reply.text),
                vsc.CommentMode.Preview,
                { name: this.formatAuthor() },
                azureThread,
                azureThread.comments![0],
            );
            thread.label =
                gi.CommentThreadStatus[
                    gi.CommentThreadStatus.Active
                ].toString();
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
                { name: this.formatAuthor() },
                azureThread,
                createdComment,
            );
        }

        thread.comments = [...thread.comments, comment];
    }

    private formatAuthor(
        user: IdentityRef | undefined | 'self' = 'self',
    ): string {
        const defaultName = 'Unknown user';

        let display: string | undefined = undefined;
        if (user) {
            if (user === 'self') {
                display = this.client.user.customDisplayName;
            } else if ('displayName' in user) {
                display = user.displayName;
            }
        }
        if (!display) {
            display = defaultName;
        }

        if (user === 'self' || user.id === this.client.user.id) {
            display += ' (You)';
        }

        return display;
    }

    private async redownload(currentBranch: string) {
        this.lastBranch = currentBranch;
        this.pullRequest = await this.client.loadPullRequest(this.lastBranch!);

        this.clearComments();

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

        for (const t of threads) {
            if (this.validThread(t)) {
                const vscThread = await this.createVscodeThread(t);
                if (vscThread) {
                    this.threads.push(vscThread);
                }
            }
        }
    }

    private async load(reloadClient = false) {
        if (!this.client || reloadClient) {
            try {
                this.client = getClient(this.configManager);
                await this.client.activate();
            } catch (error) {
                this.clearComments();
                vsc.window.showErrorMessage(
                    'Error while initializing the extension',
                );
                logException(error as Error);
                throw error;
            }
        }

        try {
            const currentBranch = await this.gitHandler.getCurrentBranch();
            if (!currentBranch) {
                vsc.window.showErrorMessage('Cannot detect current branch!');
                return;
            }
            log(`Detected branch ${currentBranch}`);
            await this.redownload(currentBranch);
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

        const uri = this.configManager.configuration.buildPullRequestUrl(prId);
        vsc.env.openExternal(uri);
    }

    private async createVscodeThread(
        thread: gi.GitPullRequestCommentThread,
    ): Promise<vsc.CommentThread | null> {
        const context = thread.threadContext!;

        const comments: MyComment[] = [];

        for (const comment of thread.comments ?? []) {
            // TODO fix here
            // const avatar = comment.author?._links.avatar.href;
            // const iconPath = avatar ? (await this.client.getAvatar(avatar)) : undefined;

            let reactions: vsc.CommentReaction[] | undefined = undefined;
            if (comment.usersLiked) {
                const likedByYou = comment.usersLiked.some(
                    u => u.id === this.client.user.id,
                );
                const countOthers =
                    comment.usersLiked.length - (likedByYou ? 1 : 0);

                reactions = [];

                if (likedByYou) {
                    reactions.push({
                        count: 1,
                        label: 'Liked by you',
                        authorHasReacted: true,
                        iconPath: '',
                    });
                }
                if (countOthers) {
                    reactions.push({
                        count: countOthers,
                        label: 'Like',
                        authorHasReacted: false,
                        iconPath: '',
                    });
                }
            }

            let content = comment.content!;
            content = content.replace(
                /```suggestion/g,
                '**Suggestion**:\n```suggestion',
            );

            comments.push(
                new MyComment(
                    new vsc.MarkdownString(content),
                    vsc.CommentMode.Preview,
                    {
                        name: this.formatAuthor(comment.author),
                    },
                    thread,
                    comment,
                    reactions,
                ),
            );
        }

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
        ct.label = gi.CommentThreadStatus[thread.status!].toString();

        if (thread.status && RESOLVED_STATUSES.includes(thread.status)) {
            ct.state = vsc.CommentThreadState.Resolved;
        } else {
            ct.state = vsc.CommentThreadState.Unresolved;
        }

        return ct;
    }

    private clearComments() {
        this.threads.forEach(t => t.dispose());
        this.threads = [];
    }

    private validThread(thread: gi.GitPullRequestCommentThread): boolean {
        return (
            !!thread.threadContext &&
            !!thread.threadContext.filePath &&
            !!thread.threadContext.rightFileStart &&
            !!thread.threadContext.rightFileEnd &&
            !thread.isDeleted
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
