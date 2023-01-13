const github = require('@actions/github');

module.exports = class Helpers {
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
     * @returns {Promise<Array>}
     */
    async listOpenLabeledIssues() {
        const {data: needsTriageIssues} = await this.client.rest.issues.listForRepo({
            ...this.repo,
            state: 'open',
            labels: 'needs triage'
        });
        const {data: needsInfoIssues} = await this.client.rest.issues.listForRepo({
            ...this.repo,
            state: 'open',
            labels: 'needs info'
        });

        const combinedIssues = needsTriageIssues
            .concat(needsInfoIssues)
            .filter((thing, index, self) => index === self.findIndex(t => t.id === thing.id));

        return combinedIssues;
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

        events.reverse();

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
