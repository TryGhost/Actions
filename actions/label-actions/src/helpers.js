const core = require('@actions/core');
const github = require('@actions/github');

module.exports = class Helpers {
    static CORE_TEAM_TRIAGERS = [
        'ErisDS'
    ];

    /**
     * @param {string} token
     * @param {object} repo
     * @param {string} repo.owner
     * @param {string} repo.repo
     */
    constructor(token, repo) {
        this.client = github.getOctokit(token);
        this.repo = repo;
    }

    async enablePRAutoMerge(pullRequest) {
        await this.client.graphql(`
            mutation enablePRAutoMerge($pullRequestId: ID!) {
                enablePullRequestAutoMerge(input: {pullRequestId: $pullRequestId, mergeMethod: REBASE}) {
                    pullRequest {
                        id
                    }
                }
            }`, {
            pullRequestId: pullRequest.node_id
        });
    }

    /**
     * @param {Object} existingTimelineEvents
     * @param {Object} labelEvent
     */
    isPendingOnInternal(existingTimelineEvents, labelEvent) {
        const lastComment = existingTimelineEvents.find(l => l.event === 'commented');

        // If there's no comment, we probably need to come and do something
        if (!lastComment) {
            return true;
        }

        if (labelEvent.label?.name === 'needs:triage') {
            if (lastComment.actor.login === 'Ghost-Slimer') {
                return true;
            }
        }

        return (lastComment // we have a comment in the timeline events
            && new Date(lastComment.created_at) > new Date(labelEvent.created_at) // that comment is newer than the label
            && (
                lastComment.actor.type === 'Bot' // the comment was by a bot
                && !Helpers.CORE_TEAM_TRIAGERS.includes(lastComment.actor.login) // the comment was not by the Core team triagers
            )
        );
    }

    /**
     * @param {Date} date
     * @param {number} weeks
     */
    isOlderThanXWeeks(date, weeks) {
        const oneWeek = 7 * 24 * 60 * 60 * 1000;
        return (Date.now() - new Date(date).getTime()) > (weeks * oneWeek);
    }

    /**
     * @param {object} issue
     * @param {string} projectId
     * @param {object} [options]
     */
    async addIssueToProject(issue, projectId, options = {}) {
        const addResponse = await this.client.graphql(`
            mutation addIssueToProject($projectId: ID!, $issueId: ID!) {
                addProjectV2ItemById(input: {contentId: $issueId, projectId: $projectId}) {
                    item {
                        id
                    }
                    }
            }`, {
            projectId,
            issueId: issue.node_id
        });

        if (addResponse?.addProjectV2ItemById?.item?.id) {
            for (const option of Object.keys(options)) {
                await this.client.graphql(`
                    mutation moveItemToColumn($projectId: ID!, $itemId: ID!, $fieldId: ID!, $optionId: String!) {
                        updateProjectV2ItemFieldValue(input: {projectId: $projectId, itemId: $itemId, fieldId: $fieldId, value: {singleSelectOptionId: $optionId}}) {
                            projectV2Item {
                                id
                            }
                        }
                    }`, {
                    projectId,
                    itemId: addResponse.addProjectV2ItemById.item.id,
                    fieldId: option,
                    optionId: options[option]
                });
            }
        }
    }

    /**
     * @param {object} issue
     */
    async removeNeedsTriageLabelIfOlder(issue) {
        // check if the issue was opened with one of these labels AFTER we added `needs:triage`
        // if so, we want to remove the `needs:triage` label
        const existingTimelineEvents = await this.listTimelineEvents(issue);
        const existingNeedsTriageLabel = existingTimelineEvents.find(l => l.event === 'labeled' && l.label?.name === 'needs:triage');
        if (existingNeedsTriageLabel) {
            await this.removeNeedsTriageLabel(issue);
        }
    }

    /**
     * @returns {Promise<Array>}
     */
    async listOpenNeedsInfoIssues() {
        const {data: needsInfoIssues} = await this.client.rest.issues.listForRepo({
            ...this.repo,
            state: 'open',
            labels: 'needs:info'
        });
        return needsInfoIssues;
    }

    /**
     * @returns {Promise<Array>}
     */
    async listOpenPullRequests() {
        const {data: needsInfoPullRequests} = await this.client.rest.pulls.list({
            ...this.repo,
            state: 'open'
        });

        return needsInfoPullRequests;
    }

    /**
     * @param {object} issue
     * @returns {Promise<Array>}
     */
    async listTimelineEvents(issue) {
        let {data: events} = await this.client.rest.issues.listEventsForTimeline({
            ...this.repo,
            issue_number: issue.number,
            per_page: 100
        });

        events = events.filter(e => e);
        events.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

        return events;
    }

    /**
     * @param {object} issue
     * @returns {Promise<Array>}
     */
    async listLabels(issue) {
        const {data: labels} = await this.client.rest.issues.listLabelsOnIssue({
            ...this.repo,
            issue_number: issue.number
        });
        return labels;
    }

    /**
     * @param {object} issue
     * @param {String} body
     * @param {object} [replacements]
     */
    async leaveComment(issue, body, replacements = {}) {
        if (issue.user) {
            body = body.replace(/{issue-author}/, issue.user.login);
        }

        body = body.replace(/{repository-name}/, `${this.repo.owner}/${this.repo.repo}`);

        if (replacements) {
            for (const r in replacements) {
                body = body.replace(r, replacements[r]);
            }
        }

        await this.client.rest.issues.createComment({
            ...this.repo,
            issue_number: issue.number,
            body
        });
    }

    /**
     * @param {object} issue
     * @param {('completed'|'not_planned')} [stateReason]
     */
    async closeIssue(issue, stateReason = 'completed') {
        await this.client.rest.issues.update({
            ...this.repo,
            issue_number: issue.number,
            state: 'closed',
            state_reason: stateReason
        });
    }

    /**
     * @param {object} issue
     * @param {String} name
     */
    async addLabel(issue, name) {
        await this.client.rest.issues.addLabels({
            ...this.repo,
            issue_number: issue.number,
            labels: [name]
        });
    }

    /**
     * @param {object} issue
     * @param {String} name
     */
    async removeLabel(issue, name) {
        await this.client.rest.issues.removeLabel({
            ...this.repo,
            issue_number: issue.number,
            name
        });
    }

    /**
     * @param {object} issue
     */
    async removeNeedsTriageLabel(issue) {
        try {
            await this.removeLabel(issue, 'needs:triage');
        } catch (err) {
            // It might not exist, that's ok for now.
        }
    }

    /**
     * Check if a user is a member of the Ghost Foundation team
     * @param {string} username
     * @returns {Promise<boolean>}
     */
    async isGhostFoundationMember(username) {
        try {
            // First try to check team membership directly
            await this.client.rest.teams.getMembershipForUserInOrg({
                org: 'TryGhost',
                team_slug: 'ghost-foundation',
                username: username
            });
            core.info(`User ${username} is a member of ghost-foundation team`);
            return true;
        } catch (teamErr) {
            // Log the full error details for debugging
            core.debug(`Team membership check failed: ${JSON.stringify({
                status: teamErr.status,
                message: teamErr.message,
                username: username,
                response: teamErr.response?.data
            })}`);

            // If we get a 404, the user is not a member
            if (teamErr.status === 404) {
                core.info(`User ${username} is not a member of ghost-foundation team (404)`);
                return false;
            }

            // For other errors (like 403 forbidden), check repository permissions as fallback
            if (teamErr.status === 403) {
                core.warning(`Cannot check team membership for ${username} (403 Forbidden), checking repository permissions`);
                try {
                    // Check permissions for both Ghost and Admin repos
                    // Core team members have write access to BOTH repos
                    const [ghostPerm, adminPerm] = await Promise.all([
                        this.client.rest.repos.getCollaboratorPermissionLevel({
                            owner: 'TryGhost',
                            repo: 'Ghost',
                            username: username
                        }),
                        this.client.rest.repos.getCollaboratorPermissionLevel({
                            owner: 'TryGhost',
                            repo: 'Admin',
                            username: username
                        })
                    ]);

                    // Core team members must have write or admin access to BOTH repos
                    const hasGhostWrite = ghostPerm.data.permission === 'write' || ghostPerm.data.permission === 'admin';
                    const hasAdminWrite = adminPerm.data.permission === 'write' || adminPerm.data.permission === 'admin';
                    const isCore = hasGhostWrite && hasAdminWrite;

                    core.info(`User ${username} has ${ghostPerm.data.permission} access to Ghost and ${adminPerm.data.permission} access to Admin - ${isCore ? 'core team' : 'community'}`);
                    return isCore;
                } catch (permErr) {
                    if (permErr.status === 404) {
                        core.info(`User ${username} has no direct access to repos - community`);
                        return false;
                    }
                    core.error(`Error checking repo permissions for ${username}: ${permErr.message}`);
                    return false;
                }
            }

            // For other errors, log and assume not a member
            core.error(`Error checking team membership for ${username}: Status ${teamErr.status} - ${teamErr.message}`);
            return false;
        }
    }

    /**
     * Get list of changed files in a pull request
     * @param {number} pullNumber
     * @returns {Promise<Array>}
     */
    async getPRFiles(pullNumber) {
        try {
            const {data: files} = await this.client.rest.pulls.listFiles({
                ...this.repo,
                pull_number: pullNumber,
                per_page: 100
            });
            return files;
        } catch (err) {
            core.error(`Error fetching PR files: ${err.message}`);
            return [];
        }
    }

    /**
     * Check if PR contains changes to locale files
     * @param {number} pullNumber
     * @returns {Promise<boolean>}
     */
    async containsLocaleChanges(pullNumber) {
        const files = await this.getPRFiles(pullNumber);
        return files.some(file => file.filename.includes('/locales/'));
    }
};
