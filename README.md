# Azure DevOps PR

Visual Studio Code extension for displaying and editing code review comments directly in the editor.

- [Azure DevOps PR](#azure-devops-pr)
  - [Installation](#installation)
  - [Configuration](#configuration)
  - [Usage](#usage)

## Installation

Install the extension from the [provided VSIX file](https://github.com/DavideCanton/azure-devops-pr/releases/download/latest/azure-devops-pr-0.0.1.vsix). In the future the extension will be published in the marketplace too.

## Configuration

The extension requires the following options to work correctly:

- `azure-devops-pr.token`: The token used to access Azure DevOps. Should have the role to read and update pull requests.
- `azure-devops-pr.organization-name`: The name of the organization.
- `azure-devops-pr.project-name`: The name of the project.
- `azure-devops-pr.repository-name`: The name of the repository.
- `azure-devops-pr.azure-origin`: The address of Azure Devops. Defaults to `https://dev.azure.com/`.

## Usage

The extension automatically looks for a pull request using the currently checked out branch, and performs this check at the startup and on every branch change. A manual reload can be performed using the `Azure DevOps PR: Refresh` command from the command palette.

This extension leverages the Comment API of Visual Studio Code to display the comments in the editor. For now, only commenting on actual files is supported, the support for adding/viewing comments in the compare view is not implemented.

Supported operations:

- adding a thread on files under review. Click the `+` icon on the left of a row to add a new comment related to the selection in the row, then click on the `Comment` button to submit the new thread. Partial selections are supported.
- replying to comments, open a comment using the balloon icon on the left of the row, and add replies. Confirm using the `Reply` button. A shortcut button named `Reply and resolve` or `Reply and reopen` is also available.
- suggestions are also available. Simply select the code, then type in the comment the following text:

```text
```suggestion
Put here the new content
```

- updating the status of a thread, using the top-right icon pointing down in the comment editor.

All the comments can be viewed in the `COMMENTS` tab in the bottom part of the editor (where the terminal, output and other tabs are located). Visual Studio Code comes with built-in support for resolved/unresolved comments, this extension leverages the functionality by mapping the `Active` and `Pending` statuses of Azure Devops to `Unresolved` and all the other statuses to `Resolved`.

The pull request identifier is also displayed in the status bar. The identifier can be clicked to open the pull request in the browser. The icon is different according to the status of the pull request (draft or not).
