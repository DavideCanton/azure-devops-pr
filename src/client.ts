import { GitPullRequest, GitPullRequestCommentThread } from "azure-devops-node-api/interfaces/GitInterfaces";
import * as azdev from "azure-devops-node-api";
import * as vscode from "vscode";
import { IRequestHandler } from "azure-devops-node-api/interfaces/common/VsoBaseInterfaces";
import { IGitApi } from "azure-devops-node-api/GitApi";
import { EXT_ID } from "./constants";
import { CONFIG, Configuration, getConfiguration } from "./config";

export interface AzureClient
{
    loadPullRequest(branchName: string): Promise<GitPullRequest | null>;
    loadThreads(pullRequestId: number): Promise<GitPullRequestCommentThread[]>;
}


class AzureRealClient implements AzureClient
{
    authHandler: IRequestHandler;
    connection: azdev.WebApi;
    gitClient: IGitApi | undefined;
    configuration: Configuration;

    constructor(conf: Configuration)
    {
        this.configuration = conf;
        this.authHandler = azdev.getPersonalAccessTokenHandler(conf.token);
        this.connection = new azdev.WebApi(conf.organizationUrl, this.authHandler);
    }

    async loadPullRequest(branchName: string): Promise<GitPullRequest>
    {
        await this.loadClient();

        const prs = await this.gitClient!.getPullRequestsByProject(
            this.configuration.projectName, { sourceRefName: `refs/heads/${branchName}` }
        );
        return prs?.[0] ?? null;
    }

    async loadThreads(pullRequestId: number): Promise<GitPullRequestCommentThread[]>
    {
        await this.loadClient();

        return await this.gitClient!.getThreads(
            this.configuration.repositoryName,
            pullRequestId,
            this.configuration.projectName
        );
    }

    private async loadClient()
    {
        if(!this.gitClient)
        {
            this.gitClient = await this.connection.getGitApi();
        }
    }
}

export function getClient(): AzureClient
{
    return new AzureRealClient(CONFIG);
}
