import {
    ConfigurationChangeEvent,
    WorkspaceConfiguration,
    workspace,
    Event,
    EventEmitter,
    Disposable,
} from 'vscode';
import { EXT_ID } from './constants';
import { buildUri } from './utils';
import { log } from './logs';

/**
 * Settings object.
 */
interface Settings {
    /** The name of the organization. */
    'organization-name': string;
    /** The name of the project. */
    'project-name': string;
    /** The name of the repository. */
    'repository-name': string;
    /** The address of azure. Defaults to `https://dev.azure.com/`. */
    'azure-origin': string;
    /** The token used to access azure. Should have the role to read PR. */
    token: string;
}

export class Configuration {
    private constructor(
        /** The name of the organization. */
        public readonly organizationName: string,
        /** The name of the project. */
        public readonly projectName: string,
        /** The name of the repository. */
        public readonly repositoryName: string,
        /** The address of azure. Defaults to `https://dev.azure.com/`. */
        public readonly azureOrigin: string,
        /** The token used to access azure. Should have the role to read PR. */
        public readonly token: string,
    ) {}

    get organizationUrl(): string {
        return buildUri(this.azureOrigin, this.organizationName);
    }

    buildPullRequestId(pullRequestId: number): string {
        return buildUri(
            this.organizationUrl,
            this.projectName,
            '_git',
            this.repositoryName,
            'pullrequest',
            pullRequestId.toString(),
        );
    }

    static fromSettings(settings: Settings): Configuration {
        return new Configuration(
            requireKey(settings, 'organization-name'),
            requireKey(settings, 'project-name'),
            requireKey(settings, 'repository-name'),
            requireKey(settings, 'azure-origin'),
            requireKey(settings, 'token'),
        );
    }
}

function requireKey<S extends keyof Settings>(
    settings: Settings,
    name: S,
): Settings[S] {
    const value = settings[name];
    if (value) {
        return value;
    } else {
        throw new Error(
            `Missing property ${EXT_ID}."${name}" in configuration`,
        );
    }
}

export class ConfigurationManager implements Disposable {
    _configuration: Configuration;
    private _configChanged = new EventEmitter<Configuration>();

    get configuration(): Configuration {
        return this._configuration;
    }

    activate() {
        this._loadConfiguration();
    }

    get onConfigChanged(): Event<Configuration> {
        return this._configChanged.event;
    }

    emitChangedConfig(e: ConfigurationChangeEvent): void {
        if (e.affectsConfiguration('azure-devops-pr')) {
            log('Configuration changed, reloading...');
            this._loadConfiguration();
            this._configChanged.fire(this._configuration);
        }
    }

    dispose() {
        this._configChanged.dispose();
    }

    private _loadConfiguration() {
        const settings = workspace.getConfiguration(
            EXT_ID,
        ) as WorkspaceConfiguration & Settings;
        
        this._configuration = Configuration.fromSettings(settings);
        log('Configuration loaded');
    }
}
