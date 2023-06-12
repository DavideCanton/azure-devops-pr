//identifiers

/** Extension id */
export const EXT_ID = "azure-devops-pr";
/** Comment controller id */
export const COMMENT_CONTROLLER_ID = "azure-devops-pr-comment";

// commands

/** The command raised when the PR and the comments should be redownloaded. */
export const REFRESH_CMD = `${EXT_ID}.refresh`;
/** The command raised when the file associated to a comment should be opened. */
export const OPEN_FILE_CMD = `${EXT_ID}.open_file`;
/** The command raised when the pull request should be opened in the browser. */
export const OPEN_PR_CMD = `${EXT_ID}.open_pr`;


