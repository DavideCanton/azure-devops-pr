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

    /**
     * Returns the organization URL by concatenating the Azure origin and organization name.
     *
     * @return {string} The organization URL.
     */
    get organizationUrl(): string {
        return buildUri(this.azureOrigin, this.organizationName);
    }

    /**
     * Builds a URI for a pull request URL based on the given pull request ID.
     *
     * @param {number} pullRequestId - The ID of the pull request.
     * @return {vsc.Uri} The URI for the pull request.
     */
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

    /**
     * Creates a new Configuration object from the given Settings object.
     *
     * @param {Settings} settings - The Settings object containing the configuration data.
     * @return {Configuration} The newly created `Configuration` object.
     */
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

/**
 * Retrieves the value of a specific key from a settings object.
 *
 * @param {Settings} settings - The settings object to retrieve the key from.
 * @param {S} name - The name of the key to retrieve.
 * @return {Settings[S]} The value of the specified key.
 * @throws {Error} If the key is missing in the settings object.
 */
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

/**
 * Manages the extension's configuration.
 *
 * Provides access to the current configuration and emits an event when the configuration changes.
 */
export class ConfigurationManager implements vsc.Disposable {
    _configuration: Configuration;
    private _configChanged = new vsc.EventEmitter<Configuration | null>();

    /**
     * The current configuration.
     */
    get configuration(): Configuration {
        return this._configuration;
    }

    /**
     * Activates the configuration manager.
     *
     * This method should be called when the extension is activated.
     */
    activate() {
        this._loadConfiguration();
    }

    /**
     * An event that is emitted when the configuration changes.
     *
     * The event will be fired with the new configuration, or `null` if the configuration could not be loaded.
     */
    get onConfigChanged(): vsc.Event<Configuration | null> {
        return this._configChanged.event;
    }

    /**
     * Emits a configuration change event.
     *
     * If the configuration change event affects the extension's configuration, the new configuration will be loaded and the
     * event will be fired with the new configuration. If the configuration could not be loaded, the event will be fired with
     * `null`.
     *
     * @param event The configuration change event.
     */
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

    /**
     * Disposes the configuration manager.
     */
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
