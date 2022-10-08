/* eslint-disable max-lines, no-restricted-syntax */

const core = require('@actions/core');
const github = require('@actions/github');

const comments = require('./comments');

const CORE_TEAM_TRIAGERS = [
    'ErisDS',
    'daniellockyer'
];

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
    repo = github.context.repo;

    if (payload.schedule) {
        const openIssues = await helpers.listOpenLabeledIssues();
        for (const openIssue of openIssues) {
            issue = openIssue;

            const existingTimelineEvents = await helpers.listTimelineEvents();

            const needsInfoLabel = existingTimelineEvents.find(l => l.event === 'labeled' && l.label && l.label.name === 'needs info');
            if (needsInfoLabel && isOlderThanXWeeks(needsInfoLabel.created_at, 2)) {
                if (isPendingOnInternal(existingTimelineEvents, needsInfoLabel)) {
                    continue;
                }

                await helpers.leaveComment(comments.NO_UPDATE);
                await helpers.closeIssue();
                continue;
            }

            const needsTriageLabel = existingTimelineEvents.find(l => l.event === 'labeled' && l.label && l.label.name === 'needs triage');
            if (needsTriageLabel && isOlderThanXWeeks(needsTriageLabel.created_at, 4)) {
                const issueAssignee = openIssue.assignees && openIssue.assignees[0] && openIssue.assignees[0].login || 'ErisDS';
                await helpers.leaveComment(comments.PING_ASSIGNEE, {'{issue-assignee}': issueAssignee});
                continue;
            }
        }

        const openPullRequests = await helpers.listOpenPullRequests();
        for (const openPullRequest of openPullRequests) {
            issue = openPullRequest;

            const existingTimelineEvents = await helpers.listTimelineEvents();

            const needsInfoLabel = existingTimelineEvents.find(l => l.event === 'labeled' && l.label && l.label.name === 'needs info');
            if (needsInfoLabel && isOlderThanXWeeks(needsInfoLabel.created_at, 4)) {
                if (isPendingOnInternal(existingTimelineEvents, needsInfoLabel)) {
                    continue;
                }

                await helpers.leaveComment(comments.PR_NEEDS_INFO_CLOSED);
                await helpers.closeIssue();
                continue;
            }

            const changesRequestedLabel = existingTimelineEvents.find(l => l.event === 'labeled' && l.label && l.label.name === 'changes requested');
            if (changesRequestedLabel && isOlderThanXWeeks(changesRequestedLabel.created_at, 12)) {
                if (isPendingOnInternal(existingTimelineEvents, changesRequestedLabel)) {
                    continue;
                }

                await helpers.leaveComment(comments.PR_CHANGES_REQUESTED_CLOSED);
                await helpers.closeIssue();
                continue;
            }
        }

        return;
    }

    // We only want to do something when a human labels an issue
    if (payload.sender && payload.sender.type === 'Bot') {
        core.info('Ignoring event, detected a bot');
        return;
    }

    if (payload.pull_request) {
        issue = payload.pull_request;

        if (payload.action === 'labeled') {
            const label = payload.label;

            switch (label.name) {
            case 'needs info':
                await helpers.leaveComment(comments.PR_NEEDS_INFO);
                break;
            case 'changes requested':
                await helpers.leaveComment(comments.PR_CHANGES_REQUESTED);
                break;
            default:
                core.info(`Encountered an unhandled label: ${label.name}`);
                break;
            }
            return;
        }

        if (payload.action === 'closed' && issue.merged && false) {
            const ownerLogin = payload.pull_request.user.login;

            // Renovate PRs don't need comments
            if (ownerLogin === 'renovate[bot]') {
                return;
            }

            try {
                const isCollaboratorRequest = await client.request('GET /repos/{owner}/{repo}/collaborators/{username}', {
                    ...repo,
                    username: ownerLogin
                });

                // PR owner is a collaborator on the repo, so we shouldn't do anything
                if (isCollaboratorRequest.status === 200) {
                    return;
                }
            } catch (err) {
                if (err.status !== 404) {
                    throw err;
                }
            }

            await helpers.leaveComment(comments.PR_MERGED);
            return;
        }
    }

    if (payload.issue) {
        issue = payload.issue;

        if (payload.action === 'opened') {
            // If an issue is opened with a closeable label, we shouldn't
            // bother to add `needs triage`
            const CLOSEABLE_LABELS = ['support request', 'feature request'];
            const existingLabels = await helpers.listLabels();

            const shouldIgnore = existingLabels.find(l => CLOSEABLE_LABELS.includes(l.name));
            if (shouldIgnore) {
                return;
            }

            // Ignore labelled issues from Ghost core team triagers
            if (CORE_TEAM_TRIAGERS.includes(issue.user.login) && existingLabels.length > 0) {
                return;
            }

            await helpers.addLabel('needs triage');
            return;
        }

        if (payload.action === 'closed') {
            await helpers.removeNeedsTriageLabel();
            return;
        }

        if (payload.action === 'labeled') {
            const label = payload.label;
            let existingTimelineEvents;
            let existingNeedsTriageLabel;

            switch (label.name) {
            case 'Ghost(Pro)':
                await helpers.removeNeedsTriageLabel();
                await helpers.leaveComment(comments.GHOST_PRO);
                await helpers.closeIssue();
                break;
            case 'invalid security report':
                await helpers.removeNeedsTriageLabel();
                await helpers.leaveComment(comments.INVALID_SECURITY_REPORT);
                await helpers.closeIssue();
                break;
            case 'support request':
                await helpers.removeNeedsTriageLabel();
                await helpers.leaveComment(comments.SUPPORT_REQUEST);
                await helpers.closeIssue();
                break;
            case 'feature request':
                await helpers.removeNeedsTriageLabel();
                await helpers.leaveComment(comments.FEATURE_REQUEST);
                await helpers.closeIssue();
                break;
            case 'needs template':
                await helpers.removeNeedsTriageLabel();
                await helpers.leaveComment(comments.NEEDS_TEMPLATE);
                await helpers.closeIssue();
                break;
            case 'self hosting':
                await helpers.removeNeedsTriageLabel();
                await helpers.leaveComment(comments.SELF_HOSTING);
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
                existingTimelineEvents = await helpers.listTimelineEvents();
                existingNeedsTriageLabel = existingTimelineEvents.find((l) => {
                    return l.event === 'labeled' && l.label && l.label.name === 'needs triage';
                });

                // check if the issue was opened with one of these labels BEFORE we added `needs triage`
                // if so, we don't want to remove the `needs triage` label
                if (existingNeedsTriageLabel && new Date(label.created_at) < new Date(existingNeedsTriageLabel.created_at)) {
                    return;
                }

                await helpers.removeNeedsTriageLabel();
                break;
            default:
                core.info(`Encountered an unhandled label: ${label.name}`);
                break;
            }
            return;
        }
    }

    core.info(`Encountered an unhandled action - ${JSON.stringify(payload)}`);
}

