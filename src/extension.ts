import * as vsc from 'vscode';
import { ConfigurationManager } from './config';
import { ExtensionController } from './controller';
import { GitHandler } from './git-utils';
import { log } from './logs';

const configurationManager = new ConfigurationManager();

const extensionController = new ExtensionController(
    new GitHandler(),
    configurationManager,
);

export async function activate(context: vsc.ExtensionContext) {
    if (DEV_MODE) {
        log('Activated dev mode');
    }
    await extensionController.activate(context);
}

export function deactivate() {
    extensionController.deactivate();
}
