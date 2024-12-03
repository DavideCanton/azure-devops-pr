import * as gi from 'azure-devops-node-api/interfaces/GitInterfaces';
import { IdentityRef } from 'azure-devops-node-api/interfaces/common/VSSInterfaces';
import * as path from 'node:path';
import * as vs from 'vscode';
import { COMMENT_CONTROLLER_ID } from './constants';
import { toVsPosition, toUri, toGiPosition, DisposableLike } from './utils';
import { IAzureClient } from './clients';
import { Identity } from 'azure-devops-node-api/interfaces/IdentitiesInterfaces';
import last from 'lodash-es/last';

/**
 * Interface for handling comment threads.
 */
export interface ICommentHandler extends DisposableLike {
    /**
     * Maps a pull request comment thread to a VS Code comment thread.
     * @param thread The thread to map.
     * @param repoRoot The root of the repository.
     * @param currentUser The currently logged in user.
     * @returns The VS Code comment thread or null if the thread is not valid.
     */
    mapThread(
        thread: gi.GitPullRequestCommentThread,
        repoRoot: string,
        currentUser: Identity,
    ): Promise<vs.CommentThread | null>;

    /**
     * Updates the commenting range provider's range.
     * @param hasPrActive Whether or not a pull request is active.
     */
    updateCommentingProviderRange(hasPrActive: boolean): void;

    /**
     * Creates a new comment thread with a comment.
     * @param reply The comment reply.
     * @param pullRequestId The pull request ID.
     * @param repoRoot The root of the repository.
     * @param client The Azure DevOps client.
     */
    createThreadWithComment(
        reply: vs.CommentReply,
        pullRequestId: number,
        repoRoot: string,
        client: IAzureClient,
    ): Promise<void>;

    /**
     * Replies to a comment thread.
     * @param reply The comment reply.
     * @param pullRequestId The pull request ID.
     * @param client The Azure DevOps client.
     */
    replyToThread(
        reply: vs.CommentReply,
        pullRequestId: number,
        client: IAzureClient,
    ): Promise<void>;

    /**
     * Updates the status of a comment thread.
     * @param thread: The thread.
     * @param status The new status.
     * @param pullRequestId The pull request ID.
     * @param client The Azure DevOps client.
     */
    updateStatus(
        thread: vs.CommentThread,
        status: gi.CommentThreadStatus,
        pullRequestId: number,
        client: IAzureClient,
    ): Promise<void>;

    /**
     * Clears all comment threads.
     */
    clearComments(): void;
}

class CommentImpl implements vs.Comment {
    private constructor(
        public readonly body: string | vs.MarkdownString,
        public readonly mode: vs.CommentMode,
        public readonly author: vs.CommentAuthorInformation,
        public readonly azureThread: gi.CommentThread,
        public readonly azureComment?: gi.Comment,
        public readonly reactions?: vs.CommentReaction[],
        public readonly contextValue?: string,
        public readonly label?: string,
        public readonly timestamp?: Date,
    ) {}

    /**
     * Creates a new comment instance with the given content, current user, Azure thread, Azure comment, and optional reactions.
     *
     * @param {string} content - The content of the comment.
     * @param {Identity} currentUser - The current user creating the comment.
     * @param {gi.CommentThread} azureThread - The Azure comment thread associated with the comment.
     * @param {gi.Comment} azureComment - The Azure comment associated with the comment.
     * @param {vs.CommentReaction[]} [reactions] - Optional reactions for the comment.
     * @param {IdentityRef | 'self'} [commentAuthor='self'] - The author of the comment. Defaults to 'self'.
     * @return {CommentImpl} The newly created comment instance.
     */
    static createComment(
        content: string,
        currentUser: Identity,
        azureThread: gi.CommentThread,
        azureComment: gi.Comment,
        reactions?: vs.CommentReaction[],
        commentAuthor: IdentityRef | 'self' = 'self',
    ): CommentImpl {
        return new CommentImpl(
            new vs.MarkdownString(content),
            vs.CommentMode.Preview,
            { name: CommentImpl.formatAuthor(currentUser, commentAuthor) },
            azureThread,
            azureComment,
            reactions,
        );
    }

