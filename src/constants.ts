//identifiers

import * as gi from 'azure-devops-node-api/interfaces/GitInterfaces';

/** Extension id */
export const EXT_ID = 'azure-devops-pr';
/** Comment controller id */
export const COMMENT_CONTROLLER_ID = 'azure-devops-pr-comment';

// commands

export namespace Commands {
    /** The command raised when the PR and the comments should be redownloaded. */
    export const REFRESH_CMD = `${EXT_ID}.refresh`;
    /** The command raised when the file associated to a comment should be opened. */
    export const OPEN_FILE_CMD = `${EXT_ID}.open_file`;
    /** The command raised when the pull request should be opened in the browser. */
    export const OPEN_PR_CMD = `${EXT_ID}.open_pr`;
    /** The command raised when a reply is added to a thread. */
    export const REPLY_CMD = `${EXT_ID}.replyThread`;
    /** The command raised when a thread is resolved and a reply is added. */
    export const REPLY_AND_RESOLVE_CMD = `${EXT_ID}.replyAndResolveThread`;
    /** The command raised when a thread is reopened and a reply is added. */
    export const REPLY_AND_REOPEN_CMD = `${EXT_ID}.replyAndReopenThread`;
    /** The command raised when a thread is created and a reply is added. */
    export const CREATE_THREAD_CMD = `${EXT_ID}.createThread`;

    /** Set of commands raised when the status of a thread is changed. */
    export const SET_STATUS = Object.entries({
        'set-status-to-active': gi.CommentThreadStatus.Active,
        'set-status-to-fixed': gi.CommentThreadStatus.Fixed,
        'set-status-to-wontFix': gi.CommentThreadStatus.WontFix,
        'set-status-to-closed': gi.CommentThreadStatus.Closed,
        'set-status-to-byDesign': gi.CommentThreadStatus.ByDesign,
        'set-status-to-pending': gi.CommentThreadStatus.Pending,
    }).map(([name, status]): [string, gi.CommentThreadStatus] => [
        `${EXT_ID}.${name}`,
        status,
    ]);
}

export declare const DEV_MODE: boolean;
