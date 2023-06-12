import { WorkspaceConfiguration, workspace } from "vscode";
import { EXT_ID } from "./constants";
import { buildUri } from "./utils";

/**
 * Settings object.
 */
interface Settings
{
    /** The name of the organization. */
    "organization-name": string;
    /** The name of the project. */
    "project-name": string;
    /** The name of the repository. */
    "repository-name": string;
    /** The address of azure. Defaults to `https://dev.azure.com/`. */
    "azure-origin": string;
    /** The token used to access azure. Should have the role to read PR. */
    "token": string;
}

export class Configuration
{
    private constructor(
        /** The name of the organization. */
        public readonly organizationName: string,
        /** The name of the project. */
        public readonly projectName: string,
        /** The name of the repository. */
        public readonly repositoryName: string,
        /** The address of azure. Defaults to `https://dev.azure.com/`. */
        public readonly azureOrigin: string,
        /** The token used to access azure. Should have the role to read PR. */
        public readonly token: string,
    ) { }

    get organizationUrl(): string
    {
        return buildUri(this.azureOrigin, this.organizationName);
    }

    buildPullRequestId(pullRequestId: number): string
    {
        return buildUri(
            this.organizationUrl,
            this.projectName,
            "_git",
            this.repositoryName,
            "pullrequest",
            pullRequestId.toString()
        );
    }

    static fromSettings(settings: Settings): Configuration
    {
        return new Configuration(
            Configuration.require(settings, 'organization-name'),
            Configuration.require(settings, 'project-name'),
            Configuration.require(settings, 'repository-name'),
            Configuration.require(settings, 'azure-origin'),
            Configuration.require(settings, 'token')
        );
    }


    private static require(settings: Settings, name: keyof Settings): string
    {
        const value = settings[name];
        if(value)
            return value;
        else
            throw Error(`Missing property ${EXT_ID}."${name}" in configuration.`);
    }
}

/** Returns the configuration. */
export function getConfiguration(): Configuration
{
    return Configuration.fromSettings(workspace.getConfiguration(EXT_ID) as WorkspaceConfiguration & Settings);
}

export const CONFIG = getConfiguration();