    updateWith(updated: Partial<CommentImpl>): CommentImpl {
        return new CommentImpl(
            updated.body ?? this.body,
            updated.mode ?? this.mode,
            updated.author ?? this.author,
            updated.azureThread ?? this.azureThread,
            updated.azureComment ?? this.azureComment,
            updated.reactions ?? this.reactions,
            updated.contextValue ?? this.contextValue,
            updated.label ?? this.label,
            updated.timestamp ?? this.timestamp,
        );
    }

    /**
     * Formats the author name based on the current user and the provided user.
     *
     * Adds '(You)' if the author is the current user.
     *
     * @param {Identity} currentUser - The current user.
     * @param {IdentityRef | undefined | 'self'} [user='self'] - The user to format the author name for. Defaults to 'self'.
     * @return {string} The formatted author name.
     */
    static formatAuthor(
        currentUser: Identity,
        user: IdentityRef | undefined | 'self' = 'self',
    ): string {
        const defaultName = 'Unknown user';

        let display: string | undefined = undefined;
        if (user) {
            if (user === 'self') {
                display = currentUser.customDisplayName;
            } else if ('displayName' in user) {
                display = user.displayName;
            }
        }
        if (!display) {
            display = defaultName;
        }

        if (user === 'self' || user.id === currentUser.id) {
            display += ' (You)';
        }

        return display;
    }
}

export class CommentHandler implements ICommentHandler {
    private commentController: vs.CommentController;
    private threads: vs.CommentThread[] = [];

    private readonly RESOLVED_STATUSES = [
        gi.CommentThreadStatus.ByDesign,
        gi.CommentThreadStatus.Closed,
        gi.CommentThreadStatus.Fixed,
        gi.CommentThreadStatus.WontFix,
    ];

    constructor() {
        this.commentController = vs.comments.createCommentController(
            COMMENT_CONTROLLER_ID,
            'Comments',
        );
    }

    dispose() {
        this.commentController.dispose();
    }

    clearComments(): void {
        this.threads.forEach(t => t.dispose());
        this.threads = [];
    }

