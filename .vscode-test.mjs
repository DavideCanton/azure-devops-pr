import { defineConfig } from '@vscode/test-cli';
import * as fs from 'fs';

const testEntrypoint = 'out/tests.js';

// make test fail if file does not exist
if (!fs.existsSync(testEntrypoint)) {
    throw new Error('Test file not existing!');
}

export default defineConfig([
    {
        label: 'unitTests',
        files: testEntrypoint,
        mocha: {
            ui: 'tdd',
            timeout: 20000,
        },
    },
]);
