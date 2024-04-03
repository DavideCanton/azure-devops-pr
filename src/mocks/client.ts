import * as gi from 'azure-devops-node-api/interfaces/GitInterfaces';
import { Identity } from 'azure-devops-node-api/interfaces/IdentitiesInterfaces';
import { AzureClient } from '../client';
import { ConfigurationManager } from '../config';
import { PR } from './pr';
import { THREADS } from './threads';

class MockClient implements AzureClient {
    user: Identity;

    async activate(): Promise<void> {
        this.user = {
            customDisplayName: 'foo',
            id: 'id',
        };
    }

    async loadPullRequest(
        branchName: string,
    ): Promise<gi.GitPullRequest | null> {
        return PR;
    }

    async loadThreads(
        pullRequestId: number,
    ): Promise<gi.GitPullRequestCommentThread[]> {
        return THREADS;
    }

    async comment(
        content: string,
        pullRequestId: number,
        threadId: number,
        parentCommentId: number | null,
    ): Promise<gi.Comment> {
        return {} as gi.Comment;
    }

    async createThread(
        pullRequestId: number,
        content: string,
    ): Promise<gi.GitPullRequestCommentThread> {
        return {} as gi.GitPullRequestCommentThread;
    }
}

export function getClient(_cm: ConfigurationManager): AzureClient {
    return new MockClient();
}
