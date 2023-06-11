import * as vscode from "vscode";

export function getCurrentBranch(): string | null {
    const extension = vscode.extensions.getExtension("vscode.git");

    if (!extension) {
        console.warn("Git extension not available");
        return null;
    }

    if (!extension.isActive) {
        console.warn("Git extension not active");
        return null;
    }

    try {
        const git = extension.exports.getAPI(1);
        const repository = git.repositories[0];
        const currentBranch = repository.state.HEAD;
        return currentBranch.name;
    } catch (e) {
        return null;
    }
}
