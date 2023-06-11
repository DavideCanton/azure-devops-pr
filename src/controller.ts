import * as gi from "azure-devops-node-api/interfaces/GitInterfaces";
import * as vsc from "vscode";
import { AzureClient, getClient } from "./client";
import { COMMENT_CONTROLLER_ID, OPEN_CMD, REFRESH_CMD } from "./constants";
import { GitUtils } from "./git-utils";
import { log, logException } from "./logs";
import path = require("path");

export class ExtensionController
{
    private client: AzureClient;
    private statusBarItem: vsc.StatusBarItem;
    private lastBranch: string | null;
    private pullRequest: gi.GitPullRequest | null;
    private commentController: vsc.CommentController;
    private allComments: vsc.CommentThread[];
    private gitUtils: GitUtils = new GitUtils();

    activate(context: vsc.ExtensionContext)
    {
        this.client = getClient();
        this.statusBarItem = vsc.window.createStatusBarItem(
            vsc.StatusBarAlignment.Left
        );
        this.lastBranch = null;
        this.pullRequest = null;

        this.commentController = vsc.comments.createCommentController(
            COMMENT_CONTROLLER_ID,
            "Comment Controller"
        );
        this.allComments = [];

        // A `CommentingRangeProvider` controls where gutter decorations that allow adding comments are shown
        this.commentController.commentingRangeProvider = {
            provideCommentingRanges: (document, token) => [],
        };

        context.subscriptions.push(this.commentController);
        context.subscriptions.push(
            vsc.commands.registerCommand(REFRESH_CMD, async () => this.registerRefresh())
        );
        context.subscriptions.push(
            vsc.commands.registerCommand(
                OPEN_CMD,
                async (filePath, start, end) => this.registerOpen(filePath, start, end)
            )
        );
    }

    deactivate()
    {
    }

    private async registerRefresh()
    {
        try
        {
            const currentBranch = this.gitUtils.getCurrentBranch();
            if(!currentBranch)
            {
                vsc.window.showErrorMessage("Cannot detect current branch!");
                return;
            }

            log(`Detected branch ${currentBranch}`);

            // redownload pull request if branch has changed or no pr was downloaded
            if(currentBranch !== this.lastBranch || !this.pullRequest)
            {
                this.lastBranch = currentBranch;
                this.pullRequest = await this.client.loadPullRequest(this.lastBranch!);

                if(this.pullRequest)
                    log(`Downloaded PR ${this.pullRequest.pullRequestId!}`);
                else
                    log('No PR found');
            }

            if(!this.pullRequest) return;

            const prId = this.pullRequest!.pullRequestId!;
            const threads = await this.client.loadThreads(prId);

            log(`Downloaded ${threads.length} threads.`);

            this.clearComments();

            this.allComments = threads
                .filter(t => this.validThread(t))
                .map(t => this.createVscodeThread(t))
                .filter(c => !!c) as vsc.CommentThread[];

            this.statusBarItem.text = `PR: !${prId} (Threads: ${threads.length})`;
            this.statusBarItem.show();
        }
        catch(error)
        {
            this.clearComments();
            vsc.window.showErrorMessage("Error while downloading comments");
            logException(error as Error);
        }
    }

    private async registerOpen(filePath: string, start: gi.CommentPosition, end: gi.CommentPosition)
    {
        try
        {
            vsc.window.showTextDocument(this.toUri(filePath), {
                selection: new vsc.Range(
                    this.toPosition(start),
                    this.toPosition(end)
                ),
            });
        } catch(error)
        {
            vsc.window.showErrorMessage("Error while displaying comments");
            logException(error as Error);
        }
    }

    private createVscodeThread(t: gi.GitPullRequestCommentThread): vsc.CommentThread | null
    {
        const context = t.threadContext!;

        const comments = t.comments?.map((c) =>
        {
            return {
                mode: vsc.CommentMode.Preview,
                body: c.content!,
                author: {
                    name: c.author?.displayName ?? "Author",
                    // iconPath: c.author?._links.avatar.href
                },
                reactions: c.usersLiked
                    ? [
                        {
                            count: c.usersLiked.length,
                            label: "Like",
                        },
                    ]
                    : undefined,
            } as vsc.Comment;
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
        ct.canReply = false;
        ct.label = `[${gi.CommentThreadStatus[t.status!]}] Thread ${t.id!}`;
        return ct;
    }

    private clearComments()
    {
        this.allComments.forEach(c => c.dispose());
    }

    private validThread(t: gi.GitPullRequestCommentThread): boolean
    {
        return (
            !!t.threadContext &&
            !!t.threadContext.filePath &&
            !!t.threadContext.rightFileStart &&
            !!t.threadContext.rightFileEnd
        );
    }

    private toPosition(cp: gi.CommentPosition): vsc.Position
    {
        return new vsc.Position(cp.line! - 1, cp.offset! - 1);
    }

    private toUri(filePath: string): vsc.Uri
    {
        return vsc.Uri.file(
            path.join(
                this.gitUtils.getRepoRoot()!,
                filePath.replace(/^\//, "")
            )
        );
    }
}
