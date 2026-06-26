const {IncomingWebhook} = require('@slack/webhook');

function getStatusColor(statusInput) {
    if (statusInput === 'cancelled') {
        return 'warning';
    }

    if (statusInput === 'failure') {
        return 'danger';
    }

    return 'good';
}

function buildSlackMessage(statusInput, env = process.env) {
    const githubRepo = env.GITHUB_REPOSITORY;
    const githubSha = env.GITHUB_SHA || 'unknown';
    const githubActor = env.GITHUB_ACTOR;
    const githubRef = env.GITHUB_REF || 'unknown';
    const githubRunId = env.GITHUB_RUN_ID;

    const commitUrl = `https://github.com/${githubRepo}/commit/${githubSha}`;
    const linkifiedGithubRepo = `<https://github.com/${githubRepo}|${githubRepo}>`;
    const linkifiedCommitUrl = `<${commitUrl}|${githubSha.substring(0, 10)}>`;
    const branchParts = githubRef.split('/');
    const branch = branchParts[branchParts.length - 1];

    const openLink = `<https://github.com/${githubRepo}/actions/runs/${githubRunId}/|view>`;

    let actorLink = githubActor;

    const githubActorToSlackId = {
        ErisDS: 'U02563SGY',
        'sam-lord': 'U017YUER0HL',
        JoeeGrigg: 'U02LNNXJKGA',
        aileen: 'U04D59TH6',
        peterzimon: 'U7L3K6GM7',
        allouis: 'UCCEPHM39',
        vershwal: 'U05N8BNBAQ3',
        mike182uk: 'U052YFMMJQL',
        cmraible: 'U04ETKA5E3D',
        minimaluminium: 'U019YHN4WSG',
        '9larsons': 'U04HMKJDA79',
        kevinansfield: 'U051KGJR2',
        sagzy: 'U04RLV7E6F8',
        EvanHahn: 'U0A7KLGCHEW',
        troyciesco: 'U090DT54Y4B',
        'rob-ghost': 'U09E99K63JN',
        jonatansberg: 'U099U6NCFCN',
    };

    if (githubActorToSlackId[githubActor]) {
        actorLink = `<@${githubActorToSlackId[githubActor]}>`;
    }

    return {
        attachments: [{
            color: getStatusColor(statusInput),
            text: `Test ${statusInput} at ${linkifiedCommitUrl} on \`${branch}\` of ${linkifiedGithubRepo} by ${actorLink} - ${openLink}`,
        }]
    };
}

async function getCore() {
    const coreModule = await import('@actions/core');

    return coreModule.default ?? coreModule;
}

function getWebhookFactory(options = {}) {
    if (options.webhookFactory) {
        return options.webhookFactory;
    }

    const Webhook = options.IncomingWebhook || IncomingWebhook;

    return url => new Webhook(url);
}

async function run(options = {}) {
    const env = options.env || process.env;
    const loadCore = options.getCore || getCore;
    const core = options.core || await loadCore();
    const webhookFactory = getWebhookFactory(options);
    const webhook = webhookFactory(env.SLACK_WEBHOOK_URL);
    const statusInput = core.getInput('status', {required: true});

    await webhook.send(buildSlackMessage(statusInput, env));
}

if (process.env.NODE_ENV !== 'testing') {
    run();
}

module.exports = {
    buildSlackMessage,
    getWebhookFactory,
    getStatusColor,
    run
};
