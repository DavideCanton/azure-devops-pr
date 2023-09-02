import * as vscode from "vscode";
import { API } from "../typings/git";

export enum Status
{
    Available,
    Disabled,
    Unavailable,
    NotAGitRepo,
}

/**
 * Utility class for retrieving information about the repository.
 */
export class GitUtils
{
    private api: API | null = null;
    private _status: Status;

    get status(): Status
    {
        return this._status;
    }

    /**
     * Returns the name of the current branch, or `null` if it cannot be returned.
     */
    @loadApi
    getCurrentBranch(): string | null {
        const repository = this.api!.repositories[0];
        const currentBranch = repository.state.HEAD;
        return currentBranch?.name ?? null;
    }

    @loadApi
    async getCurrentUsername(): Promise<string | null> {
        try {
            return await this.api!.repositories[0].getConfig('user.name');
        } catch (e) {
            return null;
        }
    }

    /**
     * Returns the path of the root of the repository, or `null` if it cannot be returned.
     *
     * Note that it could not be the same as the workspace root.
     */
    @loadApi
    getRepoRoot(): string | null {
        const repository = this.api!.repositories[0];
        return repository.rootUri.fsPath;
    }

    /**
     * Ensures that `this.api` is filled.
     */
    private loadExtensionAPI(): Status
    {
        const extension = vscode.extensions.getExtension("vscode.git");

        if (!extension)
            return Status.Unavailable;
        else if (!extension.isActive)
            return Status.Disabled;
        else
        {
            this.api = extension.exports.getAPI(1);
            if (this.getCurrentBranch() === null)
                return Status.NotAGitRepo;
            else
                return Status.Available;
        }
    }
}

function loadApi(originalMethod: any, context: ClassMethodDecoratorContext) {
    function replacement(this: any, ...args: any[]) {
        if (!this.api) {
            this._status = this.loadExtensionAPI();
            if (!this.api) return null;
        }
        return originalMethod.apply(this, args);
    }

    return replacement;
}
