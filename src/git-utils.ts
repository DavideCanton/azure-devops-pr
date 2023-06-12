import * as vscode from "vscode";

/**
 * Utility class for retrieving information about the repository.
 */
export class GitUtils
{
    api: any | null = null;

    /**
     * Returns the name of the current branch, or `null` if it cannot be returned.
     */
    getCurrentBranch(): string | null
    {
        this.loadExtensionAPI();
        try
        {
            const repository = this.api.repositories[0];
            const currentBranch = repository.state.HEAD;
            return currentBranch.name;
        } catch(e)
        {
            return null;
        }
    }

    /**
     * Returns the path of the root of the repository, or `null` if it cannot be returned.
     * 
     * Note that it could not be the same as the workspace root.
     */
    getRepoRoot(): string | null
    {
        this.loadExtensionAPI();
        try
        {
            const repository = this.api.repositories[0];
            return repository.rootUri.fsPath;
        } catch(e)
        {
            return null;
        }
    }

    /**
     * Ensures that `this.api` is filled.
     */
    private loadExtensionAPI(): any
    {
        if(!this.api)
        {
            const extension = vscode.extensions.getExtension("vscode.git");

            if(!extension)
                vscode.window.showWarningMessage("Git Extension not available!");
            else if(!extension.isActive)
                vscode.window.showWarningMessage("Git Extension not active!");
            else
                this.api = extension.exports.getAPI(1);
        }
    }
}