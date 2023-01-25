const github = require('@actions/github');

module.exports = class Helpers {
    static CORE_TEAM_TRIAGERS = [
        'ErisDS',
        'daniellockyer'
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

    isTeamRepo() {
        return this.repo.owner === 'TryGhost' && this.repo.repo === 'Team';
    }

    /**
     * @param {Object} existingTimelineEvents
     * @param {Object} label
     */
    isPendingOnInternal(existingTimelineEvents, label) {
        const lastComment = existingTimelineEvents.find(l => l.event === 'commented');

        return (lastComment // we have a comment in the timeline events
            && new Date(lastComment.created_at) > new Date(label.created_at) // that comment is newer than the label
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
     * @param {string} username
     */
    async isCollaboratorRequest(username) {
        try {
            const isCollaboratorRequest = await this.client.request('GET /repos/{owner}/{repo}/collaborators/{username}', {
                ...this.repo,
                username
            });

            if (isCollaboratorRequest.status === 200) {
                return true;
            }

            return false;
        } catch (err) {
            if (err.status !== 404) {
                throw err;
            }

            return false;
        }
    }

    /**
     * @param {object} issue
     * @param {string} projectId
     * @param {string} fieldId
     * @param {string} optionId
     */
    async addIssueToProject(issue, projectId, fieldId, optionId) {
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
                fieldId,
                optionId
            });
        }
    }

    /**
     * @param {object} issue
     */
    async addToProductBacklog(issue) {
        return this.addIssueToProject(issue, 'PVT_kwDOACE-Z84AEyWy', 'PVTSSF_lADOACE-Z84AEyWyzgCwgeQ', 'f75ad846');
    }

    /**
     * @param {object} issue
     */
    async getProjectsForIssue(issue) {
        const response = await this.client.graphql(`
            query issue($owner: String!, $repo: String!, $number: Int!) {
                repository(owner: $owner, name: $repo) {
                    issue(number: $number) {
                        title
                        projectsV2(first: 20) {
                            nodes {
                                title
                                url
                                number
                                resourcePath
                            }
                        }
                    }
                }
            }`, {
            ...this.repo,
            number: issue.number
        });

        return response?.repository?.issue?.projectsV2?.nodes || [];
    }

    /**
     * @param {object} issue
     */
    async removeNeedsTriageLabelIfOlder(issue) {
        // check if the issue was opened with one of these labels AFTER we added `needs triage`
        // if so, we want to remove the `needs triage` label
        const existingTimelineEvents = await this.listTimelineEvents(issue);
        const existingNeedsTriageLabel = existingTimelineEvents.find(l => l.event === 'labeled' && l.label?.name === 'needs triage');
        if (existingNeedsTriageLabel) {
            await this.removeNeedsTriageLabel(issue);
        }
    }

    /**
     * @returns {Promise<Array>}
     */
    async listOpenNeedsTriageIssues() {
        const {data: needsTriageIssues} = await this.client.rest.issues.listForRepo({
            ...this.repo,
            state: 'open',
            labels: 'needs triage'
        });
        return needsTriageIssues;
    }

    /**
     * @returns {Promise<Array>}
     */
    async listOpenNeedsInfoIssues() {
        const {data: needsInfoIssues} = await this.client.rest.issues.listForRepo({
            ...this.repo,
            state: 'open',
            labels: 'needs info'
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
        const {data: events} = await this.client.rest.issues.listEventsForTimeline({
            ...this.repo,
            issue_number: issue.number,
            per_page: 100
        });

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
     */
    async closeIssue(issue) {
        await this.client.rest.issues.update({
            ...this.repo,
            issue_number: issue.number,
            state: 'closed'
        });
    }

    /**
     * @param {string} name
     */
    async createLabel(name) {
        await this.client.rest.issues.createLabel({
            ...this.repo,
            name
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
            await this.removeLabel(issue, 'needs triage');
        } catch (err) {
            // It might not exist, that's ok for now.
        }
    }
};
