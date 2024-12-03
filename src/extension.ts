import * as vsc from 'vscode';
import { ConfigurationManager } from './config';
import { ExtensionController } from './controller';
import { StatusBarHandler } from './status-bar';
import { FsWatcherBranchChangeDetector, GitInterface } from './git-utils';
import { CommentHandler } from './comment-handler';
import { AzureRealClient } from './clients/real/client';

const configurationManager = new ConfigurationManager();
let extensionController: ExtensionController;

export async function activate(context: vsc.ExtensionContext) {
    const folder = vsc.workspace.workspaceFolders?.[0].uri.fsPath;
    if (!folder) {
        throw new Error('No folder opened');
    }

    const git = await GitInterface.load(folder);

    const statusBarHandler = new StatusBarHandler();
    const commentHandler = new CommentHandler();

    const branchDetector = new FsWatcherBranchChangeDetector(git);
    const client = new AzureRealClient(configurationManager);

    extensionController = new ExtensionController(
        git,
        branchDetector,
        commentHandler,
        statusBarHandler,
        configurationManager,
        client,
    );

    await extensionController.activate(context);
}

export function deactivate() {
    extensionController.deactivate();
}
