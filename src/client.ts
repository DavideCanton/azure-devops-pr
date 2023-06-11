import { GitPullRequest, GitPullRequestCommentThread } from "azure-devops-node-api/interfaces/GitInterfaces";
import * as azdev from "azure-devops-node-api";
import { IRequestHandler } from "azure-devops-node-api/interfaces/common/VsoBaseInterfaces";
import { IGitApi } from "azure-devops-node-api/GitApi";
import { WorkspaceConfiguration, workspace } from "vscode";
import { DEV_AZURE_URI, EXT_ID } from "./constants";
import { Settings } from "./types";

export interface AzureClient
{
    loadPullRequest(branchName: string): Promise<GitPullRequest | null>;
    loadThreads(pullRequestId: number): Promise<GitPullRequestCommentThread[]>;
}

// class MockClient implements AzureClient
// {
//     loadPullRequest(branchName: string): Promise<GitPullRequest | null>
//     {
//         return import("./mocks/pr.json") as any as Promise<GitPullRequest>;
//     }
//     loadThreads(): Promise<GitPullRequestCommentThread[]>
//     {
//         return import("./mocks/threads.json") as any as Promise<
//             GitPullRequestCommentThread[]
//         >;
//     }
// }

class RealClient implements AzureClient
{
    orgUrl: string;
    authHandler: IRequestHandler;
    connection: azdev.WebApi;
    gitClient: IGitApi | undefined;
    repository: string;
    project: string;

    constructor(conf: Settings)
    {
        this.project = conf["project-name"];
        this.repository = conf["repository-name"];
        this.orgUrl = DEV_AZURE_URI + conf["organization-name"];
        this.authHandler = azdev.getPersonalAccessTokenHandler(conf.token);
        this.connection = new azdev.WebApi(this.orgUrl, this.authHandler);
    }

    async loadPullRequest(branchName: string): Promise<GitPullRequest>
    {
        await this.loadClient();

        const prs = await this.gitClient!.getPullRequestsByProject(
            this.project, { sourceRefName: `refs/heads/${branchName}` }
        );
        return prs?.[0] ?? null;
    }

    async loadThreads(pullRequestId: number): Promise<GitPullRequestCommentThread[]>
    {
        await this.loadClient();

        return await this.gitClient!.getThreads(
            this.repository,
            pullRequestId,
            this.project
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
    // return new MockClient();

    const conf = workspace.getConfiguration(EXT_ID) as WorkspaceConfiguration & Settings;
    return new RealClient(conf);
}
