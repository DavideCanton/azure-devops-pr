import * as vsc from 'vscode';
import { ExtensionController } from './controller';
import { ConfigurationManager } from './config';
import { getClient } from './client';
import { GitHandler } from './git-utils';

const configurationManager = new ConfigurationManager();

const extensionController = new ExtensionController(
    new GitHandler(),
    configurationManager,
    getClient(configurationManager),
);

export async function activate(context: vsc.ExtensionContext) {
    await extensionController.activate(context);
}

export function deactivate() {
    extensionController.deactivate();
}

// TODO reset comments when switching branch (how?)
// filter out unused threads (by status?)
