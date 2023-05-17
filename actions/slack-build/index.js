const {IncomingWebhook} = require('@slack/webhook');
const core = require('@actions/core');

const url = process.env.SLACK_WEBHOOK_URL;
const webhook = new IncomingWebhook(url);

const statusInput = core.getInput('status', {required: true});

let statusColor = 'good';

if (statusInput === 'cancelled') {
    statusColor = 'warning';
} else if (statusInput === 'failure') {
    statusColor = 'danger';
}

const githubRepo = process.env.GITHUB_REPOSITORY;
const githubSha = process.env.GITHUB_SHA || 'unknown';
const githubActor = process.env.GITHUB_ACTOR;
const githubRef = process.env.GITHUB_REF || 'unknown';
const githubRunId = process.env.GITHUB_RUN_ID;

const commitUrl = `https://github.com/${githubRepo}/commit/${githubSha}`;
const linkifiedGithubRepo = `<https://github.com/${githubRepo}|${githubRepo}>`;
const linkifiedCommitUrl = `<${commitUrl}|${githubSha.substring(0, 10)}>`;
const branchParts = githubRef.split('/');
const branch = branchParts[branchParts.length - 1];

const openLink = `<https://github.com/${githubRepo}/actions/runs/${githubRunId}/|view>`;

let actorLink = githubActor;

const githubActorToSlackId = {
    daniellockyer: 'URZENL0V7',
    'sam-lord': 'U017YUER0HL',
    JoeeGrigg: 'U02LNNXJKGA',

    aileen: 'U04D59TH6',
    peterzimon: 'U7L3K6GM7',

    SimonBackx: 'U033YGE89JN',
    'sanne-san': 'U019N6Y2PB2',
    allouis: 'UCCEPHM39',

    mike182uk: 'U052YFMMJQL',
    cmraible: 'U04ETKA5E3D',
    minimaluminium: 'U019YHN4WSG',
    rishabhgrg: 'UCB9U7X99',
    naz: 'UCBHY29PX',

    'binary-koan': 'U0556P426LF',
    lenabaidakova: 'U043VFG46HY',
    '9larsons': 'U04HMKJDA79',
    kevinansfield: 'U051KGJR2',
    sagzy: 'U04RLV7E6F8',
    ronaldlangeveld: 'U03MV5LH4F5',
    djordjevlais: 'U02KQRQH3GS',
};

if (githubActorToSlackId[githubActor]) {
    actorLink = `<@${githubActorToSlackId[githubActor]}>`;
}

(async () => {
    await webhook.send({
        attachments: [{
            color: statusColor,
            text: `Test ${statusInput} at ${linkifiedCommitUrl} on \`${branch}\` of ${linkifiedGithubRepo} by ${actorLink} - ${openLink}`,
        }]
    });
})();
