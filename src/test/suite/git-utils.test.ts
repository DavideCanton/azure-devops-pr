import { expect } from 'chai';
import { GitUtils } from '../../git-utils';
import which = require('which');
import * as sinon from 'sinon';
import * as vscode from 'vscode';
import { mockVscodeApi } from '../utils';
import { SimpleGit, simpleGit } from 'simple-git';
import * as path from 'path';
import { rimrafSync } from 'rimraf';

suite('GitUtils unit tests', () => {
    const getAPI = sinon.stub();
    const ext = mockVscodeApi('extensions', 'getExtension');
    const showWarning = mockVscodeApi('window', 'showWarningMessage');

    test('load lazy api', () => {
        const cl = setupUtils();
        expect((cl as any).api).to.be.null;
        getAPI.returns({ repositories: [{ rootUri: { fsPath: 'foo' } }] });

        cl.getRepoRoot();
        cl.getRepoRoot();

        checkOkApi(cl);
    });

    test('ext not available', () => {
        const cl = new GitUtils();
        ext.returns(null);
        cl.getRepoRoot();
        expect(showWarning.calledOnceWith('Git Extension not available!'));
        ext.returns(extRet());
        cl.getRepoRoot();
        checkOkApi(cl);
    });

    test('ext not active', () => {
        const cl = new GitUtils();
        ext.returns({ isActive: false });
        cl.getRepoRoot();
        expect(showWarning.calledOnceWith('Git Extension not active!'));
        ext.returns(extRet());
        cl.getRepoRoot();
        checkOkApi(cl);
    });

    test('get repo root', () => {
        const cl = setupUtils();
        getAPI.returns({
            repositories: [
                { rootUri: { fsPath: 'foo' } },
                { rootUri: { fsPath: 'bar' } },
            ],
        });

        expect(cl.getRepoRoot()).to.equal('foo');
    });

    test('get username', async () => {
        function makeRepo(userName: string) {
            const stub = sinon.stub();
            stub.returns(userName);
            return {
                getConfig: stub,
            };
        }

        const cl = setupUtils();
        const r1 = makeRepo('foo');
        const r2 = makeRepo('bar');
        getAPI.returns({ repositories: [r1, r2] });

        expect(await cl.getCurrentUsername()).to.equal('foo');
        expect(r1.getConfig.calledOnceWith('user.name'));
        expect(r2.getConfig.notCalled);
    });

    test('get username error config error', async () => {
        const cl = setupUtils();
        getAPI.returns({
            repositories: [
                {
                    getConfig: sinon.stub().throws('error'),
                },
            ],
        });

        expect(await cl.getCurrentUsername()).to.be.null;
    });

    test('get branch', () => {
        const cl = setupUtils();
        getAPI.returns({
            repositories: [
                { state: { HEAD: { name: 'foo' } } },
                { state: { HEAD: { name: 'bar' } } },
            ],
        });

        expect(cl.getCurrentBranch()).to.equal('foo');
    });

    test('get branch no name', () => {
        const cl = setupUtils();
        getAPI.returns({
            repositories: [{ state: { HEAD: { name: null } } }],
        });

        expect(cl.getCurrentBranch()).to.be.null;
    });

    function extRet() {
        return {
            isActive: true,
            exports: { getAPI },
        };
    }

    function setupUtils() {
        const cl = new GitUtils();
        ext.returns(extRet());
        return cl;
    }

    function checkOkApi(cl: GitUtils) {
        const api = (cl as any).api;
        expect(api).not.to.be.null;
        expect(getAPI.calledOnceWith(1));
        expect(showWarning.notCalled);
    }
});

suite('GitUtils integration tests', () => {
    let client: SimpleGit;
    let gitUtils: GitUtils;

    suiteSetup(async () => {
        const dir = path.resolve(__dirname, '../../../test-folders/git-tests');

        rimrafSync(path.join(dir, '.git'));
        client = simpleGit(dir);
        await client.init();
        await client.addConfig('user.name', 'test_user');
        await client.checkoutLocalBranch('branch1');

        await vscode.commands.executeCommand('vscode.openFolder', vscode.Uri.file(dir));
        gitUtils = new GitUtils();
    });

    test('get current branch', async () => {
        const resp = await client.branch();
        expect(resp.current).to.equal('branch1');
        expect(gitUtils.getCurrentBranch()).to.equal(resp.current);
    });
});
