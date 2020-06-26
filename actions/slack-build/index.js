const { IncomingWebhook } = require('@slack/webhook');
const core = require('@actions/core');

const url = process.env.SLACK_WEBHOOK_URL;
const webhook = new IncomingWebhook(url);

const statusInput = core.getInput('status', { required: true });

let statusColor = 'good';

if (statusInput === 'cancelled') {
    statusColor = 'warning';
} else if (statusInput === 'failure') {
    statusColor = 'danger';
}

const githubRepo = process.env.GITHUB_REPOSITORY;
const githubSha = process.env.GITHUB_SHA;
const githubActor = process.env.GITHUB_ACTOR;

const commitUrl = `https://github.com/${githubRepo}/commit/${githubSha}`;
const linkifiedGithubRepo = `<https://github.com/${githubRepo}|${githubRepo}>`;
const linkifiedCommitUrl = `<${commitUrl}|${githubSha.substring(0, 10)}>`;

(async () => {
    await webhook.send({
        attachments: [{
            color: statusColor,
            text: `Build ${statusInput} at ${linkifiedCommitUrl} of ${linkifiedGithubRepo} by ${githubActor}`,
        }]
    });
})();
