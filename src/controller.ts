import * as gi from 'azure-devops-node-api/interfaces/GitInterfaces';
import * as vsc from 'vscode';
import { AzureClient, getClient } from './clients';
import { CommentHandler, CommentHandlerFactory } from './comment-handler';
import { ConfigurationManager } from './config';
import { Commands } from './constants';
import {
    BranchChangeDetectorFactory,
    GitInterface,
    GitInterfaceFactory,
} from './git-utils';
import { log, logException } from './logs';
import { StatusBarHandler } from './status-bar';
import { toUri, toVsPosition } from './utils';

export class ExtensionController {
    private statusBarHandler: StatusBarHandler;
    private pullRequest: gi.GitPullRequest | null = null;
    private client: AzureClient;

    private git: GitInterface;
    private configManager: ConfigurationManager;

    private commentHandler: CommentHandler;

    private constructor() {}

    static async create(
        context: vsc.ExtensionContext,
        gitHandlerFactory: GitInterfaceFactory,
        branchChangeDetectorFactory: BranchChangeDetectorFactory,
        createCommentHandler: CommentHandlerFactory,
        configManager: ConfigurationManager,
    ): Promise<ExtensionController> {
        const ctrl = new ExtensionController();

        const folder = vsc.workspace.workspaceFolders?.[0].uri.fsPath;
        if (!folder) {
            throw new Error('No folder opened');
        }

        ctrl.git = await gitHandlerFactory(folder);
        ctrl.configManager = configManager;

        try {
            ctrl.configManager.activate();
        } catch (e) {
            throw new Error('Cannot load configuration!');
        }

        ctrl.statusBarHandler = new StatusBarHandler();
        ctrl.commentHandler = createCommentHandler();

        ctrl.configManager.onConfigChanged(() => {
            ctrl.loadClientAndPullRequest(true);
        });

        await ctrl.loadClientAndPullRequest();

        const branchDetector = branchChangeDetectorFactory(ctrl.git);
        branchDetector.activateDetection();
        branchDetector.branchChanged(async branch => {
            if (branch) {
                await ctrl.downloadPullRequest(branch);
            }
        });

        context.subscriptions.push(
            ctrl.commentHandler,
            ctrl.configManager,
            branchDetector,
            ctrl.registerCommand(Commands.REFRESH_CMD, () =>
                ctrl.loadClientAndPullRequest(),
            ),
            ctrl.registerCommand(
                Commands.OPEN_FILE_CMD,
                (
                    filePath: string,
                    start: gi.CommentPosition,
                    end: gi.CommentPosition,
                ) => ctrl.openFile(filePath, start, end),
            ),
            ctrl.registerCommand(Commands.OPEN_PR_CMD, () =>
                ctrl.openPullRequest(),
            ),
            ctrl.registerCommand(
                Commands.CREATE_THREAD_CMD,
                (reply: vsc.CommentReply) =>
                    ctrl.createThreadWithComment(reply),
            ),
            ctrl.registerCommand(
                Commands.REPLY_CMD,
                (reply: vsc.CommentReply) => ctrl.replyToThread(reply),
            ),
            ctrl.registerCommand(
                Commands.REPLY_AND_RESOLVE_CMD,
                (reply: vsc.CommentReply) => ctrl.replyAndResolveThread(reply),
            ),
            ctrl.registerCommand(
                Commands.REPLY_AND_REOPEN_CMD,
                (reply: vsc.CommentReply) => ctrl.replyAndReopenThread(reply),
            ),
            ...Commands.SET_STATUS.map(([command, status]) =>
                ctrl.registerCommand(command, (thread: vsc.CommentThread) =>
                    ctrl.updateStatus(thread, status),
                ),
            ),
            vsc.workspace.onDidChangeConfiguration(e => {
                ctrl.configManager.emitChangedConfig(e);
            }),
        );

        return ctrl;
    }

    deactivate() {}

    private registerCommand(
        commandId: string,
        fn: (...args: any[]) => Promise<any>,
    ): vsc.Disposable {
        return vsc.commands.registerCommand(commandId, (...args) =>
            fn(...args).catch(error => {
                logException(error as Error);
                vsc.window.showErrorMessage('Error while executing command');
                throw error;
            }),
        );
    }

