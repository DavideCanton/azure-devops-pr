import * as gi from 'azure-devops-node-api/interfaces/GitInterfaces';
import * as vsc from 'vscode';
import { AzureClient, getClient } from './client';
import { ConfigurationManager } from './config';
import * as C from './constants';
import {
    BranchChangeDetectorFactory,
    GitInterface,
    GitInterfaceFactory,
} from './git-utils';
import { log, logException } from './logs';
import { StatusBarHandler } from './status-bar';
import { CommentHandler, CommentHandlerFactory } from './comment-handler';
import { toPosition, toUri } from './utils';

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
            ctrl.loadClientAndPR(true);
        });

        await ctrl.loadClientAndPR();

        const branchDetector = branchChangeDetectorFactory(ctrl.git);
        branchDetector.activateDetection();
        branchDetector.branchChanged(async b => {
            if (b) {
                await ctrl.downloadPR(b);
            }
        });

        context.subscriptions.push(
            ctrl.commentHandler,
            ctrl.configManager,
            branchDetector,
            vsc.commands.registerCommand(C.REFRESH_CMD, async () =>
                ctrl.loadClientAndPR(),
            ),
            vsc.commands.registerCommand(
                C.OPEN_FILE_CMD,
                async (filePath, start, end) =>
                    ctrl.openFile(filePath, start, end),
            ),
            vsc.commands.registerCommand(C.OPEN_PR_CMD, async () =>
                ctrl.openPR(),
            ),
            vsc.commands.registerCommand(C.CREATE_THREAD_CMD, reply =>
                ctrl.createThreadWithComment(reply),
            ),
            vsc.commands.registerCommand(C.REPLY_CMD, reply =>
                ctrl.replyToThread(reply),
            ),
            vsc.workspace.onDidChangeConfiguration(e => {
                ctrl.configManager.emitChangedConfig(e);
            }),
        );

        return ctrl;
    }

    deactivate() {}

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

    private async replyToThread(reply: vsc.CommentReply): Promise<void> {
        await this.commentHandler.replyToThread(
            reply,
            this.pullRequest!.pullRequestId!,
            this.client,
        );
    }

    private async downloadPR(currentBranch: string) {
        this.pullRequest = await this.client.loadPullRequest(currentBranch);

        this.commentHandler.clearComments();
        this.commentHandler.updateCommentingProviderRange(!!this.pullRequest);

        if (this.pullRequest) {
            log(`Downloaded PR ${this.pullRequest.pullRequestId!}`);
        } else {
            log('No PR found');
        }

        const prId = this.pullRequest?.pullRequestId ?? null;
        this.statusBarHandler.displayPR(this.pullRequest!);

        if (prId === null) {
            return;
        }

        const threads = await this.client.loadThreads(prId);

        log(`Downloaded ${threads.length} threads.`);

        for (const thread of threads) {
            await this.commentHandler.mapThread(
                thread,
                this.git.repositoryRoot,
                this.client.user,
            );
        }
    }

    private async loadClientAndPR(forceReloadClient: boolean = false) {
        if (!this.client || forceReloadClient) {
            try {
                this.client = getClient(this.configManager);
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
            await this.downloadPR(currentBranch);
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
                        toPosition(start),
                        toPosition(end),
                    ),
                },
            );
        } catch (error) {
            vsc.window.showErrorMessage('Error while displaying comments');
            logException(error as Error);
        }
    }

    private async openPR() {
        const prId = this.pullRequest?.pullRequestId;
        if (prId === undefined) {
            return;
        }

        const uri = this.configManager.configuration.buildPullRequestUrl(prId);
        vsc.env.openExternal(uri);
    }
}
