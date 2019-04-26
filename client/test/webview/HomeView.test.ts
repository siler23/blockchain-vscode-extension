/*
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
*/
'use strict';
// tslint:disable no-unused-expression

import * as vscode from 'vscode';
import * as sinon from 'sinon';
import * as chai from 'chai';
import * as sinonChai from 'sinon-chai';
import * as path from 'path';
import { HomeView } from '../../src/webview/HomeView';
import { View } from '../../src/webview/View';
import * as ejs from 'ejs';

const should: Chai.Should = chai.should();
chai.use(sinonChai);

describe('HomeView', () => {
    let mySandBox: sinon.SinonSandbox;

    let createWebviewPanelStub: sinon.SinonStub;
    let context: vscode.ExtensionContext;
    beforeEach(async () => {
        mySandBox = sinon.createSandbox();
        context = {
            extensionPath: '/some/path'
        } as vscode.ExtensionContext;

        createWebviewPanelStub = mySandBox.stub(vscode.window, 'createWebviewPanel');
        createWebviewPanelStub.returns({
            webview: {
                onDidReceiveMessage: mySandBox.stub(),
                html: '<html>HomePage</html>'
            },
            title: 'IBM Blockchain Platform Home',
            onDidDispose: mySandBox.stub(),
            reveal: (): void => { return; }
        });

        await vscode.workspace.getConfiguration().update('extension.home.showOnStartup', true, vscode.ConfigurationTarget.Global);

        View['openPanels'].splice(0, View['openPanels'].length);
    });

    afterEach(() => {
        mySandBox.restore();
    });

    it('should register and show home page', async () => {
        const homeView: HomeView = new HomeView(context);
        await homeView.openView(true);
        createWebviewPanelStub.should.have.been.called;
    });

    it('should reveal home page if already open', async () => {
        createWebviewPanelStub.returns({
            webview: {
                onDidReceiveMessage: mySandBox.stub(),
                html: ''
            },
            title: 'IBM Blockchain Platform Home',
            onDidDispose: mySandBox.stub(),
            reveal: (): void => { return; }
        });

        const homeView: HomeView = new HomeView(context);
        await homeView.openView(true);
        await homeView.openView(true);

        createWebviewPanelStub.should.have.been.calledOnce;

        should.equal(createWebviewPanelStub.getCall(1), null);
    });

    it('should dispose home page', async () => {
        const filterSpy: sinon.SinonSpy = mySandBox.spy(Array.prototype, 'filter');

        createWebviewPanelStub.returns({
            webview: {
                onDidReceiveMessage: mySandBox.stub(),
                html: ''
            },
            onDidDispose: mySandBox.stub().yields()
        });

        const homeView: HomeView = new HomeView(context);

        mySandBox.stub(homeView, 'getHTMLString').resolves('<html>HomePage</html>');
        await homeView.openView(true);

        createWebviewPanelStub.should.have.been.calledWith(
            'extensionHome',
            'IBM Blockchain Platform Home',
            vscode.ViewColumn.One,
            {
                enableScripts: true,
                retainContextWhenHidden: true,
                enableCommandUris: true,
                localResourceRoots: [
                    vscode.Uri.file(path.join(context.extensionPath, 'resources'))
                ]
            }
        );

        createWebviewPanelStub.should.have.been.calledOnce;

        filterSpy.getCall(1).thisValue[filterSpy.getCall(1).thisValue.length - 1].webview.html.should.equal('<html>HomePage</html>');
    });

    it('getHTMLString', async () => {
        const homeView: HomeView = new HomeView(context);

        const homePageHtml: string = await  homeView.getHTMLString();
        homePageHtml.should.contain(`<h3 class="sample-header">`);
        homePageHtml.should.contain(`<p class="sample-description">Basic sample based on cars`);
        homePageHtml.should.contain(`<p class="sample-description">Based on a real-world financial use-case, with multiple parties sharing a ledger.</p>`);
    });

    it('should throw error if not able to render file', async () => {
        const error: Error = new Error('error happened');
        mySandBox.stub(ejs, 'renderFile').yields(error);

        const homeView: HomeView = new HomeView(context);
        await homeView.openView(true).should.be.rejectedWith(error);
    });
});
