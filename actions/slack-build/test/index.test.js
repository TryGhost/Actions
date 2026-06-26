const assert = require('assert/strict');

const {
    buildSlackMessage,
    getWebhookFactory,
    getStatusColor,
    run
} = require('../index');

describe('slack-build', function () {
    const env = {
        GITHUB_ACTOR: 'rob-ghost',
        GITHUB_REF: 'refs/heads/main',
        GITHUB_REPOSITORY: 'TryGhost/Actions',
        GITHUB_RUN_ID: '12345',
        GITHUB_SHA: 'abcdef1234567890',
        SLACK_WEBHOOK_URL: 'https://hooks.slack.test/example'
    };

    it('maps build statuses to Slack attachment colors', function () {
        assert.equal(getStatusColor('success'), 'good');
        assert.equal(getStatusColor('cancelled'), 'warning');
        assert.equal(getStatusColor('failure'), 'danger');
    });

    it('builds the Slack notification from the GitHub Actions environment', function () {
        const message = buildSlackMessage('failure', env);

        assert.deepEqual(message, {
            attachments: [{
                color: 'danger',
                text: 'Test failure at <https://github.com/TryGhost/Actions/commit/abcdef1234567890|abcdef1234> on `main` of <https://github.com/TryGhost/Actions|TryGhost/Actions> by <@U09E99K63JN> - <https://github.com/TryGhost/Actions/actions/runs/12345/|view>'
            }]
        });
    });

    it('falls back to raw actor and unknown GitHub metadata', function () {
        const message = buildSlackMessage('success', {
            GITHUB_ACTOR: 'external-user',
            GITHUB_REPOSITORY: 'TryGhost/Actions',
            GITHUB_RUN_ID: '67890'
        });

        assert.equal(message.attachments[0].color, 'good');
        assert.equal(
            message.attachments[0].text,
            'Test success at <https://github.com/TryGhost/Actions/commit/unknown|unknown> on `unknown` of <https://github.com/TryGhost/Actions|TryGhost/Actions> by external-user - <https://github.com/TryGhost/Actions/actions/runs/67890/|view>'
        );
    });

    it('sends the requested status to the configured webhook', async function () {
        const sentMessages = [];
        const core = {
            getInput(name, options) {
                assert.equal(name, 'status');
                assert.deepEqual(options, {required: true});

                return 'cancelled';
            }
        };

        await run({
            core,
            env,
            webhookFactory(url) {
                assert.equal(url, env.SLACK_WEBHOOK_URL);

                return {
                    async send(message) {
                        sentMessages.push(message);
                    }
                };
            }
        });

        assert.equal(sentMessages.length, 1);
        assert.equal(sentMessages[0].attachments[0].color, 'warning');
        assert.match(sentMessages[0].attachments[0].text, /Test cancelled at/);
    });

    it('loads core and creates a webhook when overrides are not supplied', async function () {
        const sentMessages = [];

        class TestWebhook {
            constructor(url) {
                assert.equal(url, env.SLACK_WEBHOOK_URL);
            }

            async send(message) {
                sentMessages.push(message);
            }
        }

        await run({
            env,
            IncomingWebhook: TestWebhook,
            async getCore() {
                return {
                    getInput() {
                        return 'failure';
                    }
                };
            }
        });

        assert.equal(sentMessages.length, 1);
        assert.equal(sentMessages[0].attachments[0].color, 'danger');
    });

    it('creates webhook instances through the default factory path', function () {
        class TestWebhook {
            constructor(url) {
                this.url = url;
            }
        }

        const webhookFactory = getWebhookFactory({IncomingWebhook: TestWebhook});
        const webhook = webhookFactory(env.SLACK_WEBHOOK_URL);

        assert.equal(webhook.url, env.SLACK_WEBHOOK_URL);
    });
});
