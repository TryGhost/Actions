const { IncomingWebhook } = require('@slack/webhook');
const url = process.env.SLACK_WEBHOOK_URL;
const webhook = new IncomingWebhook(url);


const githubRepo = process.env.GITHUB_REPOSITORY;
const githubActor = process.env.GITHUB_ACTOR;
const githubRunId = process.env.GITHUB_RUN_ID;

const linkifiedGithubRepo = `<https://github.com/${githubRepo}|${githubRepo}>`;

const openLink = `<https://github.com/${githubRepo}/actions/runs/${githubRunId}/|view>`;

(async () => {
  await webhook.send({
    attachments: [{
      color: 'warning',
      text: `Terraform drift detected of ${linkifiedGithubRepo} by ${githubActor} - ${openLink}`,
    }]
  });
})();
