import * as gi from 'azure-devops-node-api/interfaces/GitInterfaces';
import { IdentityRef } from 'azure-devops-node-api/interfaces/common/VSSInterfaces';
import * as path from 'node:path';
import * as vs from 'vscode';
import { COMMENT_CONTROLLER_ID } from './constants';
import { toVsPosition, toUri, toGiPosition } from './utils';
import { AzureClient } from './client';
import { Identity } from 'azure-devops-node-api/interfaces/IdentitiesInterfaces';
import last from 'lodash-es/last';

/**
 * Interface for handling comment threads.
 */
export interface CommentHandler extends vs.Disposable {
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
        client: AzureClient,
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
        client: AzureClient,
    ): Promise<void>;

    /**
     * Clears all comment threads.
     */
    clearComments(): void;
}

export function createCommentHandler(): CommentHandler {
    return new CommentHandlerImpl();
}

export type CommentHandlerFactory = typeof createCommentHandler;

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
    ) {
        return new CommentImpl(
            new vs.MarkdownString(content),
            vs.CommentMode.Preview,
            { name: CommentImpl.formatAuthor(currentUser, commentAuthor) },
            azureThread,
            azureComment,
            reactions,
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

class CommentHandlerImpl implements CommentHandler {
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
        if (!this.validThread(thread)) {
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
            content = content.replace(
                /```suggestion/g,
                '**Suggestion**:\n```suggestion',
            );

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
        ct.label = `[${gi.CommentThreadStatus[thread.status!].toString()}]`;

        if (
            thread.status !== undefined &&
            this.RESOLVED_STATUSES.includes(thread.status)
        ) {
            ct.state = vs.CommentThreadState.Resolved;
        } else {
            ct.state = vs.CommentThreadState.Unresolved;
        }

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
        client: AzureClient,
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
        thread.label =
            gi.CommentThreadStatus[gi.CommentThreadStatus.Active].toString();

        // register the new thread among the threads to be disposed if reloading
        this.threads.push(thread);
        thread.comments = [...thread.comments, comment];
    }

    async replyToThread(
        reply: vs.CommentReply,
        pullRequestId: number,
        client: AzureClient,
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

    private validThread(thread: gi.GitPullRequestCommentThread): boolean {
        return (
            !!thread.threadContext &&
            !!thread.threadContext.filePath &&
            !!thread.threadContext.rightFileStart &&
            !!thread.threadContext.rightFileEnd &&
            !thread.isDeleted
        );
    }
}
