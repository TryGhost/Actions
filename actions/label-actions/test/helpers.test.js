const core = require('@actions/core');
const github = require('@actions/github');

require('./utils');

const Helpers = require('../src/helpers');

describe('Helpers', function () {
    let sandbox;
    let helpers;
    let mockClient;

    beforeEach(function () {
        sandbox = sinon.createSandbox();

        mockClient = {
            graphql: sandbox.stub(),
            rest: {
                repos: {
                    getCollaboratorPermissionLevel: sandbox.stub()
                },
                pulls: {
                    list: sandbox.stub(),
                    listFiles: sandbox.stub()
                },
                issues: {
                    listForRepo: sandbox.stub(),
                    listEventsForTimeline: sandbox.stub(),
                    listLabelsOnIssue: sandbox.stub(),
                    createComment: sandbox.stub(),
                    update: sandbox.stub(),
                    addLabels: sandbox.stub(),
                    removeLabel: sandbox.stub()
                }
            }
        };

        sandbox.stub(github, 'getOctokit').returns(mockClient);
        sandbox.stub(core, 'info');
        sandbox.stub(core, 'error');

        helpers = new Helpers('fake-token', {owner: 'test-owner', repo: 'test-repo'});
    });

    afterEach(function () {
        sandbox.restore();
    });

    it('enables PR auto merge via GraphQL', async function () {
        await helpers.enablePRAutoMerge({node_id: 'pr-node-id'});

        sinon.assert.calledOnce(mockClient.graphql);
        sinon.assert.calledWithMatch(
            mockClient.graphql,
            sinon.match(/enablePullRequestAutoMerge/),
            {pullRequestId: 'pr-node-id'}
        );
    });

    it('treats missing comments as pending on internal', function () {
        helpers.isPendingOnInternal([], {created_at: '2026-03-17T00:00:00.000Z'}).should.be.true();
    });

    it('treats Ghost-Slimer replies on needs:triage as pending on internal', function () {
        const existingTimelineEvents = [{
            event: 'commented',
            created_at: '2026-03-18T00:00:00.000Z',
            actor: {
                login: 'Ghost-Slimer',
                type: 'Bot'
            }
        }];

        const labelEvent = {
            created_at: '2026-03-17T00:00:00.000Z',
            label: {
                name: 'needs:triage'
            }
        };

        helpers.isPendingOnInternal(existingTimelineEvents, labelEvent).should.be.true();
    });

    it('detects newer bot comments from non-triagers as pending on internal', function () {
        const existingTimelineEvents = [{
            event: 'commented',
            created_at: '2026-03-18T00:00:00.000Z',
            actor: {
                login: 'helpful-bot',
                type: 'Bot'
            }
        }];

        const labelEvent = {
            created_at: '2026-03-17T00:00:00.000Z',
            label: {
                name: 'bug'
            }
        };

        helpers.isPendingOnInternal(existingTimelineEvents, labelEvent).should.be.true();
    });

    it('does not mark human comments as pending on internal', function () {
        const existingTimelineEvents = [{
            event: 'commented',
            created_at: '2026-03-18T00:00:00.000Z',
            actor: {
                login: 'person',
                type: 'User'
            }
        }];

        const labelEvent = {
            created_at: '2026-03-17T00:00:00.000Z',
            label: {
                name: 'bug'
            }
        };

        helpers.isPendingOnInternal(existingTimelineEvents, labelEvent).should.be.false();
    });

    it('checks whether dates are older than the requested number of weeks', function () {
        helpers.isOlderThanXWeeks(new Date(Date.now() - (15 * 24 * 60 * 60 * 1000)), 2).should.be.true();
        helpers.isOlderThanXWeeks(new Date(Date.now() - (3 * 24 * 60 * 60 * 1000)), 2).should.be.false();
    });

    it('adds an issue to a project and applies option fields', async function () {
        mockClient.graphql.onFirstCall().resolves({
            addProjectV2ItemById: {
                item: {
                    id: 'project-item-id'
                }
            }
        });
        mockClient.graphql.onSecondCall().resolves({});
        mockClient.graphql.onThirdCall().resolves({});

        await helpers.addIssueToProject(
            {node_id: 'issue-node-id'},
            'project-id',
            {
                fieldA: 'option-1',
                fieldB: 'option-2'
            }
        );

        sinon.assert.callCount(mockClient.graphql, 3);
        sinon.assert.calledWithMatch(
            mockClient.graphql.firstCall,
            sinon.match(/addProjectV2ItemById/),
            {projectId: 'project-id', issueId: 'issue-node-id'}
        );
        sinon.assert.calledWithMatch(
            mockClient.graphql.secondCall,
            sinon.match(/updateProjectV2ItemFieldValue/),
            {projectId: 'project-id', itemId: 'project-item-id', fieldId: 'fieldA', optionId: 'option-1'}
        );
        sinon.assert.calledWithMatch(
            mockClient.graphql.thirdCall,
            sinon.match(/updateProjectV2ItemFieldValue/),
            {projectId: 'project-id', itemId: 'project-item-id', fieldId: 'fieldB', optionId: 'option-2'}
        );
    });

    it('skips project option updates when no project item is returned', async function () {
        mockClient.graphql.resolves({
            addProjectV2ItemById: {
                item: null
            }
        });

        await helpers.addIssueToProject({node_id: 'issue-node-id'}, 'project-id', {fieldA: 'option-1'});

        sinon.assert.calledOnce(mockClient.graphql);
    });

    it('removes needs triage when the label exists in the timeline', async function () {
        sandbox.stub(helpers, 'listTimelineEvents').resolves([
            {event: 'commented'},
            {event: 'labeled', label: {name: 'needs:triage'}}
        ]);
        const removeNeedsTriageLabel = sandbox.stub(helpers, 'removeNeedsTriageLabel').resolves();

        await helpers.removeNeedsTriageLabelIfOlder({number: 123});

        sinon.assert.calledOnce(removeNeedsTriageLabel);
    });

    it('does not remove needs triage when the label is absent from the timeline', async function () {
        sandbox.stub(helpers, 'listTimelineEvents').resolves([{event: 'commented'}]);
        const removeNeedsTriageLabel = sandbox.stub(helpers, 'removeNeedsTriageLabel').resolves();

        await helpers.removeNeedsTriageLabelIfOlder({number: 123});

        sinon.assert.notCalled(removeNeedsTriageLabel);
    });

    it('lists open needs:info issues', async function () {
        mockClient.rest.issues.listForRepo.resolves({
            data: [{number: 1}]
        });

        const result = await helpers.listOpenNeedsInfoIssues();

        result.should.deepEqual([{number: 1}]);
        sinon.assert.calledWith(mockClient.rest.issues.listForRepo, {
            owner: 'test-owner',
            repo: 'test-repo',
            state: 'open',
            labels: 'needs:info'
        });
    });

    it('lists open pull requests', async function () {
        mockClient.rest.pulls.list.resolves({
            data: [{number: 2}]
        });

        const result = await helpers.listOpenPullRequests();

        result.should.deepEqual([{number: 2}]);
        sinon.assert.calledWith(mockClient.rest.pulls.list, {
            owner: 'test-owner',
            repo: 'test-repo',
            state: 'open'
        });
    });

    it('filters null timeline events and sorts newest first', async function () {
        mockClient.rest.issues.listEventsForTimeline.resolves({
            data: [
                {event: 'commented', created_at: '2026-03-16T00:00:00.000Z'},
                null,
                {event: 'labeled', created_at: '2026-03-17T00:00:00.000Z'}
            ]
        });

        const result = await helpers.listTimelineEvents({number: 321});

        result.should.deepEqual([
            {event: 'labeled', created_at: '2026-03-17T00:00:00.000Z'},
            {event: 'commented', created_at: '2026-03-16T00:00:00.000Z'}
        ]);
    });

    it('lists labels on an issue', async function () {
        mockClient.rest.issues.listLabelsOnIssue.resolves({
            data: [{name: 'bug'}]
        });

        const result = await helpers.listLabels({number: 22});

        result.should.deepEqual([{name: 'bug'}]);
        sinon.assert.calledWith(mockClient.rest.issues.listLabelsOnIssue, {
            owner: 'test-owner',
            repo: 'test-repo',
            issue_number: 22
        });
    });

    it('leaves a comment with issue author and replacement tokens applied', async function () {
        await helpers.leaveComment(
            {
                number: 9,
                user: {
                    login: 'author-name'
                }
            },
            'Hi {issue-author} from {repository-name}. TOKEN',
            {TOKEN: 'done'}
        );

        sinon.assert.calledWith(mockClient.rest.issues.createComment, {
            owner: 'test-owner',
            repo: 'test-repo',
            issue_number: 9,
            body: 'Hi author-name from test-owner/test-repo. done'
        });
    });

    it('closes an issue with the default state reason', async function () {
        await helpers.closeIssue({number: 18});

        sinon.assert.calledWith(mockClient.rest.issues.update, {
            owner: 'test-owner',
            repo: 'test-repo',
            issue_number: 18,
            state: 'closed',
            state_reason: 'completed'
        });
    });

    it('closes an issue with a custom state reason', async function () {
        await helpers.closeIssue({number: 19}, 'not_planned');

        sinon.assert.calledWithMatch(mockClient.rest.issues.update, {
            issue_number: 19,
            state_reason: 'not_planned'
        });
    });

    it('adds and removes issue labels', async function () {
        await helpers.addLabel({number: 11}, 'community');
        await helpers.removeLabel({number: 11}, 'needs:triage');

        sinon.assert.calledWith(mockClient.rest.issues.addLabels, {
            owner: 'test-owner',
            repo: 'test-repo',
            issue_number: 11,
            labels: ['community']
        });
        sinon.assert.calledWith(mockClient.rest.issues.removeLabel, {
            owner: 'test-owner',
            repo: 'test-repo',
            issue_number: 11,
            name: 'needs:triage'
        });
    });

    it('ignores missing needs:triage label removal errors', async function () {
        const removeLabel = sandbox.stub(helpers, 'removeLabel').rejects(new Error('missing label'));

        await helpers.removeNeedsTriageLabel({number: 44});

        sinon.assert.calledOnce(removeLabel);
    });

    it('returns PR files when the GitHub call succeeds', async function () {
        mockClient.rest.pulls.listFiles.resolves({
            data: [{filename: 'ghost/core/locales/en.json'}]
        });

        const files = await helpers.getPRFiles(99);

        files.should.deepEqual([{filename: 'ghost/core/locales/en.json'}]);
        sinon.assert.calledWith(mockClient.rest.pulls.listFiles, {
            owner: 'test-owner',
            repo: 'test-repo',
            pull_number: 99,
            per_page: 100
        });
    });

    it('returns an empty array and logs when fetching PR files fails', async function () {
        mockClient.rest.pulls.listFiles.rejects(new Error('boom'));

        const files = await helpers.getPRFiles(99);

        files.should.deepEqual([]);
        sinon.assert.calledWith(core.error, 'Error fetching PR files: boom');
    });

    it('detects locale changes from PR files', async function () {
        sandbox.stub(helpers, 'getPRFiles').resolves([
            {filename: 'ghost/core/locales/en.json'},
            {filename: 'package.json'}
        ]);

        (await helpers.containsLocaleChanges(50)).should.be.true();
    });

    it('returns false when no locale changes are present', async function () {
        sandbox.stub(helpers, 'getPRFiles').resolves([
            {filename: 'README.md'}
        ]);

        (await helpers.containsLocaleChanges(50)).should.be.false();
    });
});
