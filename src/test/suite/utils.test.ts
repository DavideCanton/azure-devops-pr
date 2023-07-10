import { expect } from 'chai';
import { buildUri } from '../../utils';
import { parametrize } from '../utils';

suite('Utils Test Suite', () => {
    parametrize(
        [true, false],
        slashes => `buildUri ${slashes ? 'with' : 'without'} slashes around`,
        slashes => {
            const first = slashes ? '/a' : 'a';
            const last = slashes ? 'e/' : 'e';
            expect(buildUri(first, '/b/', '/c', 'd/', last)).to.equal(
                'a/b/c/d/e',
            );
        },
    );
});
