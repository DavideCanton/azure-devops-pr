import { GitPullRequestCommentThread } from 'azure-devops-node-api/interfaces/GitInterfaces';

export const THREADS: GitPullRequestCommentThread[] = [
    {
        pullRequestThreadContext: {
            iterationContext: {
                firstComparingIteration: 1,
                secondComparingIteration: 1,
            },
            changeTrackingId: 1,
        },
        id: 1,
        publishedDate: new Date('2023-06-10T13:45:49.353Z'),
        lastUpdatedDate: new Date('2023-06-10T13:45:49.353Z'),
        comments: [
            {
                id: 1,
                parentCommentId: 0,
                author: {
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
                        'https://dev.azure.com/davidecanton5/_apis/GraphProfile/MemberAvatars/msa.MmE0ZDZkM2YtM2FkZC03NzZkLWI5YmQtMDU5ZGNmOTI5NmI5',
                    descriptor:
                        'msa.MmE0ZDZkM2YtM2FkZC03NzZkLWI5YmQtMDU5ZGNmOTI5NmI5',
                },
                content: 'che bella modifica',
                publishedDate: new Date('2023-06-10T13:45:49.353Z'),
                lastUpdatedDate: new Date('2023-06-10T13:45:49.353Z'),
                lastContentUpdatedDate: new Date('2023-06-10T13:45:49.353Z'),
                commentType: 1,
                usersLiked: [],
                _links: {
                    self: {
                        href: 'https://dev.azure.com/davidecanton5/_apis/git/repositories/0e9d5414-154f-478a-8461-25899db10648/pullRequests/1/threads/1/comments/1',
                    },
                    repository: {
                        href: 'https://dev.azure.com/davidecanton5/9ca4c4ec-c08b-427f-91fc-00f2c4e121a1/_apis/git/repositories/0e9d5414-154f-478a-8461-25899db10648',
                    },
                    threads: {
                        href: 'https://dev.azure.com/davidecanton5/_apis/git/repositories/0e9d5414-154f-478a-8461-25899db10648/pullRequests/1/threads/1',
                    },
                    pullRequests: {
                        href: 'https://dev.azure.com/davidecanton5/_apis/git/pullRequests/1',
                    },
                },
            },
        ],
        status: 1,
        threadContext: {
            filePath: '/foo.txt',
            rightFileStart: { line: 1, offset: 1 },
            rightFileEnd: { line: 1, offset: 10 },
        },
        properties: {
            'Microsoft.TeamFoundation.Discussion.SupportsMarkdown': {
                $type: 'System.Int32',
                $value: 1,
            },
            'Microsoft.TeamFoundation.Discussion.UniqueID': {
                $type: 'System.String',
                $value: 'f04ebfe9-c592-42cb-806e-8115ba9a71e7',
            },
        },
        isDeleted: false,
        _links: {
            self: {
                href: 'https://dev.azure.com/davidecanton5/_apis/git/repositories/0e9d5414-154f-478a-8461-25899db10648/pullRequests/1/threads/1',
            },
            repository: {
                href: 'https://dev.azure.com/davidecanton5/9ca4c4ec-c08b-427f-91fc-00f2c4e121a1/_apis/git/repositories/0e9d5414-154f-478a-8461-25899db10648',
            },
        },
    },
    {
        pullRequestThreadContext: {
            iterationContext: {
                firstComparingIteration: 1,
                secondComparingIteration: 1,
            },
            changeTrackingId: 1,
        },
        id: 2,
        publishedDate: new Date('2023-06-10T13:45:58.913Z'),
        lastUpdatedDate: new Date('2023-06-10T13:45:58.913Z'),
        comments: [
            {
                id: 1,
                parentCommentId: 0,
                author: {
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
                        'https://dev.azure.com/davidecanton5/_apis/GraphProfile/MemberAvatars/msa.MmE0ZDZkM2YtM2FkZC03NzZkLWI5YmQtMDU5ZGNmOTI5NmI5',
                    descriptor:
                        'msa.MmE0ZDZkM2YtM2FkZC03NzZkLWI5YmQtMDU5ZGNmOTI5NmI5',
                },
                content: 'magari qua si può aggiungere altro?',
                publishedDate: new Date('2023-06-10T13:45:58.913Z'),
                lastUpdatedDate: new Date('2023-06-10T13:45:58.913Z'),
                lastContentUpdatedDate: new Date('2023-06-10T13:45:58.913Z'),
                commentType: 1,
                usersLiked: [
                    {
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
                        descriptor:
                            'msa.MmE0ZDZkM2YtM2FkZC03NzZkLWI5YmQtMDU5ZGNmOTI5NmI5',
                    },
                ],
                _links: {
                    self: {
                        href: 'https://dev.azure.com/davidecanton5/_apis/git/repositories/0e9d5414-154f-478a-8461-25899db10648/pullRequests/1/threads/2/comments/1',
                    },
                    repository: {
                        href: 'https://dev.azure.com/davidecanton5/9ca4c4ec-c08b-427f-91fc-00f2c4e121a1/_apis/git/repositories/0e9d5414-154f-478a-8461-25899db10648',
                    },
                    threads: {
                        href: 'https://dev.azure.com/davidecanton5/_apis/git/repositories/0e9d5414-154f-478a-8461-25899db10648/pullRequests/1/threads/2',
                    },
                    pullRequests: {
                        href: 'https://dev.azure.com/davidecanton5/_apis/git/pullRequests/1',
                    },
                },
            },
        ],
        status: 1,
        threadContext: {
            filePath: '/foo.txt',
            rightFileStart: { line: 2, offset: 1 },
            rightFileEnd: { line: 2, offset: 1 },
        },
        properties: {
            'Microsoft.TeamFoundation.Discussion.SupportsMarkdown': {
                $type: 'System.Int32',
                $value: 1,
            },
            'Microsoft.TeamFoundation.Discussion.UniqueID': {
                $type: 'System.String',
                $value: 'b4b6fef1-74a1-405f-9070-7be2646cf8b0',
            },
        },
        isDeleted: false,
        _links: {
            self: {
                href: 'https://dev.azure.com/davidecanton5/_apis/git/repositories/0e9d5414-154f-478a-8461-25899db10648/pullRequests/1/threads/2',
            },
            repository: {
                href: 'https://dev.azure.com/davidecanton5/9ca4c4ec-c08b-427f-91fc-00f2c4e121a1/_apis/git/repositories/0e9d5414-154f-478a-8461-25899db10648',
            },
        },
    },
    {
        id: 3,
        publishedDate: new Date('2023-06-10T13:46:03.513Z'),
        lastUpdatedDate: new Date('2023-06-10T14:06:16.763Z'),
        comments: [
            {
                id: 1,
                parentCommentId: 0,
                author: {
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
                        'https://dev.azure.com/davidecanton5/_apis/GraphProfile/MemberAvatars/msa.MmE0ZDZkM2YtM2FkZC03NzZkLWI5YmQtMDU5ZGNmOTI5NmI5',
                    descriptor:
                        'msa.MmE0ZDZkM2YtM2FkZC03NzZkLWI5YmQtMDU5ZGNmOTI5NmI5',
                },
                content: 'roba di lusso',
                publishedDate: new Date('2023-06-10T13:46:03.513Z'),
                lastUpdatedDate: new Date('2023-06-10T13:46:03.513Z'),
                lastContentUpdatedDate: new Date('2023-06-10T13:46:03.513Z'),
                commentType: 1,
                usersLiked: [],
                _links: {
                    self: {
                        href: 'https://dev.azure.com/davidecanton5/_apis/git/repositories/0e9d5414-154f-478a-8461-25899db10648/pullRequests/1/threads/3/comments/1',
                    },
                    repository: {
                        href: 'https://dev.azure.com/davidecanton5/9ca4c4ec-c08b-427f-91fc-00f2c4e121a1/_apis/git/repositories/0e9d5414-154f-478a-8461-25899db10648',
                    },
                    threads: {
                        href: 'https://dev.azure.com/davidecanton5/_apis/git/repositories/0e9d5414-154f-478a-8461-25899db10648/pullRequests/1/threads/3',
                    },
                    pullRequests: {
                        href: 'https://dev.azure.com/davidecanton5/_apis/git/pullRequests/1',
                    },
                },
            },
            {
                id: 2,
                parentCommentId: 1,
                author: {
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
                        'https://dev.azure.com/davidecanton5/_apis/GraphProfile/MemberAvatars/msa.MmE0ZDZkM2YtM2FkZC03NzZkLWI5YmQtMDU5ZGNmOTI5NmI5',
                    descriptor:
                        'msa.MmE0ZDZkM2YtM2FkZC03NzZkLWI5YmQtMDU5ZGNmOTI5NmI5',
                },
                content: 'extra lusso',
                publishedDate: new Date('2023-06-10T14:06:14.667Z'),
                lastUpdatedDate: new Date('2023-06-10T14:06:14.667Z'),
                lastContentUpdatedDate: new Date('2023-06-10T14:06:14.667Z'),
                commentType: 1,
                usersLiked: [],
                _links: {
                    self: {
                        href: 'https://dev.azure.com/davidecanton5/_apis/git/repositories/0e9d5414-154f-478a-8461-25899db10648/pullRequests/1/threads/3/comments/2',
                    },
                    repository: {
                        href: 'https://dev.azure.com/davidecanton5/9ca4c4ec-c08b-427f-91fc-00f2c4e121a1/_apis/git/repositories/0e9d5414-154f-478a-8461-25899db10648',
                    },
                    threads: {
                        href: 'https://dev.azure.com/davidecanton5/_apis/git/repositories/0e9d5414-154f-478a-8461-25899db10648/pullRequests/1/threads/3',
                    },
                    pullRequests: {
                        href: 'https://dev.azure.com/davidecanton5/_apis/git/pullRequests/1',
                    },
                },
            },
        ],
        status: 2,
        properties: {
            'Microsoft.TeamFoundation.Discussion.SupportsMarkdown': {
                $type: 'System.Int32',
                $value: 1,
            },
            'Microsoft.TeamFoundation.Discussion.UniqueID': {
                $type: 'System.String',
                $value: '627814ad-7353-4217-a770-0415a15ba442',
            },
        },
        isDeleted: false,
        _links: {
            self: {
                href: 'https://dev.azure.com/davidecanton5/_apis/git/repositories/0e9d5414-154f-478a-8461-25899db10648/pullRequests/1/threads/3',
            },
            repository: {
                href: 'https://dev.azure.com/davidecanton5/9ca4c4ec-c08b-427f-91fc-00f2c4e121a1/_apis/git/repositories/0e9d5414-154f-478a-8461-25899db10648',
            },
        },
    },
    {
        id: 4,
        publishedDate: new Date('2023-06-10T13:46:11.810Z'),
        lastUpdatedDate: new Date('2023-06-10T13:46:11.810Z'),
        comments: [
            {
                id: 1,
                parentCommentId: 0,
                author: {
                    displayName: 'Microsoft.VisualStudio.Services.TFS',
                    url: 'https://spsprodweu5.vssps.visualstudio.com/A5b5c33ea-4569-4b96-a435-b45b7a8a6555/_apis/Identities/00000002-0000-8888-8000-000000000000',
                    _links: {
                        avatar: {
                            href: 'https://dev.azure.com/davidecanton5/_apis/GraphProfile/MemberAvatars/s2s.MDAwMDAwMDItMDAwMC04ODg4LTgwMDAtMDAwMDAwMDAwMDAwQDJjODk1OTA4LTA0ZTAtNDk1Mi04OWZkLTU0YjAwNDZkNjI4OA',
                        },
                    },
                    id: '00000002-0000-8888-8000-000000000000',
                    uniqueName: '',
                    imageUrl:
                        'https://dev.azure.com/davidecanton5/_apis/GraphProfile/MemberAvatars/s2s.MDAwMDAwMDItMDAwMC04ODg4LTgwMDAtMDAwMDAwMDAwMDAwQDJjODk1OTA4LTA0ZTAtNDk1Mi04OWZkLTU0YjAwNDZkNjI4OA',
                    descriptor:
                        's2s.MDAwMDAwMDItMDAwMC04ODg4LTgwMDAtMDAwMDAwMDAwMDAwQDJjODk1OTA4LTA0ZTAtNDk1Mi04OWZkLTU0YjAwNDZkNjI4OA',
                },
                content: 'Davide Canton joined as a reviewer',
                publishedDate: new Date('2023-06-10T13:46:11.810Z'),
                lastUpdatedDate: new Date('2023-06-10T13:46:11.810Z'),
                lastContentUpdatedDate: new Date('2023-06-10T13:46:11.810Z'),
                commentType: 3,
                usersLiked: [],
                _links: {
                    self: {
                        href: 'https://dev.azure.com/davidecanton5/_apis/git/repositories/0e9d5414-154f-478a-8461-25899db10648/pullRequests/1/threads/4/comments/1',
                    },
                    repository: {
                        href: 'https://dev.azure.com/davidecanton5/9ca4c4ec-c08b-427f-91fc-00f2c4e121a1/_apis/git/repositories/0e9d5414-154f-478a-8461-25899db10648',
                    },
                    threads: {
                        href: 'https://dev.azure.com/davidecanton5/_apis/git/repositories/0e9d5414-154f-478a-8461-25899db10648/pullRequests/1/threads/4',
                    },
                    pullRequests: {
                        href: 'https://dev.azure.com/davidecanton5/_apis/git/pullRequests/1',
                    },
                },
            },
        ],
        properties: {
            CodeReviewReviewersUpdatedNumAdded: {
                $type: 'System.Int32',
                $value: 1,
            },
            CodeReviewReviewersUpdatedNumChanged: {
                $type: 'System.Int32',
                $value: 0,
            },
            CodeReviewReviewersUpdatedNumDeclined: {
                $type: 'System.Int32',
                $value: 0,
            },
            CodeReviewReviewersUpdatedNumRemoved: {
                $type: 'System.Int32',
                $value: 0,
            },
            CodeReviewThreadType: {
                $type: 'System.String',
                $value: 'ReviewersUpdate',
            },
            CodeReviewReviewersUpdatedAddedIdentity: {
                $type: 'System.String',
                $value: '1',
            },
            CodeReviewReviewersUpdatedByIdentity: {
                $type: 'System.String',
                $value: '1',
            },
        },
        identities: {
            '1': {
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
                    'https://dev.azure.com/davidecanton5/_apis/GraphProfile/MemberAvatars/msa.MmE0ZDZkM2YtM2FkZC03NzZkLWI5YmQtMDU5ZGNmOTI5NmI5',
                descriptor:
                    'msa.MmE0ZDZkM2YtM2FkZC03NzZkLWI5YmQtMDU5ZGNmOTI5NmI5',
            },
        },
        isDeleted: false,
        _links: {
            self: {
                href: 'https://dev.azure.com/davidecanton5/_apis/git/repositories/0e9d5414-154f-478a-8461-25899db10648/pullRequests/1/threads/4',
            },
            repository: {
                href: 'https://dev.azure.com/davidecanton5/9ca4c4ec-c08b-427f-91fc-00f2c4e121a1/_apis/git/repositories/0e9d5414-154f-478a-8461-25899db10648',
            },
        },
    },
    {
        pullRequestThreadContext: {
            iterationContext: {
                firstComparingIteration: 1,
                secondComparingIteration: 1,
            },
            changeTrackingId: 1,
        },
        id: 5,
        publishedDate: new Date('2023-06-10T14:20:44.800Z'),
        lastUpdatedDate: new Date('2023-06-10T14:20:44.800Z'),
        comments: [
            {
                id: 1,
                parentCommentId: 0,
                author: {
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
                        'https://dev.azure.com/davidecanton5/_apis/GraphProfile/MemberAvatars/msa.MmE0ZDZkM2YtM2FkZC03NzZkLWI5YmQtMDU5ZGNmOTI5NmI5',
                    descriptor:
                        'msa.MmE0ZDZkM2YtM2FkZC03NzZkLWI5YmQtMDU5ZGNmOTI5NmI5',
                },
                content: '```suggestion\nmaccarons?\n```\n',
                publishedDate: new Date('2023-06-10T14:20:44.800Z'),
                lastUpdatedDate: new Date('2023-06-10T14:20:44.800Z'),
                lastContentUpdatedDate: new Date('2023-06-10T14:20:44.800Z'),
                commentType: 1,
                usersLiked: [],
                _links: {
                    self: {
                        href: 'https://dev.azure.com/davidecanton5/_apis/git/repositories/0e9d5414-154f-478a-8461-25899db10648/pullRequests/1/threads/5/comments/1',
                    },
                    repository: {
                        href: 'https://dev.azure.com/davidecanton5/9ca4c4ec-c08b-427f-91fc-00f2c4e121a1/_apis/git/repositories/0e9d5414-154f-478a-8461-25899db10648',
                    },
                    threads: {
                        href: 'https://dev.azure.com/davidecanton5/_apis/git/repositories/0e9d5414-154f-478a-8461-25899db10648/pullRequests/1/threads/5',
                    },
                    pullRequests: {
                        href: 'https://dev.azure.com/davidecanton5/_apis/git/pullRequests/1',
                    },
                },
            },
        ],
        status: 2,
        threadContext: {
            filePath: '/foo.txt',
            rightFileStart: { line: 1, offset: 1 },
            rightFileEnd: { line: 1, offset: 10 },
        },
        properties: {
            'Microsoft.TeamFoundation.Discussion.SupportsMarkdown': {
                $type: 'System.Int32',
                $value: 1,
            },
            'Microsoft.TeamFoundation.Discussion.UniqueID': {
                $type: 'System.String',
                $value: 'ea2cc301-1252-488f-9bb7-976b4b580db5',
            },
        },
        isDeleted: false,
        _links: {
            self: {
                href: 'https://dev.azure.com/davidecanton5/_apis/git/repositories/0e9d5414-154f-478a-8461-25899db10648/pullRequests/1/threads/5',
            },
            repository: {
                href: 'https://dev.azure.com/davidecanton5/9ca4c4ec-c08b-427f-91fc-00f2c4e121a1/_apis/git/repositories/0e9d5414-154f-478a-8461-25899db10648',
            },
        },
    },
];
