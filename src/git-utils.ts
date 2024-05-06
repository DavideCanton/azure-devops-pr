import debounce from 'lodash-es/debounce';
import { spawn } from 'node:child_process';
import { lstat } from 'node:fs/promises';
import * as vs from 'vscode';
import { log } from './logs';

export interface GitInterface {
    readonly repositoryRoot: string;

    getCurrentBranch(): Promise<string | null>;
}

export function createGitInterface(folder: string): Promise<GitInterface> {
    return GitInterfaceImpl.load(folder);
}

export type GitInterfaceFactory = typeof createGitInterface;

/**
 * Utility class for retrieving information about the repository.
 */
class GitInterfaceImpl implements GitInterface {
    private _repositoryRoot: string;

    private constructor() {}

    /**
     * The root directory of the Git repository.
     * @readonly
     */
    public get repositoryRoot(): string {
        return this._repositoryRoot;
    }

    /**
     * Sets the root directory of the Git repository.
     * @internal
     */
    private set repositoryRoot(value: string) {
        this._repositoryRoot = value;
    }

    /**
     * Loads the Git repository information.
     *
     * @param folder The path of the root folder of the Git repository.
     * @returns A promise that resolves to the `GitInterfaceImpl` instance.
     * @throws {Error} If the specified folder is not a Git repository.
     */
    static async load(folder: string): Promise<GitInterfaceImpl> {
        const handler = new GitInterfaceImpl();

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

    /**
     * Gets the current branch name.
     *
     * @returns A promise that resolves to the branch name or null if the repository is in a detached HEAD state.
     */
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

    /**
     * Runs a git command and returns its output as a string.
     *
     * @param command The git command to run.
     * @param args The arguments to pass to the command.
     * @param cwd The directory to run the command in. If not specified, the repository root is used.
     * @returns A promise that resolves to the output of the command. If the command fails, the promise is rejected
     * with the error message.
     */
    private async _runGitCommand(
        command: string,
        args: string[],
        cwd: string = this.repositoryRoot,
    ): Promise<string> {
        log(`Running git command: ${command} ${args.join(' ')}`);

        const res = spawn('git', [command, ...args], { cwd });

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

/**
 * An interface for detecting changes in the current branch.
 */
export interface BranchChangeDetector extends vs.Disposable {
    /**
     * An event that is fired when the current branch changes. The event is fired with the new branch (or `null`
     * if no branch is active).
     */
    readonly branchChanged: vs.Event<string | null>;

    /**
     * Starts detecting changes in the current branch. The promise is resolved when the detection is
     * activated.
     */
    activateDetection(): Promise<void>;
}

/**
 * A function that creates a {@link BranchChangeDetector}.
 */
export type BranchChangeDetectorFactory = typeof createBranchChangeDetector;

/**
 * A class that detects changes in the current branch using the file system watcher.
 */
class FsWatcherBranchChangeDetectorImpl
    implements BranchChangeDetector, vs.Disposable {
    /**
     * {@inheritdoc BranchChangeDetector.branchChanged}
     */
    readonly branchChanged: vs.Event<string | null>;

    private fsWatcher: vs.FileSystemWatcher | null = null;

    private branchChangedEmitter: vs.EventEmitter<string | null>;

    /**
     * Creates a new instance of {@link FsWatcherBranchChangeDetectorImpl}.
     *
     * @param git The Git interface to use for getting the current branch.
     */
    constructor(private git: GitInterface) {
        this.branchChangedEmitter = new vs.EventEmitter();
        this.branchChanged = this.branchChangedEmitter.event;
    }

    /**
     * {@inheritdoc BranchChangeDetector.activateDetection}
     */
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

    /**
     * {@inheritdoc vs.Disposable.dispose}
     */
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

/**
 * Creates a new {@link BranchChangeDetector} that uses the file system watcher to detect changes in the
 * current branch.
 *
 * @param git The Git interface to use for getting the current branch.
 * @returns A new {@link BranchChangeDetector}.
 */
export function createBranchChangeDetector(
    git: GitInterface,
): BranchChangeDetector {
    return new FsWatcherBranchChangeDetectorImpl(git);
}

