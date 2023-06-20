import * as gi from "azure-devops-node-api/interfaces/GitInterfaces";
import * as vsc from "vscode";
import { AzureClient, getClient } from "./client";
import { Configuration } from "./config";
import * as C from "./constants";
import { GitUtils } from "./git-utils";
import { log, logException } from "./logs";
import path = require("path");

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
    ) { }
}

export class ExtensionController {
    private client: AzureClient;
    private statusBarItem: vsc.StatusBarItem;
    private lastBranch: string | null = null;
    private pullRequest: gi.GitPullRequest | null = null;
    private commentController: vsc.CommentController;
    private allComments: vsc.CommentThread[] = [];
    private gitUtils = new GitUtils();

    constructor(private config: Configuration) { }

    activate(context: vsc.ExtensionContext) {
        this.client = getClient();
        this.statusBarItem = vsc.window.createStatusBarItem(
            vsc.StatusBarAlignment.Left
        );

        this.commentController = vsc.comments.createCommentController(
            C.COMMENT_CONTROLLER_ID,
            "Comment Controller"
        );
        // A `CommentingRangeProvider` controls where gutter decorations that allow adding comments are shown
        this.commentController.commentingRangeProvider = {
            provideCommentingRanges: (document, token) => {
                return [
                    new vsc.Range(0, 0, document.lineCount, 1)
                ];
            }
        };

        context.subscriptions.push(this.commentController);
        context.subscriptions.push(vsc.commands.registerCommand(C.REFRESH_CMD, async () => this.refresh()));
        context.subscriptions.push(
            vsc.commands.registerCommand(
                C.OPEN_FILE_CMD,
                async (filePath, start, end) => this.openFile(filePath, start, end)
            )
        );
        context.subscriptions.push(
            vsc.commands.registerCommand(
                C.OPEN_PR_CMD,
                async () => this.openPR()
            )
        );
        context.subscriptions.push(
            vsc.commands.registerCommand(
                C.CREATE_THREAD_CMD,
                async (reply: vsc.CommentReply) => this.createComment(reply)

            )
        );
        context.subscriptions.push(
            vsc.commands.registerCommand(
                C.REPLY_CMD,
                async (reply: vsc.CommentReply) => this.createComment(reply)
            )
        );

        this.refresh();
    }

    private async createComment(reply: vsc.CommentReply) {
        const thread = reply.thread;
        const pullRequestId = this.pullRequest!.pullRequestId!;
        const name = await this.gitUtils.getCurrentUsername() ?? "Anonymous User";


        let comment: MyComment;
        if (!thread.comments.length) {
            const azureThread = await this.client.createThread(
                pullRequestId, reply.text
            );
            comment = new MyComment(
                new vsc.MarkdownString(reply.text),
                vsc.CommentMode.Preview,
                { name },
                azureThread,
                azureThread.comments![0]
            );
        }
        else {
            const lastComment = thread.comments[thread.comments.length - 1] as MyComment;
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
                createdComment
            );
        }

        thread.comments = [...thread.comments, comment];
    }

    deactivate() {
    }

    private async refresh() {
        try {
            const currentBranch = this.gitUtils.getCurrentBranch();
            if (!currentBranch) {
                vsc.window.showErrorMessage("Cannot detect current branch!");
                return;
            }

            log(`Detected branch ${currentBranch}`);

            // redownload pull request if branch has changed or no pr was downloaded
            if (currentBranch !== this.lastBranch || !this.pullRequest) {
                this.lastBranch = currentBranch;
                this.pullRequest = await this.client.loadPullRequest(this.lastBranch!);

                if (this.pullRequest)
                    log(`Downloaded PR ${this.pullRequest.pullRequestId!}`);
                else
                    log('No PR found');
            }

            if (!this.pullRequest) {
                vsc.window.showInformationMessage("No pull request found for this branch.");
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
        catch (error) {
            this.clearComments();
            vsc.window.showErrorMessage("Error while downloading comments");
            logException(error as Error);
        }
    }

    private async openFile(filePath: string, start: gi.CommentPosition, end: gi.CommentPosition) {
        try {
            vsc.window.showTextDocument(this.toUri(filePath), {
                selection: new vsc.Range(
                    this.toPosition(start),
                    this.toPosition(end)
                ),
            });
        } catch (error) {
            vsc.window.showErrorMessage("Error while displaying comments");
            logException(error as Error);
        }
    }

    private async openPR() {
        const prId = this.pullRequest?.pullRequestId;
        if (!prId)
            return;

        const uri = vsc.Uri.parse(this.config.buildPullRequestId(prId));
        vsc.env.openExternal(uri);
    }

    private createVscodeThread(t: gi.GitPullRequestCommentThread): vsc.CommentThread | null {
        const context = t.threadContext!;

        const comments = t.comments?.map((c) => {
            return new MyComment(
                new vsc.MarkdownString(c.content!),
                vsc.CommentMode.Preview,
                {
                    name: c.author?.displayName ?? "Author",
                    // iconPath: c.author?._links.avatar.href
                },
                t,
                c,
                c.usersLiked
                    ? [
                        {
                            count: c.usersLiked.length,
                            label: "Like",
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
                this.toPosition(context.rightFileEnd!)
            ),
            comments
        );
        ct.label = `[${gi.CommentThreadStatus[t.status!]}] Thread ${t.id!}`;
        return ct;
    }

    private clearComments() {
        this.allComments.forEach(c => c.dispose());
    }

    private validThread(t: gi.GitPullRequestCommentThread): boolean {
        return (
            !!t.threadContext &&
            !!t.threadContext.filePath &&
            !!t.threadContext.rightFileStart &&
            !!t.threadContext.rightFileEnd
        );
    }

    private toPosition(cp: gi.CommentPosition): vsc.Position {
        return new vsc.Position(cp.line! - 1, cp.offset! - 1);
    }

    private toUri(filePath: string): vsc.Uri {
        return vsc.Uri.file(
            path.join(
                this.gitUtils.getRepoRoot()!,
                filePath.replace(/^\//, "")
            )
        );
    }
}
