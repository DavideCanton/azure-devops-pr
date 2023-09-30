import * as azdev from 'azure-devops-node-api';
import { IGitApi } from 'azure-devops-node-api/GitApi';
import {
    Comment,
    CommentThreadStatus,
    CommentType,
    GitPullRequest,
    GitPullRequestCommentThread,
} from 'azure-devops-node-api/interfaces/GitInterfaces';
import { IRequestHandler } from 'azure-devops-node-api/interfaces/common/VsoBaseInterfaces';
import { Configuration, ConfigurationManager } from './config';

export interface AzureClient {
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
    authHandler: IRequestHandler;
    connection: azdev.WebApi;
    gitClient: IGitApi | undefined;
    configurationManager: ConfigurationManager;

    constructor(confManager: ConfigurationManager) {
        this.configurationManager = confManager;
        this.authHandler = azdev.getPersonalAccessTokenHandler(
            confManager.configuration.token,
        );
        this.connection = new azdev.WebApi(
            confManager.configuration.organizationUrl,
            this.authHandler,
        );
    }

    get configuration(): Configuration {
        return this.configurationManager.configuration;
    }

    async loadPullRequest(branchName: string): Promise<GitPullRequest> {
        await this.loadClient();

        const prs = await this.gitClient!.getPullRequestsByProject(
            this.configuration.projectName,
            { sourceRefName: `refs/heads/${branchName}` },
        );
        return prs?.[0] ?? null;
    }

    async loadThreads(
        pullRequestId: number,
    ): Promise<GitPullRequestCommentThread[]> {
        await this.loadClient();

        return await this.gitClient!.getThreads(
            this.configuration.repositoryName,
            pullRequestId,
            this.configuration.projectName,
        );
    }

    async createThread(
        pullRequestId: number,
        content: string,
    ): Promise<GitPullRequestCommentThread> {
        await this.loadClient();

        return await this.gitClient!.createThread(
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
        await this.loadClient();

        return await this.gitClient!.createComment(
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

    private async loadClient() {
        if (!this.gitClient) {
            this.gitClient = await this.connection.getGitApi();
        }
    }
}

class MockClient implements AzureClient {
    static get canLoad(): boolean {
        try {
            const debug = ['1', 'T', 'true'].includes(process.env.ext_debug!);
            if (!debug) return false;
            import('./mocks/pr.mock');
            return true;
        } catch {
            return false;
        }
    }

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
    if (MockClient.canLoad) {
        return new MockClient();
    } else {
        return new AzureRealClient(cm);
    }
}
