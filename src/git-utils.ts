import debounce from 'lodash-es/debounce';
import { spawn } from 'node:child_process';
import { lstat } from 'node:fs/promises';
import * as vs from 'vscode';
import { log } from './logs';

export interface GitInterface {
    readonly repositoryRoot: string;

    getCurrentBranch(): Promise<string | null>;
}

export function createGitInterface(
    folder: string | null,
): Promise<GitInterface> {
    return GitInterfaceImpl.load(folder);
}

export type GitInterfaceFactory = typeof createGitInterface;

/**
 * Utility class for retrieving information about the repository.
 */
class GitInterfaceImpl implements GitInterface {
    private _repositoryRoot: string;

    private constructor() {}

    public get repositoryRoot(): string {
        return this._repositoryRoot;
    }

    private set repositoryRoot(value: string) {
        this._repositoryRoot = value;
    }

    static async load(folder: string | null): Promise<GitInterfaceImpl> {
        const handler = new GitInterfaceImpl();

        if (!folder) {
            throw new Error('No folder opened');
        }

        try {
            await lstat(folder);
        } catch (e) {
            if ((e as any).code === 'ENOENT') {
                throw new Error('Not a git repository');
            }
            throw e;
        }

        const res = await handler._runGitCommand(
            'rev-parse',
            ['--show-toplevel'],
            folder,
        );
        handler.repositoryRoot = res.trim();
        return handler;
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

    private async _runGitCommand(
        command: string,
        args: string[],
        cwd?: string,
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

export interface BranchChangeDetector extends vs.Disposable {
    readonly branchChanged: vs.Event<string | null>;
    activateDetection(): Promise<void>;
}

export function createBranchChangeDetector(
    git: GitInterface,
): BranchChangeDetector {
    return new FsWatcherBranchChangeDetectorImpl(git);
}

export type BranchChangeDetectorFactory = typeof createBranchChangeDetector;

class FsWatcherBranchChangeDetectorImpl
    implements BranchChangeDetector, vs.Disposable
{
    readonly branchChanged: vs.Event<string | null>;
    private fsWatcher: vs.FileSystemWatcher | null = null;

    private branchChangedEmitter: vs.EventEmitter<string | null>;

    constructor(private git: GitInterface) {
        this.branchChangedEmitter = new vs.EventEmitter();
        this.branchChanged = this.branchChangedEmitter.event;
    }

    async activateDetection(): Promise<void> {
        const repo = this.git.repositoryRoot;

        // TODO this does not work with worktrees
        this.fsWatcher = vs.workspace.createFileSystemWatcher(
            new vs.RelativePattern(vs.Uri.file(repo), '.git/HEAD'),
        );

        const branchChangeCallback = this.branchChangeCallbackFactory();

        this.fsWatcher.onDidCreate(branchChangeCallback);
        this.fsWatcher.onDidChange(branchChangeCallback);
        this.fsWatcher.onDidDelete(branchChangeCallback);
    }

    dispose() {
        this.fsWatcher?.dispose();
        this.branchChangedEmitter.dispose();
    }

    private branchChangeCallbackFactory() {
        return debounce(async () => {
            const currentBranch = await this.git.getCurrentBranch();
            this.branchChangedEmitter.fire(currentBranch);
        }, 1000);
    }
}