    async mapThread(
        thread: gi.GitPullRequestCommentThread,
        repoRoot: string,
        currentUser: Identity,
    ): Promise<vs.CommentThread | null> {
        if (!this.isValidThread(thread)) {
            return null;
        }

        const context = thread.threadContext!;

        const comments: CommentImpl[] = [];

        for (const comment of thread.comments ?? []) {
            // TODO fix here
            // const avatar = comment.author?._links.avatar.href;
            // const iconPath = avatar ? (await this.client.getAvatar(avatar)) : undefined;

            let reactions: vs.CommentReaction[] | undefined = undefined;
            if (comment.usersLiked) {
                const likedByYou = comment.usersLiked.some(
                    u => u.id === currentUser.id,
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
            if (content) {
                content = content.replace(
                    /```suggestion/g,
                    '**Suggestion**:\n```suggestion',
                );
            }

            comments.push(
                CommentImpl.createComment(
                    content,
                    currentUser,
                    thread,
                    comment,
                    reactions,
                    comment.author,
                ),
            );
        }

        // TODO filter out threads on files outside the current folder?
        const ct = this.commentController.createCommentThread(
            toUri(context.filePath!, repoRoot),
            // TODO for now let's handle just threads on the right file
            new vs.Range(
                toVsPosition(context.rightFileStart!),
                toVsPosition(context.rightFileEnd!),
            ),
            comments,
        );
        this.updateCommentThread(ct, thread);
        this.threads.push(ct);

        return ct;
    }

    updateCommentingProviderRange(hasPrActive: boolean) {
        // TODO add reaction handler to comment controller to handle like

        if (hasPrActive) {
            this.commentController.commentingRangeProvider = {
                provideCommentingRanges: (document, token) => {
                    if (document.uri.scheme === 'file') {
                        return [new vs.Range(0, 0, document.lineCount, 1)];
                    } else {
                        return undefined;
                    }
                },
            };
        } else {
            this.commentController.commentingRangeProvider = undefined;
        }
    }

    async createThreadWithComment(
        reply: vs.CommentReply,
        pullRequestId: number,
        repoRoot: string,
        client: IAzureClient,
    ): Promise<void> {
        const thread = reply.thread;

        let start: gi.CommentPosition;
        let end: gi.CommentPosition;

        if (thread.range.isEmpty) {
            // empty ranges add a comment to the line of the range
            const editor = vs.window.visibleTextEditors.find(
                e => e.document.uri.scheme === 'file',
            );
            if (!editor) {
                // should never happen since comments are added to a visible editor
                vs.window.showErrorMessage('Cannot create comment');
                return;
            }
            start = toGiPosition(new vs.Position(thread.range.start.line, 0));
            end = toGiPosition(
                editor.document.lineAt(thread.range.end.line).range.end,
            );
        } else {
            start = toGiPosition(thread.range.start);
            end = toGiPosition(thread.range.end);
        }

        const rel = path.relative(repoRoot, thread.uri.fsPath);
        let filePath;
        if (process.platform === 'win32') {
            filePath = path.posix.join(...rel.split(path.win32.sep));
        } else {
            filePath = rel;
        }

        const azureThread = await client.createThread(
            pullRequestId,
            reply.text,
            {
                filePath: `/${filePath}`,
                rightFileStart: start,
                rightFileEnd: end,
            },
        );
        const comment = CommentImpl.createComment(
            reply.text,
            client.user,
            azureThread,
            azureThread.comments![0],
        );
        this.updateCommentThread(thread, azureThread);

        // register the new thread among the threads to be disposed if reloading
        this.threads.push(thread);
        thread.comments = [...thread.comments, comment];
    }

    async replyToThread(
        reply: vs.CommentReply,
        pullRequestId: number,
        client: IAzureClient,
    ): Promise<void> {
        const thread = reply.thread;
        const lastComment = last(thread.comments) as CommentImpl;

        const azureThread = lastComment.azureThread;
        const azureComment = await client.comment(
            reply.text,
            pullRequestId,
            azureThread.id!,
            lastComment.azureComment!.id!,
        );
        const comment = CommentImpl.createComment(
            reply.text,
            client.user,
            azureThread,
            azureComment,
        );
        thread.comments = [...thread.comments, comment];
    }

    async updateStatus(
        thread: vs.CommentThread,
        status: gi.CommentThreadStatus,
        pullRequestId: number,
        client: IAzureClient,
    ): Promise<void> {
        const lastComment = last(thread.comments) as CommentImpl;
        const azureThread = lastComment.azureThread;
        if (azureThread.status !== status) {
            const updated = await client.updateThread(
                pullRequestId,
                azureThread.id!,
                { status },
            );
            thread.comments = [
                ...thread.comments.map(c =>
                    (c as CommentImpl).updateWith({
                        azureThread: updated,
                    }),
                ),
            ];
            this.updateCommentThread(thread, updated);
        }
    }

    private isValidThread(thread: gi.GitPullRequestCommentThread): boolean {
        return (
            !!thread.threadContext &&
            !!thread.threadContext.filePath &&
            !!thread.threadContext.rightFileStart &&
            !!thread.threadContext.rightFileEnd &&
            !thread.isDeleted
        );
    }

    private updateCommentThread(
        ct: vs.CommentThread,
        thread: gi.GitPullRequestCommentThread,
    ): void {
        const status = thread.status!;

        ct.state = this.RESOLVED_STATUSES.includes(status)
            ? vs.CommentThreadState.Resolved
            : vs.CommentThreadState.Unresolved;

        const statusName = gi.CommentThreadStatus[status].toString();
        ct.label = `[${statusName}]`;

        ct.contextValue = `|status=${statusName}|`;
    }
}
