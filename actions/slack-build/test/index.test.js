const assert = require('assert/strict');

const {
    buildSlackMessage,
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

    it('uses process.env as the default GitHub Actions environment', function () {
        const originalEnv = {...process.env};

        process.env.GITHUB_ACTOR = env.GITHUB_ACTOR;
        process.env.GITHUB_REF = env.GITHUB_REF;
        process.env.GITHUB_REPOSITORY = env.GITHUB_REPOSITORY;
        process.env.GITHUB_RUN_ID = env.GITHUB_RUN_ID;
        process.env.GITHUB_SHA = env.GITHUB_SHA;

        try {
            const message = buildSlackMessage('success');

            assert.match(message.attachments[0].text, /TryGhost\/Actions/);
            assert.match(message.attachments[0].text, /abcdef1234/);
        } finally {
            process.env = originalEnv;
        }
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
            IncomingWebhook: class TestWebhook {
                constructor(url) {
                    assert.equal(url, env.SLACK_WEBHOOK_URL);
                }

                async send(message) {
                    sentMessages.push(message);
                }
            }
        });

        assert.equal(sentMessages.length, 1);
        assert.equal(sentMessages[0].attachments[0].color, 'warning');
        assert.match(sentMessages[0].attachments[0].text, /Test cancelled at/);
    });

    it('fails clearly when the webhook URL is missing', async function () {
        const core = {
            getInput() {
                return 'success';
            }
        };

        await assert.rejects(
            run({
                core,
                env: {
                    ...env,
                    SLACK_WEBHOOK_URL: ''
                }
            }),
            /SLACK_WEBHOOK_URL is required/
        );
    });

    it('fails clearly through the default options path when the webhook URL is missing', async function () {
        const originalWebhookUrl = process.env.SLACK_WEBHOOK_URL;

        delete process.env.SLACK_WEBHOOK_URL;

        try {
            await assert.rejects(run(), /SLACK_WEBHOOK_URL is required/);
        } finally {
            if (originalWebhookUrl === undefined) {
                delete process.env.SLACK_WEBHOOK_URL;
            } else {
                process.env.SLACK_WEBHOOK_URL = originalWebhookUrl;
            }
        }
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

    it('uses the default core loader path when a core object is supplied directly', async function () {
        const sentMessages = [];

        await run({
            core: {
                getInput() {
                    return 'success';
                }
            },
            env,
            IncomingWebhook: class TestWebhook {
                async send(message) {
                    sentMessages.push(message);
                }
            }
        });

        assert.equal(sentMessages.length, 1);
        assert.equal(sentMessages[0].attachments[0].color, 'good');
    });
});
