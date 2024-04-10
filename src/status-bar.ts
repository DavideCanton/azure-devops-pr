import * as vsc from 'vscode';
import * as C from './constants';

export class StatusBarHandler {
    statusBarItem: vsc.StatusBarItem;

    constructor() {
        this.statusBarItem = vsc.window.createStatusBarItem(
            vsc.StatusBarAlignment.Left,
        );
    }

    displayPR(prId: number | null = null) {
        if (prId !== null) {
            this.statusBarItem.text = `$(git-pull-request) ${prId}`;
            this.statusBarItem.command = C.OPEN_PR_CMD;
            this.statusBarItem.show();
        } else {
            this.statusBarItem.hide();
        }
    }
}