/**
 * @param {Object} existingTimelineEvents
 * @param {Object} label
 */
function isPendingOnInternal(existingTimelineEvents, label) {
    const lastComment = existingTimelineEvents.find(l => l.event === 'commented');

    return (lastComment // we have a comment in the timeline events
        && new Date(lastComment.created_at) > new Date(label.created_at) // that comment is newer than the label
        && lastComment.actor.type !== 'Bot' // the comment was not by a bot
        && !CORE_TEAM_TRIAGERS.includes(lastComment.actor.login) // the comment was not by the Core team triagers
    );
}

/**
 * @param {Date} date
 * @param {number} weeks
 */
function isOlderThanXWeeks(date, weeks) {
    const oneWeek = 7 * 24 * 60 * 60 * 1000;
    return (Date.now() - new Date(date).getTime()) > (weeks * oneWeek);
}

const helpers = {
    /**
     * @returns {Promise<Array>}
     */
    listOpenLabeledIssues: async function () {
        const {data: needsTriageIssues} = await client.rest.issues.listForRepo({
            ...repo,
            state: 'open',
            labels: 'needs triage'
        });
        const {data: needsInfoIssues} = await client.rest.issues.listForRepo({
            ...repo,
            state: 'open',
            labels: 'needs info'
        });

        const combinedIssues = needsTriageIssues
            .concat(needsInfoIssues)
            .filter((thing, index, self) => index === self.findIndex(t => t.id === thing.id));

        return combinedIssues;
    },

    /**
     * @returns {Promise<Array>}
     */
    listOpenPullRequests: async function () {
        const {data: needsInfoPullRequests} = await client.rest.pulls.list({
            ...repo,
            state: 'open'
        });

        return needsInfoPullRequests;
    },

    /**
     * @returns {Promise<Array>}
     */
    listTimelineEvents: async function () {
        const {data: events} = await client.rest.issues.listEventsForTimeline({
            ...repo,
            issue_number: issue.number,
            per_page: 100
        });

        events.reverse();

        return events;
    },

    /**
     * @returns {Promise<Array>}
     */
    listLabels: async function () {
        const {data: labels} = await client.rest.issues.listLabelsOnIssue({
            ...repo,
            issue_number: issue.number
        });
        return labels;
    },

    /**
     * @param {String} body
     */
    leaveComment: async function (body, replacements = {}) {
        if (issue.user) {
            body = body.replace(/{issue-author}/, issue.user.login);
        }

        body = body.replace(/{repository-name}/, `${repo.owner}/${repo.repo}`);

        if (replacements) {
            for (const r in replacements) {
                body = body.replace(r, replacements[r]);
            }
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
    addLabel: async function (name) {
        await client.rest.issues.addLabels({
            ...repo,
            issue_number: issue.number,
            labels: [name]
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
