import { GitPullRequest, GitPullRequestCommentThread } from "azure-devops-node-api/interfaces/GitInterfaces";
import * as azdev from "azure-devops-node-api";
import * as vscode from "vscode";
import { IRequestHandler } from "azure-devops-node-api/interfaces/common/VsoBaseInterfaces";
import { IGitApi } from "azure-devops-node-api/GitApi";
import { WorkspaceConfiguration, workspace } from "vscode";
import { EXT_ID } from "./constants";
import { Settings } from "./types";

export interface AzureClient {
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

class RealClient implements AzureClient {
    orgUrl: string;
    authHandler: IRequestHandler;
    connection: azdev.WebApi;
    gitClient: IGitApi | undefined;
    repository: string;
    project: string;

    constructor(conf: Settings) {
        this.project = this.require(conf, "project-name");
        this.repository = this.require(conf, "repository-name");

        const azureUrl = this.require(conf, "azure-url").replace(/\/$/, "");
        const orgName = this.require(conf, "organization-name").replace(/^\//, "");
        this.orgUrl = `${azureUrl}/${orgName}`;

        this.authHandler = azdev.getPersonalAccessTokenHandler(this.require(conf, "token"));
        this.connection = new azdev.WebApi(this.orgUrl, this.authHandler);
    }

    async loadPullRequest(branchName: string): Promise<GitPullRequest> {
        await this.loadClient();

        const prs = await this.gitClient!.getPullRequestsByProject(
            this.project, { sourceRefName: `refs/heads/${branchName}` }
        );
        return prs?.[0] ?? null;
    }

    async loadThreads(pullRequestId: number): Promise<GitPullRequestCommentThread[]> {
        await this.loadClient();

        return await this.gitClient!.getThreads(
            this.repository,
            pullRequestId,
            this.project
        );
    }

    private async loadClient() {
        if (!this.gitClient) {
            this.gitClient = await this.connection.getGitApi();
        }
    }

    private require(v: object, n: string): string {
        const s = (v as any)[n];
        if (!s) {
            vscode.window.showErrorMessage(`Missing property ${EXT_ID}."${n}" in configuration.`);
            throw Error(`Missing ${n}`);
        }
        return s;
    }
}

export function getClient(): AzureClient {
    // return new MockClient();

    const conf = getConfiguration();
    return new RealClient(conf);
}

export function getConfiguration(): Settings {
    return workspace.getConfiguration(EXT_ID) as WorkspaceConfiguration & Settings;
}

