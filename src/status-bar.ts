import * as vsc from 'vscode';
import { Commands } from './constants';
import { GitPullRequest } from 'azure-devops-node-api/interfaces/GitInterfaces';

export class StatusBarHandler {
    statusBarItem: vsc.StatusBarItem;

    constructor() {
        this.statusBarItem = vsc.window.createStatusBarItem(
            vsc.StatusBarAlignment.Left,
        );
    }

    displayLoading() {
        this.statusBarItem.text = `$(loading~spin) Loading PR...`;
        this.statusBarItem.command = undefined;
        this.statusBarItem.show();
    }

    displayPR(pr: GitPullRequest | null) {
        const prId = pr?.pullRequestId ?? null;
        if (prId !== null) {
            const icon = pr!.isDraft
                ? 'git-pull-request-draft'
                : 'git-pull-request';
            this.statusBarItem.text = `$(${icon}) ${prId}`;
            this.statusBarItem.command = Commands.OPEN_PR_CMD;
            this.statusBarItem.show();
        } else {
            this.statusBarItem.hide();
        }
    }
}
