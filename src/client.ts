import { WebApi, getPersonalAccessTokenHandler } from 'azure-devops-node-api';
import { IGitApi } from 'azure-devops-node-api/GitApi';
import {
    Comment,
    CommentThreadStatus,
    CommentType,
    GitPullRequest,
    GitPullRequestCommentThread,
} from 'azure-devops-node-api/interfaces/GitInterfaces';
import { Configuration, ConfigurationManager } from './config';

declare const USE_MOCKS: boolean;

export interface AzureClient {
    activate(): Promise<void>;
    loadPullRequest(branchName: string): Promise<GitPullRequest | null>;
    loadThreads(pullRequestId: number): Promise<GitPullRequestCommentThread[]>;
    comment(
        content: string,
        pullRequestId: number,
        threadId: number,
        parentCommentId: number | null,
    ): Promise<Comment>;
    createThread(
        pullRequestId: number,
        content: string,
    ): Promise<GitPullRequestCommentThread>;
}

class AzureRealClient implements AzureClient {
    connection: WebApi;
    configurationManager: ConfigurationManager;
    _gitClient: IGitApi | null = null;

    constructor(confManager: ConfigurationManager) {
        this.configurationManager = confManager;
        const authHandler = getPersonalAccessTokenHandler(
            confManager._configuration.token,
        );
        this.connection = new WebApi(
            confManager._configuration.organizationUrl,
            authHandler,
        );
    }

    get gitClient(): IGitApi {
        if (this._gitClient) return this._gitClient;

        throw new Error('Activate not called');
    }

    async activate(): Promise<void> {
        this._gitClient = await this.connection.getGitApi();
    }

    get configuration(): Configuration {
        return this.configurationManager._configuration;
    }

    async loadPullRequest(branchName: string): Promise<GitPullRequest> {
        const prs = await this.gitClient.getPullRequestsByProject(
            this.configuration.projectName,
            { sourceRefName: `refs/heads/${branchName}` },
        );
        return prs?.[0] ?? null;
    }

    async loadThreads(
        pullRequestId: number,
    ): Promise<GitPullRequestCommentThread[]> {
        return await this.gitClient.getThreads(
            this.configuration.repositoryName,
            pullRequestId,
            this.configuration.projectName,
        );
    }

    async createThread(
        pullRequestId: number,
        content: string,
    ): Promise<GitPullRequestCommentThread> {
        return await this.gitClient.createThread(
            {
                comments: [this._createComment(content)],
                status: CommentThreadStatus.Active,
            },
            this.configuration.repositoryName,
            pullRequestId,
            this.configuration.projectName,
        );
    }

    async comment(
        content: string,
        pullRequestId: number,
        threadId: number,
        parentCommentId: number | null = null,
    ): Promise<Comment> {
        return await this.gitClient.createComment(
            this._createComment(content, parentCommentId),
            this.configuration.repositoryName,
            pullRequestId,
            threadId,
            this.configuration.projectName,
        );
    }

    private _createComment(
        content: string,
        parentCommentId: number | null = null,
    ): Comment {
        return {
            author: {},
            commentType: CommentType.Text,
            content,
            parentCommentId: parentCommentId ?? undefined,
        };
    }
}

class MockClient implements AzureClient {
    async activate(): Promise<void> {}

    async loadPullRequest(branchName: string): Promise<GitPullRequest | null> {
        return (await import('./mocks')).PR;
    }

    async loadThreads(
        pullRequestId: number,
    ): Promise<GitPullRequestCommentThread[]> {
        return (await import('./mocks')).THREADS;
    }

    async comment(
        content: string,
        pullRequestId: number,
        threadId: number,
        parentCommentId: number | null,
    ): Promise<Comment> {
        return {} as Comment;
    }

    async createThread(
        pullRequestId: number,
        content: string,
    ): Promise<GitPullRequestCommentThread> {
        return {} as GitPullRequestCommentThread;
    }
}

export function getClient(cm: ConfigurationManager): AzureClient {
    if (USE_MOCKS) {
        return new MockClient();
    } else {
        return new AzureRealClient(cm);
    }
}
