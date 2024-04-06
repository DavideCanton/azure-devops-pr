import * as assert from 'assert';

import { buildUri } from '../../utils';

suite('Build uri', () => {
    test('Sample test2', () => {
        assert.equal(buildUri('a', 'b'), 'a/b');
    });
});
