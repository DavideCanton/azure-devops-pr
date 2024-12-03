import { GitPullRequest } from 'azure-devops-node-api/interfaces/GitInterfaces';
import * as vsc from 'vscode';
import { Commands } from './constants';

export interface IStatusBarHandler {
    displayLoading(): void;
    clear(): void;
    displayPullRequest(pullRequest: GitPullRequest | null): void;
}

export class StatusBarHandler implements IStatusBarHandler {
    private statusBarItem: vsc.StatusBarItem;

    constructor() {
        this.statusBarItem = vsc.window.createStatusBarItem(
            vsc.StatusBarAlignment.Left,
        );
    }

    displayLoading(): void {
        this.statusBarItem.text = `$(loading~spin) Loading pull request...`;
        this.statusBarItem.command = undefined;
        this.statusBarItem.show();
    }

    clear(): void {
        this.statusBarItem.hide();
    }

    displayPullRequest(pullRequest: GitPullRequest | null): void {
        const prId = pullRequest?.pullRequestId ?? null;
        if (prId !== null) {
            const icon = pullRequest!.isDraft
                ? 'git-pull-request-draft'
                : 'git-pull-request';
            this.statusBarItem.text = `$(${icon}) ${prId}`;
            this.statusBarItem.command = Commands.OPEN_PR_CMD;
            this.statusBarItem.show();
        } else {
            this.clear();
        }
    }
}
