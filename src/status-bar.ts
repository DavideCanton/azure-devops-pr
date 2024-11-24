import * as vsc from 'vscode';
import * as C from './constants';
import { GitPullRequest } from 'azure-devops-node-api/interfaces/GitInterfaces';

export class StatusBarHandler {
    statusBarItem: vsc.StatusBarItem;

    constructor() {
        this.statusBarItem = vsc.window.createStatusBarItem(
            vsc.StatusBarAlignment.Left,
        );
    }

    displayPR(pr: GitPullRequest) {
        const prId = pr.pullRequestId;
        if (prId !== null) {
            const icon = pr.isDraft
                ? 'git-pull-request-draft'
                : 'git-pull-request';
            this.statusBarItem.text = `$(${icon}) ${prId}`;
            this.statusBarItem.command = C.OPEN_PR_CMD;
            this.statusBarItem.show();
        } else {
            this.statusBarItem.hide();
        }
    }
}