    private async createThreadWithComment(
        reply: vsc.CommentReply,
    ): Promise<void> {
        await this.commentHandler.createThreadWithComment(
            reply,
            this.pullRequest!.pullRequestId!,
            this.git.repositoryRoot,
            this.client,
        );
    }

    private async updateStatus(
        thread: vsc.CommentThread,
        status: gi.CommentThreadStatus,
    ): Promise<void> {
        await this.commentHandler.updateStatus(
            thread,
            status,
            this.pullRequest!.pullRequestId!,
            this.client,
        );
    }

    private async replyToThread(reply: vsc.CommentReply): Promise<void> {
        await this.commentHandler.replyToThread(
            reply,
            this.pullRequest!.pullRequestId!,
            this.client,
        );
    }

    private async replyAndResolveThread(
        reply: vsc.CommentReply,
    ): Promise<void> {
        if (reply.text) {
            await this.commentHandler.replyToThread(
                reply,
                this.pullRequest!.pullRequestId!,
                this.client,
            );
        }

        await this.commentHandler.updateStatus(
            reply.thread,
            gi.CommentThreadStatus.Fixed,
            this.pullRequest!.pullRequestId!,
            this.client,
        );
    }

    private async replyAndReopenThread(reply: vsc.CommentReply): Promise<void> {
        if (reply.text) {
            await this.commentHandler.replyToThread(
                reply,
                this.pullRequest!.pullRequestId!,
                this.client,
            );
        }

        await this.commentHandler.updateStatus(
            reply.thread,
            gi.CommentThreadStatus.Active,
            this.pullRequest!.pullRequestId!,
            this.client,
        );
    }

    private async downloadPullRequest(currentBranch: string): Promise<void> {
        this.statusBarHandler.displayLoading();

        this.pullRequest = await this.client.loadPullRequest(currentBranch);

        this.commentHandler.clearComments();
        this.commentHandler.updateCommentingProviderRange(!!this.pullRequest);

        this.statusBarHandler.displayPR(this.pullRequest);

        if (this.pullRequest) {
            log(`Downloaded PR ${this.pullRequest.pullRequestId!}`);
            const prId = this.pullRequest.pullRequestId ?? null;
            if (!prId) {
                log('PR has no id');
                return;
            }

            const threads = await this.client.loadThreads(prId);

            log(`Downloaded ${threads.length} threads.`);

            for (const thread of threads) {
                log(`Mapping thread ${thread.id}`);
                try {
                    await this.commentHandler.mapThread(
                        thread,
                        this.git.repositoryRoot,
                        this.client.user,
                    );
                } catch (error) {
                    log(`Error while mapping thread ${thread.id}`);
                    logException(error as Error);
                }
            }
        } else {
            log('No PR found');
        }
    }

    private async loadClientAndPullRequest(
        forceReloadClient: boolean = false,
    ): Promise<void> {
        if (!this.client || forceReloadClient) {
            try {
                this.client = await getClient(this.configManager);
                await this.client.activate();
            } catch (error) {
                this.commentHandler.clearComments();
                vsc.window.showErrorMessage(
                    'Error while initializing the extension',
                );
                logException(error as Error);
                throw error;
            }
        }

        try {
            const currentBranch = await this.git.getCurrentBranch();
            if (!currentBranch) {
                vsc.window.showErrorMessage('Cannot detect current branch!');
                return;
            }
            log(`Detected branch ${currentBranch}`);
            await this.downloadPullRequest(currentBranch);
        } catch (error) {
            this.commentHandler.clearComments();
            vsc.window.showErrorMessage('Error while downloading comments');
            logException(error as Error);
        }
    }

    private async openFile(
        filePath: string,
        start: gi.CommentPosition,
        end: gi.CommentPosition,
    ) {
        try {
            vsc.window.showTextDocument(
                toUri(filePath, this.git.repositoryRoot),
                {
                    selection: new vsc.Range(
                        toVsPosition(start),
                        toVsPosition(end),
                    ),
                },
            );
        } catch (error) {
            vsc.window.showErrorMessage(
                `Error while opening file ${filePath} in editor`,
            );
            logException(error as Error);
        }
    }

    private async openPullRequest(): Promise<boolean> {
        const id = this.pullRequest?.pullRequestId;
        if (id === undefined) {
            return false;
        }

        const uri = this.configManager.configuration.buildPullRequestUrl(id);
        return vsc.env.openExternal(uri);
    }
}
