const core = require('@actions/core');
const github = require('@actions/github');

const comments = require('./comments');

// These are used enough that it's easier to keep them here
let client;
let repo;
let issue;

async function main() {
    const githubToken = core.getInput('github-token');

    if (!githubToken) {
        throw new Error('github-token is missing');
    }

    client = github.getOctokit(githubToken);
    const {payload} = github.context;

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

    repo = github.context.repo;
    issue = payload.issue;

    if (payload.action === 'opened') {
        await client.rest.issues.addLabels({
            ...repo,
            issue_number: issue.number,
            labels: ['needs triage']
        });
        return;
    }

    if (payload.action === 'labeled') {
        const label = payload.label;

        switch (label.name) {
            case 'support-request':
                await helpers.removeNeedsTriageLabel();
                await helpers.leaveComment(comments.SUPPORT_REQUEST);
                await helpers.closeIssue();
                break;
            case 'feature-request':
                await helpers.removeNeedsTriageLabel();
                await helpers.leaveComment(comments.FEATURE_REQUEST);
                await helpers.closeIssue();
                break;
            case 'needs info':
                await helpers.removeNeedsTriageLabel();
                await helpers.leaveComment(comments.NEEDS_INFO);
                break;
            case 'bug':
            case 'p0':
            case 'p1':
            case 'p2':
            case 'community project':
            case 'good first issue':
            case 'help wanted':
                await helpers.removeNeedsTriageLabel();
                break;
            default:
                core.info(`Encountered an unhandled label: ${label.name}`);
                break;
        }
        return;
    }

    core.info(`Encountered an unhandled action - ${payload.action}`);
}

const helpers = {
    /**
     * @param {String} body
     */
    leaveComment: async function (body) {
        if (issue.user) {
            body = body.replace(/${issue-author}/, issue.user.login);
        }

        await client.rest.issues.createComment({
            ...repo,
            issue_number: issue.number,
            body
        });
    },

    closeIssue: async function () {
        await client.rest.issues.update({
            ...repo,
            issue_number: issue.number,
            state: 'closed'
        });
    },

    /**
     * @param {String} name
     */
    removeLabel: async function (name) {
        await client.rest.issues.removeLabel({
            ...repo,
            issue_number: issue.number,
            name
        });
    },

    removeNeedsTriageLabel: async function () {
        try {
            await helpers.removeLabel('needs triage');
        } catch (err) {
            // It might not exist, that's ok for now.
        }
    }
};

(async () => {
    try {
        await main();
    } catch (err) {
        core.setFailed(err);
    }
})();
