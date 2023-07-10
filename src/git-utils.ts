import * as vscode from 'vscode';
import { API } from '../typings/git';

/**
 * Utility class for retrieving information about the repository.
 */
export class GitUtils {
    private api: API = null as any;

    /**
     * Returns the name of the current branch, or `null` if it cannot be returned.
     */
    @loadApi
    getCurrentBranch(): string | null {
        const repository = this.api.repositories[0];
        const currentBranch = repository.state.HEAD;
        return currentBranch?.name ?? null;
    }

    @loadApi
    async getCurrentUsername(): Promise<string | null> {
        try {
            return await this.api.repositories[0].getConfig('user.name');
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
        const repository = this.api.repositories[0];
        return repository.rootUri.fsPath;
    }

    /**
     * Ensures that `this.api` is filled.
     */
    private loadExtensionAPI(): API | null {
        if (!this.api) {
            const extension = vscode.extensions.getExtension('vscode.git');

            if (!extension) {
                vscode.window.showWarningMessage(
                    'Git Extension not available!',
                );
            } else if (!extension.isActive) {
                vscode.window.showWarningMessage('Git Extension not active!');
            } else {
                this.api = extension.exports.getAPI(1);
            }
        }
        return this.api;
    }
}

function loadApi(originalMethod: any, context: ClassMethodDecoratorContext) {
    function replacement(this: any, ...args: any[]) {
        if (!this.api) {
            this.loadExtensionAPI();
            if (!this.api) return null;
        }
        return originalMethod.apply(this, args);
    }

    return replacement;
}
