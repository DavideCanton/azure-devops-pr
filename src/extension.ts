import * as vsc from 'vscode';
import { ExtensionController } from './controller';
import { CONFIG } from './config';
import { getClient } from './client';
import { GitUtils } from './git-utils';

import { spawnSync } from 'child_process';
import { log } from './logs';

const extensionController = new ExtensionController(
    CONFIG,
    getClient(),
    new GitUtils(),
);

export function activate(context: vsc.ExtensionContext) {
    extensionController.activate(context);

    const res = spawnSync('git', ['rev-parse', '--show-toplevel'], {
        encoding: 'utf-8',
        cwd: vsc.workspace.workspaceFolders![0].uri.fsPath,
    });
    const repo = res.stdout.trim();
    const fs = vsc.workspace.createFileSystemWatcher(
        new vsc.RelativePattern(vsc.Uri.file(repo + '/.git/'), 'HEAD'),
    );
    fs.onDidCreate(uri => log(uri));
    fs.onDidChange(uri => log(uri));
    fs.onDidDelete(uri => log(uri));

    context.subscriptions.push(fs);
}

export function deactivate() {
    extensionController.deactivate();
}

// TODO reset comments when switching branch (how?)
// filter out unused threads (by status?)
