import * as gi from 'azure-devops-node-api/interfaces/GitInterfaces';
import { Configuration, ConfigurationManager } from '../config';
import { Identity } from 'azure-devops-node-api/interfaces/IdentitiesInterfaces';

/**
 * Interface for interacting with Azure DevOps pull requests and threads.
 */
export interface IAzureClient {
    /**
     * The logged-in user's Identity.
     */
    readonly user: Identity;

    /**
     * Activates the client.
     *
     * Can be called multiple times, to reinitialize the client.
     */
    activate(): Promise<void>;

    /**
     * Loads a pull request by branch name.
     * @param branchName The name of the branch to search for.
     * @returns The pull request, or null if it cannot be found.
     */
    loadPullRequest(branchName: string): Promise<gi.GitPullRequest | null>;

    /**
     * Loads the comment threads for a pull request.
     * @param pullRequestId The ID of the pull request.
     * @returns The comment threads for the pull request.
     */
    loadThreads(
        pullRequestId: number,
    ): Promise<gi.GitPullRequestCommentThread[]>;

    /**
     * Creates a new comment in a thread.
     * @param content The content of the comment.
     * @param pullRequestId The ID of the pull request.
     * @param threadId The ID of the thread.
     * @param parentCommentId The optional ID of the parent comment.
     * @returns The created comment.
     */
    comment(
        content: string,
        pullRequestId: number,
        threadId: number,
        parentCommentId: number | null,
    ): Promise<gi.Comment>;

    /**
     * Creates a new comment thread in a pull request.
     * @param pullRequestId The ID of the pull request.
     * @param content The content of the comment.
     * @param threadContext Optional context for the comment thread.
     * @returns The created comment thread.
     */
    createThread(
        pullRequestId: number,
        content: string,
        threadContext?: gi.CommentThreadContext,
    ): Promise<gi.GitPullRequestCommentThread>;

    /**
     * Updates a comment thread.
     * @param pullRequestId The ID of the pull request.
     * @param threadId The thread id to update.
     * @param thread The partial body of the thread with the fields to update.
     * @returns The updated thread.
     */
    updateThread(
        pullRequestId: number,
        threadId: number,
        thread: gi.GitPullRequestCommentThread,
    ): Promise<gi.GitPullRequestCommentThread>;
}
