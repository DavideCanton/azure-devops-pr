import * as vsc from "vscode";
import { ExtensionController } from "./controller";

const extensionController = new ExtensionController();

export function activate(context: vsc.ExtensionContext)
{
    extensionController.activate(context);
}

export function deactivate()
{
    extensionController.deactivate();
}

// TODO reset comments when switching branch (how?)
// click on status bar could refresh (with a button) and go to PR
// filter out unused threads (by status?)