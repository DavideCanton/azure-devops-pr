import * as vsc from 'vscode';
import { ExtensionController } from './controller';
import { CONFIG } from './config';
import { getClient } from './client';
import { GitUtils } from './git-utils';

const extensionController = new ExtensionController(
    CONFIG,
    getClient(),
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
