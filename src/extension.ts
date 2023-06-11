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
