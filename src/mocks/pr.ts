import { GitPullRequest } from 'azure-devops-node-api/interfaces/GitInterfaces';

export const PR: GitPullRequest = {
    repository: {
        id: '0e9d5414-154f-478a-8461-25899db10648',
        name: 'Prova',
        url: 'https://dev.azure.com/davidecanton5/9ca4c4ec-c08b-427f-91fc-00f2c4e121a1/_apis/git/repositories/0e9d5414-154f-478a-8461-25899db10648',
        project: {
            id: '9ca4c4ec-c08b-427f-91fc-00f2c4e121a1',
            name: 'Prova',
            state: 'unchanged',
            visibility: 0,
            lastUpdateTime: new Date('0000-12-31T23:10:04.000Z'),
        },
    },
    pullRequestId: 1,
    codeReviewId: 1,
    status: 1,
    createdBy: {
        displayName: 'Davide Canton',
        url: 'https://spsprodweu5.vssps.visualstudio.com/A5b5c33ea-4569-4b96-a435-b45b7a8a6555/_apis/Identities/9f5b69b0-2c1b-4463-b06e-91ecc648d1c4',
        _links: {
            avatar: {
                href: 'https://dev.azure.com/davidecanton5/_apis/GraphProfile/MemberAvatars/msa.MmE0ZDZkM2YtM2FkZC03NzZkLWI5YmQtMDU5ZGNmOTI5NmI5',
            },
        },
        id: '9f5b69b0-2c1b-4463-b06e-91ecc648d1c4',
        uniqueName: 'davide.canton5@gmail.com',
        imageUrl:
            'https://dev.azure.com/davidecanton5/_api/_common/identityImage?id=9f5b69b0-2c1b-4463-b06e-91ecc648d1c4',
        descriptor: 'msa.MmE0ZDZkM2YtM2FkZC03NzZkLWI5YmQtMDU5ZGNmOTI5NmI5',
    },
    creationDate: new Date('2023-06-10T13:45:42.353Z'),
    title: 'commit maccarons',
    description: 'commit maccarons',
    sourceRefName: 'refs/heads/maccarons',
    targetRefName: 'refs/heads/master',
    mergeStatus: 3,
    isDraft: false,
    mergeId: 'b78e4ef6-40de-40bf-9da3-979b3a0e422b',
    lastMergeSourceCommit: {
        commitId: '1f07d8360bb0799610b028001f44773a1613971e',
        url: 'https://dev.azure.com/davidecanton5/9ca4c4ec-c08b-427f-91fc-00f2c4e121a1/_apis/git/repositories/0e9d5414-154f-478a-8461-25899db10648/commits/1f07d8360bb0799610b028001f44773a1613971e',
    },
    lastMergeTargetCommit: {
        commitId: '6ad6dc3106b23154c22e5e529191e2646a31a9e3',
        url: 'https://dev.azure.com/davidecanton5/9ca4c4ec-c08b-427f-91fc-00f2c4e121a1/_apis/git/repositories/0e9d5414-154f-478a-8461-25899db10648/commits/6ad6dc3106b23154c22e5e529191e2646a31a9e3',
    },
    lastMergeCommit: {
        commitId: '7ff4d9a3340c03cf8deba5a6cb9d85dcbb2f70b1',
        url: 'https://dev.azure.com/davidecanton5/9ca4c4ec-c08b-427f-91fc-00f2c4e121a1/_apis/git/repositories/0e9d5414-154f-478a-8461-25899db10648/commits/7ff4d9a3340c03cf8deba5a6cb9d85dcbb2f70b1',
    },
    reviewers: [
        {
            reviewerUrl:
                'https://dev.azure.com/davidecanton5/9ca4c4ec-c08b-427f-91fc-00f2c4e121a1/_apis/git/repositories/0e9d5414-154f-478a-8461-25899db10648/pullRequests/1/reviewers/9f5b69b0-2c1b-4463-b06e-91ecc648d1c4',
            vote: 0,
            hasDeclined: false,
            isFlagged: false,
            displayName: 'Davide Canton',
            url: 'https://spsprodweu5.vssps.visualstudio.com/A5b5c33ea-4569-4b96-a435-b45b7a8a6555/_apis/Identities/9f5b69b0-2c1b-4463-b06e-91ecc648d1c4',
            _links: {
                avatar: {
                    href: 'https://dev.azure.com/davidecanton5/_apis/GraphProfile/MemberAvatars/msa.MmE0ZDZkM2YtM2FkZC03NzZkLWI5YmQtMDU5ZGNmOTI5NmI5',
                },
            },
            id: '9f5b69b0-2c1b-4463-b06e-91ecc648d1c4',
            uniqueName: 'davide.canton5@gmail.com',
            imageUrl:
                'https://dev.azure.com/davidecanton5/_api/_common/identityImage?id=9f5b69b0-2c1b-4463-b06e-91ecc648d1c4',
        },
    ],
    labels: [
        {
            id: '16ce269a-03db-4323-9672-7a969433000b',
            name: 'text',
            active: true,
        },
    ],
    url: 'https://dev.azure.com/davidecanton5/9ca4c4ec-c08b-427f-91fc-00f2c4e121a1/_apis/git/repositories/0e9d5414-154f-478a-8461-25899db10648/pullRequests/1',
    supportsIterations: true,
};
