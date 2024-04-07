import * as gi from 'azure-devops-node-api/interfaces/GitInterfaces';
import * as path from 'node:path';
import * as vs from 'vscode';

export function buildUri(...parts: string[]): string {
    return parts.map(s => s.replace(/^\/?(.+?)\/?$/, '$1')).join('/');
}

export function toPosition(cp: gi.CommentPosition): vs.Position {
    return new vs.Position(cp.line! - 1, cp.offset! - 1);
}

export function toUri(filePath: string, repoRoot: string): vs.Uri {
    return vs.Uri.file(path.join(repoRoot, filePath.replace(/^\//, '')));
}
