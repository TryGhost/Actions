const {getCore} = require('./actions-core');
const {getGitHub} = require('./actions-github');

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
    constructor(token, repo, client = null) {
        this.token = token;
        this.client = client;
        this.repo = repo;
    }

    async getClient() {
        if (this.client) {
            return this.client;
        }

        const github = await getGitHub();
        this.client = github.getOctokit(this.token);

        return this.client;
    }

    async enablePRAutoMerge(pullRequest) {
        const client = await this.getClient();

        await client.graphql(`
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
        const client = await this.getClient();
        const addResponse = await client.graphql(`
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
                await client.graphql(`
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
        const client = await this.getClient();
        const {data: needsInfoIssues} = await client.rest.issues.listForRepo({
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
        const client = await this.getClient();
        const {data: needsInfoPullRequests} = await client.rest.pulls.list({
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
        const client = await this.getClient();
        let {data: events} = await client.rest.issues.listEventsForTimeline({
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
        const client = await this.getClient();
        const {data: labels} = await client.rest.issues.listLabelsOnIssue({
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

        const client = await this.getClient();

        await client.rest.issues.createComment({
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
        const client = await this.getClient();

        await client.rest.issues.update({
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
        const client = await this.getClient();

        await client.rest.issues.addLabels({
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
        const client = await this.getClient();

        await client.rest.issues.removeLabel({
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
        } catch {
            // It might not exist, that's ok for now.
        }
    }

    /**
     * Check if a GitHub user is a core team member
     *
     * We identify core team members by:
     * 1. Being a member of the TryGhost organization (checked via author_association)
     * 2. Having write or admin access to the Admin repository
     *
     * This approach correctly distinguishes between:
     * - Core team (org member + write access to Admin)
     * - Contributors (org member + read access to Admin)
     * - Community (not org member)
     *
     * @param {string} username
     * @param {string} authorAssociation The PR author's association with the repository
     * @returns {Promise<boolean>}
     */
    async isGhostFoundationMember(username, authorAssociation) {
        const core = await getCore();

        try {
            // First check if they're an org member using author_association
            const isOrgMember = ['OWNER', 'MEMBER'].includes(authorAssociation);
            core.info(`User ${username} has ${authorAssociation} association with the repository`);

            if (!isOrgMember) {
                core.info('User is not an organization member');
                return false;
            }

            // If they're an org member, check Admin repo permissions
            const client = await this.getClient();
            const {data} = await client.rest.repos.getCollaboratorPermissionLevel({
                owner: 'TryGhost',
                repo: 'Admin',
                username: username
            });

            const isCore = data.permission === 'write' || data.permission === 'admin';
            core.info(`User ${username} has ${data.permission} access to Admin repo - ${isCore ? 'core team' : 'contributor'}`);
            return isCore;
        } catch (err) {
            core.error(`Error checking permissions for ${username}: ${err.message}`);
            return false;
        }
    }

    /**
     * Get list of changed files in a pull request
     * @param {number} pullNumber
     * @returns {Promise<Array>}
     */
    async getPRFiles(pullNumber) {
        const core = await getCore();

        try {
            const client = await this.getClient();
            const {data: files} = await client.rest.pulls.listFiles({
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
     * Check if PR contains translation changes worth flagging for review.
     *
     * Only non-English locale files count, and only when they introduce at
     * least one non-empty value. English source files and `context.json` hold
     * English copy (not translations), and empty `""` lines are placeholders
     * seeded by `pnpm translate` when new keys are added — neither gives a
     * translation reviewer anything to act on, so they must not trip the label.
     *
     * @param {number} pullNumber
     * @returns {Promise<boolean>}
     */
    async containsLocaleChanges(pullNumber) {
        const files = await this.getPRFiles(pullNumber);
        return files.some((file) => {
            const filename = file.filename || '';
            if (!filename.includes('/locales/')) {
                return false;
            }
            // English source copy and context descriptions are not translations.
            if (isEnglishLocaleFile(filename) || isContextFile(filename)) {
                return false;
            }
            // GitHub omits `patch` for very large or binary diffs — we can't
            // inspect the contents, so fall back to labelling to stay safe.
            if (!file.patch) {
                return true;
            }
            // Otherwise only label when a real (non-empty) value is added.
            return patchAddsNonEmptyValue(file.patch);
        });
    }
};

// Matches the `en` locale in both nested (`.../locales/en/ghost.json`) and
// flat (`.../locales/en.json`) layouts used across Ghost repos.
function isEnglishLocaleFile(filename) {
    return /\/locales\/en\//.test(filename) || /\/locales\/en\.json$/.test(filename);
}

function isContextFile(filename) {
    return /\/locales\/context\.json$/.test(filename);
}

// A JSON entry whose value has at least one character, e.g. `  "Key": "Wert",`.
// Empty placeholders (`"Key": ""`) deliberately do not match.
const NON_EMPTY_VALUE_PATTERN = /:\s*"(?:[^"\\]|\\.)+"\s*,?\s*$/;

// True when the unified-diff patch adds at least one line carrying a non-empty
// JSON string value. Only added lines (`+`, excluding the `+++` file header)
// are considered.
function patchAddsNonEmptyValue(patch) {
    if (!patch || typeof patch !== 'string') {
        return false;
    }
    return patch.split('\n').some((line) => {
        if (!line.startsWith('+') || line.startsWith('+++')) {
            return false;
        }
        return NON_EMPTY_VALUE_PATTERN.test(line.slice(1));
    });
}
