import * as vsc from "vscode";

const _OUT_CHANNEL = vsc.window.createOutputChannel("Azure DevOps PR");

export function log(msg: string)
{
    const date = new Date();
    _OUT_CHANNEL.appendLine(
        `[${date.toLocaleDateString()} - ${date.toLocaleTimeString()}] ${msg}`
    );
}

export function logException(error: Error)
{
    log(error.message);
    if(error.stack)
        _OUT_CHANNEL.appendLine(error.stack);
}
