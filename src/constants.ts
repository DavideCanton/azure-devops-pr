//identifiers

import * as gi from 'azure-devops-node-api/interfaces/GitInterfaces';

/** Extension id */
export const EXT_ID = 'azure-devops-pr';
/** Comment controller id */
export const COMMENT_CONTROLLER_ID = 'azure-devops-pr-comment';

// commands

/** The command raised when the PR and the comments should be redownloaded. */
export const REFRESH_CMD = `${EXT_ID}.refresh`;
/** The command raised when the file associated to a comment should be opened. */
export const OPEN_FILE_CMD = `${EXT_ID}.open_file`;
/** The command raised when the pull request should be opened in the browser. */
export const OPEN_PR_CMD = `${EXT_ID}.open_pr`;

export const REPLY_CMD = `${EXT_ID}.replyThread`;

export const REPLY_AND_RESOLVE_CMD = `${EXT_ID}.replyAndResolveThread`;
export const REPLY_AND_REOPEN_CMD = `${EXT_ID}.replyAndReopenThread`;

export const CREATE_THREAD_CMD = `${EXT_ID}.createThread`;

export const SET_STATUS_CMDS = Object.entries({
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

export declare const DEV_MODE: boolean;
