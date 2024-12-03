import * as gi from 'azure-devops-node-api/interfaces/GitInterfaces';
import * as vsc from 'vscode';
import { IAzureClient } from './clients';
import { ICommentHandler } from './comment-handler';
import { ConfigurationManager } from './config';
import { Commands } from './constants';
import { IBranchChangeDetector, IGitInterface } from './git-utils';
import { log, logException } from './logs';
import { StatusBarHandler } from './status-bar';
import { toUri, toVsPosition } from './utils';

export class ExtensionController {
    private pullRequest: gi.GitPullRequest | null = null;

    constructor(
        private git: IGitInterface,
        private branchDetector: IBranchChangeDetector,
        private commentHandler: ICommentHandler,
        private statusBarHandler: StatusBarHandler,
        private configManager: ConfigurationManager,
        private client: IAzureClient,
    ) {}

    async activate(context: vsc.ExtensionContext): Promise<void> {
        this.configManager.onConfigChanged(async success => {
            if (success) {
                try {
                    await this.client.activate();
                } catch (error) {
                    this.commentHandler.clearComments();
                    vsc.window.showErrorMessage(
                        'Error while initializing the Azure DevOps client',
                    );
                    logException(error as Error);
                    throw error;
                }

                await this.loadCurrentBranchAndDownloadPullRequest();
            }
        });

        this.branchDetector.branchChanged(async branch => {
            if (branch) {
                await this.downloadPullRequest(branch);
            } else {
                this.statusBarHandler.clear();
            }
        });

        context.subscriptions.push(
            this.commentHandler,
            this.configManager,
            this.branchDetector,
        );

        this.setupCommands(context);

        context.subscriptions.push(this.configManager.activate());

        await this.client.activate();
        this.branchDetector.activateDetection();

        await this.loadCurrentBranchAndDownloadPullRequest();
    }

    private setupCommands(context: vsc.ExtensionContext) {
        context.subscriptions.push(
            this.registerCommand(Commands.REFRESH_CMD, () =>
                this.loadCurrentBranchAndDownloadPullRequest(),
            ),
            this.registerCommand(
                Commands.OPEN_FILE_CMD,
                (
                    filePath: string,
                    start: gi.CommentPosition,
                    end: gi.CommentPosition,
                ) => this.openFile(filePath, start, end),
            ),
            this.registerCommand(Commands.OPEN_PR_CMD, () =>
                this.openPullRequest(),
            ),
            this.registerCommand(
                Commands.CREATE_THREAD_CMD,
                (reply: vsc.CommentReply) =>
                    this.createThreadWithComment(reply),
            ),
            this.registerCommand(
                Commands.REPLY_CMD,
                (reply: vsc.CommentReply) => this.replyToThread(reply),
            ),
            this.registerCommand(
                Commands.REPLY_AND_RESOLVE_CMD,
                (reply: vsc.CommentReply) => this.replyAndResolveThread(reply),
            ),
            this.registerCommand(
                Commands.REPLY_AND_REOPEN_CMD,
                (reply: vsc.CommentReply) => this.replyAndReopenThread(reply),
            ),
            ...Commands.SET_STATUS.map(([command, status]) =>
                this.registerCommand(command, (thread: vsc.CommentThread) =>
                    this.updateStatus(thread, status),
                ),
            ),
        );
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

        this.statusBarHandler.displayPullRequest(this.pullRequest);

        if (this.pullRequest) {
            const prId = this.pullRequest.pullRequestId ?? null;
            if (!prId) {
                log('Pull request has no id');
                return;
            }
            log(`Downloaded pull request !${this.pullRequest.pullRequestId!}`);

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
            log('No pull request found for current branch');
        }
    }

    private async loadCurrentBranchAndDownloadPullRequest(): Promise<void> {
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
