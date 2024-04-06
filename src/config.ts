import * as vsc from 'vscode';
import { EXT_ID } from './constants';
import { log, logException } from './logs';
import { buildUri } from './utils';

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

    buildPullRequestUrl(pullRequestId: number): vsc.Uri {
        return vsc.Uri.parse(
            buildUri(
                this.organizationUrl,
                this.projectName,
                '_git',
                this.repositoryName,
                'pullrequest',
                pullRequestId.toString(),
            ),
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

export class ConfigurationManager implements vsc.Disposable {
    _configuration: Configuration;
    private _configChanged = new vsc.EventEmitter<Configuration | null>();

    get configuration(): Configuration {
        return this._configuration;
    }

    activate() {
        this._loadConfiguration();
    }

    get onConfigChanged(): vsc.Event<Configuration | null> {
        return this._configChanged.event;
    }

    emitChangedConfig(event: vsc.ConfigurationChangeEvent): void {
        if (event.affectsConfiguration(EXT_ID)) {
            log('Configuration changed, reloading...');
            try {
                this._loadConfiguration();
                this._configChanged.fire(this._configuration);
            } catch (e) {
                logException(e as Error);
                this._configChanged.fire(null);
            }
        }
    }

    dispose() {
        this._configChanged.dispose();
    }

    private _loadConfiguration() {
        const settings = vsc.workspace.getConfiguration(
            EXT_ID,
        ) as vsc.WorkspaceConfiguration & Settings;

        this._configuration = Configuration.fromSettings(settings);
        log('Configuration loaded');
    }
}
