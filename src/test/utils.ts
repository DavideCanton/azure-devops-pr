import * as sinon from 'sinon';
import * as vscode from 'vscode';

function get(...path: string[]) {
    let cur: any = vscode;
    for (const p of path) {
        cur = cur[p];
    }
    return cur;
}

function set(v: any, ...path: string[]) {
    let cur: any = vscode;
    for (const p of path.slice(0, -1)) {
        cur = cur[p];
    }
    cur[path[path.length - 1]] = v;
}

export function mockVscodeApi(...path: string[]) {
    const stub = sinon.stub();
    let old: any;

    setup(() => {
        old = get(...path);
        set(stub, ...path);
    });

    teardown(() => {
        set(old, ...path);
    });

    return stub;
}

export function parametrize(
    values: any[],
    descFn: (v: any) => string,
    body: (v: any) => void,
) {
    for (const val of values) {
        test(descFn(val), () => {
            body(val);
        });
    }
}
