import { spawn } from 'node:child_process';
import * as vsc from 'vscode';
import { log } from './logs';
import { lstat } from 'node:fs/promises';

/**
 * Utility class for retrieving information about the repository.
 */
export class GitHandler {
    private _repositoryRoot: string;

    public get repositoryRoot(): string {
        return this._repositoryRoot;
    }

    async load(): Promise<boolean> {
        const workspaceFolders = vsc.workspace.workspaceFolders;

        if (workspaceFolders) {
            const rootPath = workspaceFolders[0].uri.fsPath;
            try {
                await lstat(rootPath);
            } catch (e) {
                if ((e as any).code === 'ENOENT') {
                    return false;
                }
                throw e;
            }

            const res = await this._runGitCommand(
                'rev-parse',
                ['--show-toplevel'],
                rootPath,
            );
            this._repositoryRoot = res.trim();
            return true;
        }

        return false;
    }

    async getCurrentBranch(): Promise<string | null> {
        try {
            return await this._runGitCommand('symbolic-ref', [
                '--short',
                'HEAD',
            ]);
        } catch (e) {
            return null;
        }
    }

    async _runGitCommand(
        command: string,
        args: string[],
        cwd: string | null = null,
    ): Promise<string> {
        log(`Running git command: ${command} ${args.join(' ')}`);

        const res = spawn('git', [command, ...args], {
            cwd: cwd ?? this.repositoryRoot,
        });

        return new Promise((resolve, reject) => {
            const out: Buffer[] = [];
            const err: Buffer[] = [];

            res.stdout.on('data', (chunk: Buffer) => {
                out.push(chunk);
            });

            res.stderr.on('data', (chunk: Buffer) => {
                err.push(chunk);
            });

            res.on('close', () => {
                if (out.length) {
                    resolve(Buffer.concat(out).toString('utf-8').trim());
                } else {
                    reject(Buffer.concat(err).toString('utf-8').trim());
                }
            });
        });
    }
}
