/* eslint-disable max-lines, no-restricted-syntax */

const core = require('@actions/core');
const github = require('@actions/github');

const Helpers = require('./helpers');
const comments = require('./comments');

async function main() {
    const githubToken = core.getInput('github-token');

    if (!githubToken) {
        throw new Error('github-token is missing');
    }

    const {payload} = github.context;
    const helpers = new Helpers(githubToken, github.context.repo);

    if (payload.schedule) {
        const openNeedsInfoIssues = await helpers.listOpenNeedsInfoIssues();
        for (const openIssue of openNeedsInfoIssues) {
            const existingTimelineEvents = await helpers.listTimelineEvents(openIssue);
            const needsInfoLabel = existingTimelineEvents.find(l => l.event === 'labeled' && l.label?.name === 'needs info');

            if (needsInfoLabel && helpers.isOlderThanXWeeks(needsInfoLabel.created_at, 2)) {
                if (helpers.isPendingOnInternal(existingTimelineEvents, needsInfoLabel)) {
                    continue;
                }

                await helpers.leaveComment(openIssue, comments.NO_UPDATE);
                await helpers.closeIssue(openIssue);
                continue;
            }
        }

        const openNeedsTriageIssues = await helpers.listOpenNeedsTriageIssues();
        for (const openIssue of openNeedsTriageIssues) {
            if (helpers.isTeamRepo()) {
                // Clean up any issues which have been added to a Project because they don't need triaging
                const projects = await helpers.getProjectsForIssue(openIssue);
                if (projects.length) {
                    await helpers.removeNeedsTriageLabel(openIssue);
                    continue;
                }
            }

            const existingTimelineEvents = await helpers.listTimelineEvents(openIssue);
            const needsTriageLabel = existingTimelineEvents.find(l => l.event === 'labeled' && l.label?.name === 'needs triage');

            if (needsTriageLabel && helpers.isOlderThanXWeeks(needsTriageLabel.created_at, 4)) {
                const issueAssignee = helpers.isTeamRepo() ? '55sketch' : (openIssue?.assignees?.[0]?.login || 'daniellockyer');
                await helpers.leaveComment(openIssue, comments.PING_ASSIGNEE, {'{issue-assignee}': issueAssignee});
                continue;
            }
        }

        const openPullRequests = await helpers.listOpenPullRequests();
        for (const openPullRequest of openPullRequests) {
            const existingTimelineEvents = await helpers.listTimelineEvents(openPullRequest);

            const needsInfoLabel = existingTimelineEvents.find(l => l.event === 'labeled' && l.label?.name === 'needs info');
            if (needsInfoLabel && helpers.isOlderThanXWeeks(needsInfoLabel.created_at, 4)) {
                if (helpers.isPendingOnInternal(existingTimelineEvents, needsInfoLabel)) {
                    continue;
                }

                await helpers.leaveComment(openPullRequest, comments.PR_NEEDS_INFO_CLOSED);
                await helpers.closeIssue(openPullRequest);
                continue;
            }

            const changesRequestedLabel = existingTimelineEvents.find(l => l.event === 'labeled' && l.label?.name === 'changes requested');
            if (changesRequestedLabel && helpers.isOlderThanXWeeks(changesRequestedLabel.created_at, 12)) {
                if (helpers.isPendingOnInternal(existingTimelineEvents, changesRequestedLabel)) {
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
    if (payload.sender?.type === 'Bot') {
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

            if (helpers.isTeamRepo()) {
                const INTERNAL_LABELS = ['technical-debt', 'priority-cleanup', 'minor-feature', 'next-major', 'wontfix', 'later'];
                const projectLabels = existingLabels.filter(l => l.name.startsWith('project:'));
                const similarLabels = existingLabels.filter(l => INTERNAL_LABELS.includes(l.name));
                if (projectLabels.length || similarLabels.length) {
                    // we already have a triaged label, so we don't need to add needs triage
                    return;
                }

                // Don't add `needs triage` for issues assigned to a project
                const projects = await helpers.getProjectsForIssue(issue);
                if (projects.length) {
                    return;
                }
            }

            // Ignore labelled issues from Ghost core team triagers on external repos
            if (!helpers.isTeamRepo() && Helpers.CORE_TEAM_TRIAGERS.includes(issue.user.login) && existingLabels.length > 0) {
                return;
            }

            if (!existingLabels.find(l => l.name === 'needs triage')) {
                await helpers.addLabel(issue, 'needs triage');
            }
            return;
        }

        if (payload.action === 'closed') {
            await helpers.removeNeedsTriageLabel(issue);
            return;
        }

        if (payload.action === 'labeled') {
            const label = payload.label;

            if (label.name === 'Ghost(Pro)') {
                await helpers.removeNeedsTriageLabel(issue);
                await helpers.leaveComment(issue, comments.GHOST_PRO);
                await helpers.closeIssue(issue);
            } else if (label.name === 'invalid security report') {
                await helpers.removeNeedsTriageLabel(issue);
                await helpers.leaveComment(issue, comments.INVALID_SECURITY_REPORT);
                await helpers.closeIssue(issue);
            } else if (label.name === 'support request') {
                await helpers.removeNeedsTriageLabel(issue);
                await helpers.leaveComment(issue, comments.SUPPORT_REQUEST);
                await helpers.closeIssue(issue);
            } else if (label.name === 'feature request') {
                await helpers.removeNeedsTriageLabel(issue);
                await helpers.leaveComment(issue, comments.FEATURE_REQUEST);
                await helpers.closeIssue(issue);
            } else if (label.name === 'needs template') {
                await helpers.removeNeedsTriageLabel(issue);
                await helpers.leaveComment(issue, comments.NEEDS_TEMPLATE);
                await helpers.closeIssue(issue);
            } else if (label.name === 'self hosting') {
                await helpers.removeNeedsTriageLabel(issue);
                await helpers.leaveComment(issue, comments.SELF_HOSTING);
                await helpers.closeIssue(issue);
            } else if (label.name === 'needs info') {
                await helpers.removeNeedsTriageLabel(issue);
                await helpers.leaveComment(issue, comments.NEEDS_INFO);
            } else if (label.name === 'bug') {
                // We have templates for bug reports in the Team repo, so we shouldn't
                // assume the issue has been triaged, so we shouldn't remove the label
                if (helpers.isTeamRepo()) {
                    return;
                }

                await helpers.removeNeedsTriageLabelIfOlder(issue);
            } else if (helpers.isTeamRepo()) {
                if (label.name === 'p0:critical') {
                    await helpers.leaveComment(issue, comments.TEAM_ISSUE_P0);
                    await helpers.removeNeedsTriageLabelIfOlder(issue);
                } else if (label.name === 'p1:priority') {
                    await helpers.leaveComment(issue, comments.TEAM_ISSUE_P1);
                    await helpers.removeNeedsTriageLabelIfOlder(issue);
                } else if (label.name === 'p2:major') {
                    await helpers.leaveComment(issue, comments.TEAM_ISSUE_P2);
                    await helpers.removeNeedsTriageLabelIfOlder(issue);
                } else if (label.name === 'oss') {
                    await helpers.leaveComment(issue, comments.TEAM_ISSUE_OSS);
                    await helpers.removeNeedsTriageLabelIfOlder(issue);
                }
            } else if (['community project', 'good first issue', 'help wanted'].includes(label.name)) {
                await helpers.removeNeedsTriageLabelIfOlder(issue);
            } else {
                core.info(`Encountered an unhandled label: ${label.name}`);
            }

            return;
        }
    }

    core.info(`Encountered an unhandled action - ${JSON.stringify(payload)}`);
}

(async () => {
    try {
        await main();
    } catch (err) {
        core.setFailed(err);
    }
})();
