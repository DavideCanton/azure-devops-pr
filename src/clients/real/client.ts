import * as nodeApi from 'azure-devops-node-api';
import * as gitApi from 'azure-devops-node-api/GitApi';
import * as gi from 'azure-devops-node-api/interfaces/GitInterfaces';
import { Identity } from 'azure-devops-node-api/interfaces/IdentitiesInterfaces';
import { IAzureClient } from '..';
import { Configuration, ConfigurationManager } from '../../config';

export class AzureRealClient implements IAzureClient {
    connection: nodeApi.WebApi;
    configurationManager: ConfigurationManager;
    _gitClient: gitApi.IGitApi | null = null;
    _user: Identity | null = null;

    constructor(confManager: ConfigurationManager) {
        this.configurationManager = confManager;
    }

    get user(): Identity {
        if (!this._user) {
            throw Error('User not authenticated');
        }
        return this._user;
    }

    get gitClient(): gitApi.IGitApi {
        if (this._gitClient) {
            return this._gitClient;
        }

        throw new Error('Activate not called');
    }

    async activate(): Promise<void> {
        const authHandler = nodeApi.getPersonalAccessTokenHandler(
            this.configurationManager.configuration.token,
        );
        this.connection = new nodeApi.WebApi(
            this.configurationManager.configuration.organizationUrl,
            authHandler,
        );

        this._gitClient = await this.connection.getGitApi();
        this._user =
            (await this.connection.connect()).authenticatedUser ?? null;
    }

    get configuration(): Configuration {
        return this.configurationManager._configuration;
    }

    async loadPullRequest(branchName: string): Promise<gi.GitPullRequest> {
        const prs = await this.gitClient.getPullRequestsByProject(
            this.configuration.projectName,
            { sourceRefName: `refs/heads/${branchName}` },
        );
        return prs?.[0] ?? null;
    }

    async loadThreads(
        pullRequestId: number,
    ): Promise<gi.GitPullRequestCommentThread[]> {
        return await this.gitClient.getThreads(
            this.configuration.repositoryName,
            pullRequestId,
            this.configuration.projectName,
        );
    }

    async createThread(
        pullRequestId: number,
        content: string,
        threadContext?: gi.CommentThreadContext,
    ): Promise<gi.GitPullRequestCommentThread> {
        return await this.gitClient.createThread(
            {
                comments: [this._createComment(content)],
                status: gi.CommentThreadStatus.Active,
                threadContext,
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
    ): Promise<gi.Comment> {
        return await this.gitClient.createComment(
            this._createComment(content, parentCommentId),
            this.configuration.repositoryName,
            pullRequestId,
            threadId,
            this.configuration.projectName,
        );
    }

    async updateThread(
        pullRequestId: number,
        threadId: number,
        thread: gi.GitPullRequestCommentThread,
    ): Promise<gi.GitPullRequestCommentThread> {
        return await this.gitClient.updateThread(
            thread,
            this.configuration.repositoryName,
            pullRequestId,
            threadId,
            this.configuration.projectName,
        );
    }

    private _createComment(
        content: string,
        parentCommentId: number | null = null,
    ): gi.Comment {
        return {
            author: {
                id: this.user.id,
            },
            commentType: gi.CommentType.Text,
            content,
            parentCommentId: parentCommentId ?? undefined,
        };
    }
}
