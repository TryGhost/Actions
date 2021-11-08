const core = require('@actions/core');
const github = require('@actions/github');

async function main() {
    const githubToken = core.getInput('github-token');

    if (!githubToken) {
        throw new Error('github-token is missing');
    }

    const client = github.getOctokit(githubToken);
    const {payload, repo} = github.context;

    // We only want to do something when a human labels an issue
    if (payload.sender.type === 'Bot') {
        core.info('Ignoring event, detected a bot');
        return;
    }

    // We can only handle issue-related events right now
    if (!payload.issue) {
        core.info('Ignoring event, detected a non-issue event');
        return;
    }

    const issue = payload.issue;

    if (payload.action === 'opened') {
        await client.rest.issues.addLabels({
            ...repo,
            issue_number: issue.number,
            labels: ['needs triage']
        });
        return;
    }

    core.info(JSON.stringify(payload));
}

(async () => {
    try {
        await main();
    } catch (err) {
        core.setFailed(err);
    }
})();
