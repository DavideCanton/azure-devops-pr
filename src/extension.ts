import * as vsc from 'vscode';
import { ConfigurationManager } from './config';
import { ExtensionController } from './controller';
import { createGitInterface } from './git-utils';
import { log } from './logs';

const configurationManager = new ConfigurationManager();
let extensionController: ExtensionController;

export async function activate(context: vsc.ExtensionContext) {
    if (DEV_MODE) {
        log('Activated dev mode');
    }
    extensionController = await ExtensionController.create(
        context,
        createGitInterface,
        configurationManager,
    );
}

export function deactivate() {
    extensionController.deactivate();
}
