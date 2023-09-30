import * as vsc from 'vscode';
import { ExtensionController } from './controller';
import { ConfigurationManager } from './config';
import { getClient } from './client';
import { GitUtils } from './git-utils';

const configurationManager = new ConfigurationManager();

const extensionController = new ExtensionController(
    configurationManager,
    getClient(configurationManager),
    new GitUtils(),
);

export function activate(context: vsc.ExtensionContext) {
    extensionController.activate(context);
}

export function deactivate() {
    extensionController.deactivate();
}

// TODO reset comments when switching branch (how?)
// filter out unused threads (by status?)
