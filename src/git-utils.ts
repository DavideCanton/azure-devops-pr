import * as vscode from "vscode";

export class GitUtils
{
    api: any | null = null;

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