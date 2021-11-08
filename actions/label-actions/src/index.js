const core = require('@actions/core');
const github = require('@actions/github');

async function main() {
    const githubToken = core.getInput('github-token');

    if (!githubToken) {
        throw new Error('github-token is missing');
    }

    const client = github.getOctokit(githubToken);
    const payload = github.context.payload;

    // We only want to do something when a human labels an issue
    if (payload.sender.type === 'Bot') {
        core.warn('Ignoring event, detected a bot');
        return;
    }

    // We can only handle issue-related events right now
    if (!payload.issue) {
        core.warn('Ignoring event, detected a non-issue event');
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
