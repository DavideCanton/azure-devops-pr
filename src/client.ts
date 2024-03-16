import * as azdev from 'azure-devops-node-api';
import { IGitApi } from 'azure-devops-node-api/GitApi';
import {
    Comment,
    CommentThreadStatus,
    CommentType,
    GitPullRequest,
    GitPullRequestCommentThread,
} from 'azure-devops-node-api/interfaces/GitInterfaces';
import { Configuration, ConfigurationManager } from './config';

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
    connection: azdev.WebApi;
    configurationManager: ConfigurationManager;
    _gitClient: IGitApi | null = null;

    constructor(confManager: ConfigurationManager) {
        this.configurationManager = confManager;
        const authHandler = azdev.getPersonalAccessTokenHandler(
            confManager._configuration.token,
        );
        this.connection = new azdev.WebApi(
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
        const m = await import('./mocks/pr.mock');
        return m.default;
    }

    async loadThreads(
        pullRequestId: number,
    ): Promise<GitPullRequestCommentThread[]> {
        const m = await import('./mocks/threads.mock');
        return m.default;
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
    let useMock;

    const debug = process.env.ext_debug;
    if (debug) {
        useMock = ['1', 'T', 'true'].includes(debug);
    } else {
        useMock = false;
    }

    if (useMock) {
        return new MockClient();
    } else {
        return new AzureRealClient(cm);
    }
}
