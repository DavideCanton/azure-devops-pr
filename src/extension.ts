import * as vsc from 'vscode';
import { ConfigurationManager } from './config';
import { ExtensionController } from './controller';
import { createBranchChangeDetector, createGitInterface } from './git-utils';
import { log } from './logs';
import { createCommentHandler } from './comment-handler';

const configurationManager = new ConfigurationManager();
let extensionController: ExtensionController;

export async function activate(context: vsc.ExtensionContext) {
    if (DEV_MODE) {
        log('Activated dev mode');
    }
    extensionController = await ExtensionController.create(
        context,
        createGitInterface,
        createBranchChangeDetector,
        createCommentHandler,
        configurationManager,
    );
}

export function deactivate() {
    extensionController.deactivate();
}
