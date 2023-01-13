/* eslint-disable max-lines, no-restricted-syntax */

const core = require('@actions/core');
const github = require('@actions/github');

const Helpers = require('./helpers');
const comments = require('./comments');

const CORE_TEAM_TRIAGERS = [
    'ErisDS',
    'daniellockyer'
];

async function main() {
    const githubToken = core.getInput('github-token');

    if (!githubToken) {
        throw new Error('github-token is missing');
    }

    const {payload} = github.context;
    const helpers = new Helpers(githubToken, github.context.repo);

    if (payload.schedule) {
        const openIssues = await helpers.listOpenLabeledIssues();
        for (const openIssue of openIssues) {
            const existingTimelineEvents = await helpers.listTimelineEvents(openIssue);

            const needsInfoLabel = existingTimelineEvents.find(l => l.event === 'labeled' && l.label?.name === 'needs info');
            if (needsInfoLabel && isOlderThanXWeeks(needsInfoLabel.created_at, 2)) {
                if (isPendingOnInternal(existingTimelineEvents, needsInfoLabel)) {
                    continue;
                }

                await helpers.leaveComment(openIssue, comments.NO_UPDATE);
                await helpers.closeIssue(openIssue);
                continue;
            }

            const needsTriageLabel = existingTimelineEvents.find(l => l.event === 'labeled' && l.label?.name === 'needs triage');
            if (needsTriageLabel && isOlderThanXWeeks(needsTriageLabel.created_at, 4)) {
                const issueAssignee = openIssue.assignees && openIssue.assignees[0] && openIssue.assignees[0].login || 'ErisDS';
                await helpers.leaveComment(openIssue, comments.PING_ASSIGNEE, {'{issue-assignee}': issueAssignee});
                continue;
            }
        }

        const openPullRequests = await helpers.listOpenPullRequests();
        for (const openPullRequest of openPullRequests) {
            const existingTimelineEvents = await helpers.listTimelineEvents(openPullRequest);

            const needsInfoLabel = existingTimelineEvents.find(l => l.event === 'labeled' && l.label?.name === 'needs info');
            if (needsInfoLabel && isOlderThanXWeeks(needsInfoLabel.created_at, 4)) {
                if (isPendingOnInternal(existingTimelineEvents, needsInfoLabel)) {
                    continue;
                }

                await helpers.leaveComment(openPullRequest, comments.PR_NEEDS_INFO_CLOSED);
                await helpers.closeIssue(openPullRequest);
                continue;
            }

            const changesRequestedLabel = existingTimelineEvents.find(l => l.event === 'labeled' && l.label?.name === 'changes requested');
            if (changesRequestedLabel && isOlderThanXWeeks(changesRequestedLabel.created_at, 12)) {
                if (isPendingOnInternal(existingTimelineEvents, changesRequestedLabel)) {
                    continue;
                }

                await helpers.leaveComment(openPullRequest, comments.PR_CHANGES_REQUESTED_CLOSED);
                await helpers.closeIssue(openPullRequest);
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
        if (payload.action === 'labeled') {
            const label = payload.label;

            switch (label.name) {
            case 'needs info':
                await helpers.leaveComment(payload.pull_request, comments.PR_NEEDS_INFO);
                break;
            case 'changes requested':
                await helpers.leaveComment(payload.pull_request, comments.PR_CHANGES_REQUESTED);
                break;
            default:
                core.info(`Encountered an unhandled label: ${label.name}`);
                break;
            }
            return;
        }
    }

    if (payload.issue) {
        const issue = payload.issue;

        if (payload.action === 'opened') {
            // If an issue is opened with a closeable label, we shouldn't
            // bother to add `needs triage`
            const CLOSEABLE_LABELS = ['support request', 'feature request'];
            const existingLabels = await helpers.listLabels(issue);

            const shouldIgnore = existingLabels.find(l => CLOSEABLE_LABELS.includes(l.name));
            if (shouldIgnore) {
                return;
            }

            // Ignore labelled issues from Ghost core team triagers
            if (CORE_TEAM_TRIAGERS.includes(issue.user.login) && existingLabels.length > 0) {
                return;
            }

            await helpers.addLabel(issue, 'needs triage');
            return;
        }

        if (payload.action === 'closed') {
            await helpers.removeNeedsTriageLabel(issue);
            return;
        }

        if (payload.action === 'labeled') {
            const label = payload.label;
            let existingTimelineEvents;
            let existingNeedsTriageLabel;

            switch (label.name) {
            case 'Ghost(Pro)':
                await helpers.removeNeedsTriageLabel(issue);
                await helpers.leaveComment(issue, comments.GHOST_PRO);
                await helpers.closeIssue(issue);
                break;
            case 'invalid security report':
                await helpers.removeNeedsTriageLabel(issue);
                await helpers.leaveComment(issue, comments.INVALID_SECURITY_REPORT);
                await helpers.closeIssue(issue);
                break;
            case 'support request':
                await helpers.removeNeedsTriageLabel(issue);
                await helpers.leaveComment(issue, comments.SUPPORT_REQUEST);
                await helpers.closeIssue(issue);
                break;
            case 'feature request':
                await helpers.removeNeedsTriageLabel(issue);
                await helpers.leaveComment(issue, comments.FEATURE_REQUEST);
                await helpers.closeIssue(issue);
                break;
            case 'needs template':
                await helpers.removeNeedsTriageLabel(issue);
                await helpers.leaveComment(issue, comments.NEEDS_TEMPLATE);
                await helpers.closeIssue(issue);
                break;
            case 'self hosting':
                await helpers.removeNeedsTriageLabel(issue);
                await helpers.leaveComment(issue, comments.SELF_HOSTING);
                await helpers.closeIssue(issue);
                break;
            case 'needs info':
                await helpers.removeNeedsTriageLabel(issue);
                await helpers.leaveComment(issue, comments.NEEDS_INFO);
                break;
            case 'bug':
                // We have templates for bug reports in the Team repo, so we shouldn't
                // assume the issue has been triaged, so we shouldn't remove the label
                if (helpers.isTeamRepo()) {
                    return;
                }
            case 'p0:critical':
                if (helpers.isTeamRepo() && label.name === 'p0:critical') {
                    await helpers.leaveComment(issue, comments.TEAM_ISSUE_P0);
                }
            case 'p1:priority':
                if (helpers.isTeamRepo() && label.name === 'p1:priority') {
                    await helpers.leaveComment(issue, comments.TEAM_ISSUE_P1);
                }
            case 'p2:major':
                if (helpers.isTeamRepo() && label.name === 'p2:major') {
                    await helpers.leaveComment(issue, comments.TEAM_ISSUE_P2);
                }
            case 'oss':
                if (helpers.isTeamRepo() && label.name === 'oss') {
                    await helpers.leaveComment(issue, comments.TEAM_ISSUE_OSS);
                }
            case 'community project':
            case 'good first issue':
            case 'help wanted':
                // check if the issue was opened with one of these labels AFTER we added `needs triage`
                // if so, we want to remove the `needs triage` label
                existingTimelineEvents = await helpers.listTimelineEvents(issue);
                existingNeedsTriageLabel = existingTimelineEvents.find(l => l.event === 'labeled' && l.label?.name === 'needs triage');

                if (existingNeedsTriageLabel) {
                    if (new Date(label.created_at) > new Date(existingNeedsTriageLabel.created_at)) {
                        await helpers.removeNeedsTriageLabel(issue);
                    }
                }

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

(async () => {
    try {
        await main();
    } catch (err) {
        core.setFailed(err);
    }
})();
