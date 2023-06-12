import * as assert from 'assert';
import { buildUri } from '../../utils';

suite('Utils Test Suite', () =>
{
    for(const slashes of [true, false])
    {
        test(`buildUri ${slashes ? 'with' : 'without'} slashes around`, () =>
        {
            const first = slashes ? '/a' : "a";
            const last = slashes ? 'e/' : "e";
            assert.strictEqual(buildUri(first, "/b/", "/c", "d/", last), 'a/b/c/d/e');
        });
    }

});
