import * as azdev from "azure-devops-node-api";
import { IGitApi } from "azure-devops-node-api/GitApi";
import { GitPullRequest, GitPullRequestCommentThread } from "azure-devops-node-api/interfaces/GitInterfaces";
import { IRequestHandler } from "azure-devops-node-api/interfaces/common/VsoBaseInterfaces";
import { CONFIG, Configuration } from "./config";

export interface AzureClient {
    loadPullRequest(branchName: string): Promise<GitPullRequest | null>;
    loadThreads(pullRequestId: number): Promise<GitPullRequestCommentThread[]>;
}


class AzureRealClient implements AzureClient {
    authHandler: IRequestHandler;
    connection: azdev.WebApi;
    gitClient: IGitApi | undefined;
    configuration: Configuration;

    constructor(conf: Configuration) {
        this.configuration = conf;
        this.authHandler = azdev.getPersonalAccessTokenHandler(conf.token);
        this.connection = new azdev.WebApi(conf.organizationUrl, this.authHandler);
    }

    async loadPullRequest(branchName: string): Promise<GitPullRequest> {
        await this.loadClient();

        const prs = await this.gitClient!.getPullRequestsByProject(
            this.configuration.projectName, { sourceRefName: `refs/heads/${branchName}` }
        );
        return prs?.[0] ?? null;
    }

    async loadThreads(pullRequestId: number): Promise<GitPullRequestCommentThread[]> {
        await this.loadClient();

        return await this.gitClient!.getThreads(
            this.configuration.repositoryName,
            pullRequestId,
            this.configuration.projectName
        );
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
            const debug = ["1", "T", "true"].includes(process.env.ext_debug!);
            if (!debug)
                return false;
            import('./mocks/pr.mock');
            return true;
        } catch {
            return false;
        }
    }

    loadPullRequest(branchName: string): Promise<GitPullRequest | null> {
        return import('./mocks/pr.mock').then(m => m.default);
    }

    loadThreads(pullRequestId: number): Promise<GitPullRequestCommentThread[]> {
        return import('./mocks/threads.mock').then(m => m.default);
    }
}


export function getClient(): AzureClient {
    if (MockClient.canLoad)
        return new MockClient();
    else
        return new AzureRealClient(CONFIG);
}
