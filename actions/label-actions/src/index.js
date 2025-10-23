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
            const needsInfoLabelEvent = existingTimelineEvents.find(l => l.event === 'labeled' && l.label?.name === 'needs:info');

            if (needsInfoLabelEvent && helpers.isOlderThanXWeeks(needsInfoLabelEvent.created_at, 2)) {
                if (helpers.isPendingOnInternal(existingTimelineEvents, needsInfoLabelEvent)) {
                    continue;
                }

                await helpers.leaveComment(openIssue, comments.NO_UPDATE);
                await helpers.closeIssue(openIssue, 'not_planned');
                continue;
            }
        }

        const openPullRequests = await helpers.listOpenPullRequests();
        for (const openPullRequest of openPullRequests) {
            const existingTimelineEvents = await helpers.listTimelineEvents(openPullRequest);

            const needsInfoLabel = existingTimelineEvents.find(l => l.event === 'labeled' && l.label?.name === 'needs:info');
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

    if (payload.pull_request) {
        if (payload.action === 'opened') {
            const pullRequest = payload.pull_request;
            const author = pullRequest.user.login;
            core.info(`PR opened #${pullRequest.number} by ${author} (${pullRequest.state}, ${pullRequest.author_association})`);

            // Check if this is a dependency bot PR (e.g., Renovate, Dependabot)
            const isDependencyBot = (pullRequest.user.type === 'Bot' || author.includes('[bot]') || author === 'renovate-bot') &&
                                    (author.includes('renovate') || author.includes('dependabot'));

            if (isDependencyBot) {
                await helpers.addLabel(pullRequest, 'dependencies');
                core.info(`Labeled PR #${pullRequest.number} by ${author} as dependencies`);
            } else if (pullRequest.user.type === 'Bot' || author.includes('[bot]')) {
                // Skip other bot PRs that aren't dependency bots
                core.info(`Skipping labeling for bot PR #${pullRequest.number} by ${author}`);
            } else {
                // Check if the PR author is a member of the Ghost Foundation team
                const isGhostMember = await helpers.isGhostFoundationMember(author, pullRequest.author_association);

                // Don't label until we get the correct org membership data
                // if (isGhostMember) {
                //     await helpers.addLabel(pullRequest, 'core team');
                // } else {
                //     await helpers.addLabel(pullRequest, 'community');
                // }

                core.info(`Labeled PR #${pullRequest.number} by ${author} as ${isGhostMember ? 'core team' : 'community'}`);
            }

            // Check for locale file changes regardless of author type
            const containsLocaleChanges = await helpers.containsLocaleChanges(pullRequest.number);
            if (containsLocaleChanges) {
                await helpers.addLabel(pullRequest, 'affects:i18n');
                core.info(`Labeled PR #${pullRequest.number} as affects:i18n (contains locale file changes)`);
            }

            return;
        }

        if (payload.action === 'labeled') {
            // We only want to do something when a human labels a PR
            if (payload.sender?.type === 'Bot' || payload.sender?.name === 'Ghost-Slimer') {
                core.info('Ignoring label event, detected a bot');
                return;
            }

            const label = payload.label;

            switch (label.name) {
            case 'auto-merge':
                await helpers.enablePRAutoMerge(payload.pull_request);
                break;
            case 'needs:info':
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
            // bother to add `needs:triage`
            const CLOSEABLE_LABELS = ['support request', 'feature request'];
            const existingLabels = await helpers.listLabels(issue);

            const shouldIgnore = existingLabels.find(l => CLOSEABLE_LABELS.includes(l.name));
            if (shouldIgnore) {
                return;
            }

            // Ignore labelled issues from Ghost core team triagers on external repos
            if (Helpers.CORE_TEAM_TRIAGERS.includes(issue.user.login) && existingLabels.length > 0) {
                return;
            }

            if (!existingLabels.find(l => l.name === 'needs:triage')) {
                await helpers.addLabel(issue, 'needs:triage');
            }
            return;
        }

        if (payload.action === 'closed') {
            await helpers.removeNeedsTriageLabel(issue);
            return;
        }

        if (payload.action === 'labeled') {
            // We only want to do something when a human labels an issue
            if (payload.sender?.type === 'Bot' || payload.sender?.name === 'Ghost-Slimer') {
                core.info('Ignoring label event, detected a bot');
                return;
            }

            const label = payload.label;

            const TRIAGE_WITHOUT_COMMENT_LABELS = ['bug', 'community', 'core team', 'good first issue', 'help wanted'];

            if (label.name === 'Ghost(Pro)') {
                await helpers.removeNeedsTriageLabel(issue);
                await helpers.leaveComment(issue, comments.GHOST_PRO);
                await helpers.closeIssue(issue, 'not_planned');
            } else if (label.name === 'invalid security report') {
                await helpers.removeNeedsTriageLabel(issue);
                await helpers.leaveComment(issue, comments.INVALID_SECURITY_REPORT);
                await helpers.closeIssue(issue, 'not_planned');
            } else if (label.name === 'support request') {
                await helpers.removeNeedsTriageLabel(issue);
                await helpers.leaveComment(issue, comments.SUPPORT_REQUEST);
                await helpers.closeIssue(issue, 'not_planned');
            } else if (label.name === 'feature request') {
                await helpers.removeNeedsTriageLabel(issue);
                await helpers.leaveComment(issue, comments.FEATURE_REQUEST);
                await helpers.closeIssue(issue, 'not_planned');
            } else if (label.name === 'needs:template') {
                await helpers.removeNeedsTriageLabel(issue);
                await helpers.leaveComment(issue, comments.NEEDS_TEMPLATE);
                await helpers.closeIssue(issue, 'not_planned');
            } else if (label.name === 'self hosting') {
                await helpers.removeNeedsTriageLabel(issue);
                await helpers.leaveComment(issue, comments.SELF_HOSTING);
                await helpers.closeIssue(issue, 'not_planned');
            } else if (label.name === 'needs:info') {
                await helpers.removeNeedsTriageLabel(issue);
                await helpers.leaveComment(issue, comments.NEEDS_INFO);
            } else if (TRIAGE_WITHOUT_COMMENT_LABELS.includes(label.name.toLowerCase())) {
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
