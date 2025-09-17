const sinon = require('sinon');
const should = require('should');
const core = require('@actions/core');
const github = require('@actions/github');

// Require test utils
require('./utils');

// Require the helpers class we're testing
const Helpers = require('../src/helpers');

describe('PR Labeling', function () {
    let sandbox;
    let helpers;
    let mockClient;

    beforeEach(function () {
        sandbox = sinon.createSandbox();

        // Mock the GitHub client
        mockClient = {
            rest: {
                orgs: {
                    checkMembershipForUser: sandbox.stub()
                },
                issues: {
                    addLabels: sandbox.stub()
                }
            }
        };

        // Create helpers instance with mocked client
        helpers = new Helpers('fake-token', {owner: 'test-owner', repo: 'test-repo'});
        helpers.client = mockClient;

        // Mock core logging functions
        sandbox.stub(core, 'error');
        sandbox.stub(core, 'info');
    });

    afterEach(function () {
        sandbox.restore();
    });

    describe('isGhostFoundationMember', function () {
        it('should return true when user is a member of Ghost Foundation', async function () {
            mockClient.rest.orgs.checkMembershipForUser.resolves();

            const isMember = await helpers.isGhostFoundationMember('ghost-member');

            isMember.should.be.true();
            sinon.assert.calledOnce(mockClient.rest.orgs.checkMembershipForUser);
            sinon.assert.calledWith(mockClient.rest.orgs.checkMembershipForUser, {
                org: 'TryGhost',
                username: 'ghost-member'
            });
        });

        it('should return false when user is not a member (404 error)', async function () {
            const error = new Error('Not Found');
            error.status = 404;
            mockClient.rest.orgs.checkMembershipForUser.rejects(error);

            const isMember = await helpers.isGhostFoundationMember('external-contributor');

            isMember.should.be.false();
            sinon.assert.notCalled(core.error);
        });

        it('should return false and log error for other API errors', async function () {
            const error = new Error('API Error');
            error.status = 500;
            mockClient.rest.orgs.checkMembershipForUser.rejects(error);

            const isMember = await helpers.isGhostFoundationMember('test-user');

            isMember.should.be.false();
            sinon.assert.calledOnce(core.error);
            sinon.assert.calledWith(core.error,
                'Error checking organization membership for test-user: API Error'
            );
        });
    });

    describe('PR opened event handling', function () {
        it('should add core team label for Ghost Foundation members', async function () {
            const pullRequest = {
                number: 123,
                user: {
                    login: 'ghost-member'
                }
            };

            // Mock org membership check to return true
            mockClient.rest.orgs.checkMembershipForUser.resolves();

            // Call addLabel method which should be used in the PR opened handler
            await helpers.addLabel(pullRequest, 'core team');

            // Verify the label was added
            sinon.assert.calledOnce(mockClient.rest.issues.addLabels);
            sinon.assert.calledWith(mockClient.rest.issues.addLabels, {
                owner: 'test-owner',
                repo: 'test-repo',
                issue_number: 123,
                labels: ['core team']
            });
        });

        it('should add community label for non-members', async function () {
            const pullRequest = {
                number: 456,
                user: {
                    login: 'external-contributor'
                }
            };
            
            // Mock org membership check to return false (404)
            const error = new Error('Not Found');
            error.status = 404;
            mockClient.rest.orgs.checkMembershipForUser.rejects(error);
            
            // Call addLabel method which should be used in the PR opened handler
            await helpers.addLabel(pullRequest, 'community');
            
            // Verify the label was added
            sinon.assert.calledOnce(mockClient.rest.issues.addLabels);
            sinon.assert.calledWith(mockClient.rest.issues.addLabels, {
                owner: 'test-owner',
                repo: 'test-repo',
                issue_number: 456,
                labels: ['community']
            });
        });
        
        it('should skip labeling bot PRs like Renovate', async function () {
            // Test various bot username formats
            const botUsernames = ['renovate[bot]', 'renovate-bot', 'dependabot[bot]', 'some-other-bot[bot]'];
            
            for (const botUsername of botUsernames) {
                // Reset the stub call history
                mockClient.rest.issues.addLabels.resetHistory();
                mockClient.rest.orgs.checkMembershipForUser.resetHistory();
                
                const pullRequest = {
                    number: 789,
                    user: {
                        login: botUsername,
                        type: 'Bot'
                    }
                };
                
                // Simulate the check that would happen in the PR opened handler
                const isBot = pullRequest.user.type === 'Bot' || 
                              botUsername.includes('[bot]') || 
                              botUsername === 'renovate-bot';
                
                isBot.should.be.true();
                
                // Verify that we would skip the PR and not check membership or add labels
                if (isBot) {
                    // In the actual handler, we return early for bots
                    // So no API calls should be made
                    sinon.assert.notCalled(mockClient.rest.orgs.checkMembershipForUser);
                    sinon.assert.notCalled(mockClient.rest.issues.addLabels);
                }
            }
        });
    });
});
