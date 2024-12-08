import * as vsc from 'vscode';
import { DisposableLike } from './utils';

export interface ILogger extends DisposableLike {
    log(msg: any): void;
    logException(error: Error): void;
}

export class Logger implements ILogger {
    private outChannel: vsc.OutputChannel;
    private disposed: boolean = false;

    constructor() {
        this.outChannel = vsc.window.createOutputChannel('Azure DevOps PR');
    }

    log(msg: any) {
        if (this.disposed) {
            throw new Error('Logger already disposed');
        }

        const date = new Date();
        this.outChannel.appendLine(
            `[${date.toLocaleDateString()} - ${date.toLocaleTimeString()}] ${msg}`,
        );
    }

    logException(error: Error) {
        if (this.disposed) {
            throw new Error('Logger already disposed');
        }

        this.log(error.message);
        if (error.stack) {
            this.outChannel.appendLine(error.stack);
        }
    }

    dispose(): void {
        this.outChannel.dispose();
        this.disposed = true;
    }
}

let _logger: ILogger | null = null;

export function logger(): ILogger {
    if (!_logger) {
        _logger = new Logger();
    }
    return _logger;
}
