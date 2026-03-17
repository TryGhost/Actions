/******/ (() => { // webpackBootstrap
/******/ 	var __webpack_modules__ = ({

/***/ 4352:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

let coreOverride;
let corePromise;

async function getCore() {
    if (coreOverride) {
        return coreOverride;
    }

    if (!corePromise) {
        corePromise = Promise.all(/* import() */[__nccwpck_require__.e(119), __nccwpck_require__.e(78)]).then(__nccwpck_require__.bind(__nccwpck_require__, 3078)).then(core => core.default ?? core);
    }

    return corePromise;
}

function setCoreForTests(core) {
    coreOverride = core;
    corePromise = null;
}

module.exports = {
    getCore,
    setCoreForTests
};


/***/ }),

/***/ 5904:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

let githubOverride;
let githubPromise;

async function getGitHub() {
    if (githubOverride) {
        return githubOverride;
    }

    if (!githubPromise) {
        githubPromise = Promise.all(/* import() */[__nccwpck_require__.e(119), __nccwpck_require__.e(157)]).then(__nccwpck_require__.bind(__nccwpck_require__, 157)).then(github => github.default ?? github);
    }

    return githubPromise;
}

function setGitHubForTests(github) {
    githubOverride = github;
    githubPromise = null;
}

module.exports = {
    getGitHub,
    setGitHubForTests
};


/***/ }),

/***/ 2283:
/***/ ((module) => {

module.exports = {
    SUPPORT_REQUEST: `Hey @{issue-author} 👋 We ask that you please do not use GitHub for help or support 😄. We use GitHub solely for bug-tracking and community-driven development.

Many questions can be answered by reviewing our [documentation](https://ghost.org/docs/). If you can't find an answer then our [forum](https://forum.ghost.org/c/help/6) is a great place to get community support, plus it helps create a central location for searching problems/solutions.

FYI: Many projects use issue templates to point you in the right direction. Reading the guidelines or issue templates before opening issues can save you and project maintainers valuable time.`,

    FEATURE_REQUEST: `Hey @{issue-author} 👋

Friendly reminder: we don't track feature requests on GitHub.

Please look for similar ideas to vote for on the [forum](https://forum.ghost.org/c/Ideas/l/votes) and if you can't anything similar then post your own idea.

FYI: Many projects use issue templates to point you in the right direction. Reading the guidelines or issue templates before opening issues can save you and project maintainers valuable time.`,

    NEEDS_INFO: `Note from our bot: The \`needs:info\` label has been added to this issue. Updating your original issue with more details is great, but won't notify us, so please make sure you leave a comment so that we can see when you've updated us.`,

    NEEDS_TEMPLATE: `Hey @{issue-author} 👋

Looks like you've stumbled upon a bug, but we don't have enough information here to help.

Please reopen this issue using our [bug report template](https://github.com/{repository-name}/issues/new?assignees=&labels=&template=bug_report.yml), including as much info as possible and we will do our best to help track it down.`,

    NO_UPDATE: `Hey @{issue-author} 👋

Our team needed some more info to get to the bottom of this, however we've not heard back from you. We're going to close this for now, but let us know if you manage to dig up some more info and we'll reopen.`,

    INVALID_SECURITY_REPORT: `If you'd like to report a security issue with Ghost, please follow the responsible disclosure process outlined in our [security policy](https://github.com/{repository-name}/security/policy). Security issues are reported privately so that are able to properly manage disclosure and patching. Many repositories have these policies and they are very clearly sign-posted.

If you're trying to report a dependency with a known vulnerability, we appreciate your time however we already have automated systems in place to ensure these are surfaced and assessed in a timely manner. The majority of the time, these are invalid reports as the vulnerability cannot be exploited via Ghost. We recommend reading this article about how [npm audit is mostly wrong](https://overreacted.io/npm-audit-broken-by-design/).`,

    GHOST_PRO: `Hi there! If you're having any issue with a Ghost(Pro) site, please drop us an email on support@ghost.org and we'll be more than happy to give you a hand directly 🙂`,

    SELF_HOSTING: `Hey @{issue-author} 👋

We've reviewed your bug report and believe the issue is environment specific, rather than a bug. Many questions can be answered by reviewing our [documentation](https://ghost.org/docs/). If you can't find an answer then our [forum](https://forum.ghost.org/c/help/self-hosting/18) is a great place to get community support, plus it helps create a central location for searching problems/solutions.`,

    PR_NEEDS_INFO: `Note from our bot: The \`needs:info\` label has been added to this pull request. Updating your original PR message with more details is great, but won't notify us, so please leave a comment so that we (and our bot) can see when you've updated us. Thank you for the PR, hopefully we can get it merged soon!`,

    PR_NEEDS_INFO_CLOSED: `Our team needed some more info to get to the bottom of this, however we've not heard back from you. We're going to close this PR for now, but let us know if you manage to dig up some more info and we'll reopen. Thank you 🙏`,

    PR_CHANGES_REQUESTED: `Note from our bot: Some changes have been requested on this pull request. Updating your code is great, but won't notify us, so please leave a comment so that we (and our bot) can see when you've made the changes. Thank you 🙏`,

    PR_CHANGES_REQUESTED_CLOSED: `This PR wasn't quite ready for prime time, and we've not heard back from you. We're going to close this PR for now, but let us know if you'd like to work on it some more and we will reopen. Thank you 🙏`
};


/***/ }),

/***/ 6636:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

const {getCore} = __nccwpck_require__(4352);
const {getGitHub} = __nccwpck_require__(5904);

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
     * Check if PR contains changes to locale files
     * @param {number} pullNumber
     * @returns {Promise<boolean>}
     */
    async containsLocaleChanges(pullNumber) {
        const files = await this.getPRFiles(pullNumber);
        return files.some(file => file.filename.includes('/locales/'));
    }
};


/***/ }),

/***/ 2613:
/***/ ((module) => {

"use strict";
module.exports = require("assert");

/***/ }),

/***/ 5317:
/***/ ((module) => {

"use strict";
module.exports = require("child_process");

/***/ }),

/***/ 6982:
/***/ ((module) => {

"use strict";
module.exports = require("crypto");

/***/ }),

/***/ 4434:
/***/ ((module) => {

"use strict";
module.exports = require("events");

/***/ }),

/***/ 9896:
/***/ ((module) => {

"use strict";
module.exports = require("fs");

/***/ }),

/***/ 8611:
/***/ ((module) => {

"use strict";
module.exports = require("http");

/***/ }),

/***/ 5692:
/***/ ((module) => {

"use strict";
module.exports = require("https");

/***/ }),

/***/ 9278:
/***/ ((module) => {

"use strict";
module.exports = require("net");

/***/ }),

/***/ 4589:
/***/ ((module) => {

"use strict";
module.exports = require("node:assert");

/***/ }),

/***/ 6698:
/***/ ((module) => {

"use strict";
module.exports = require("node:async_hooks");

/***/ }),

/***/ 4573:
/***/ ((module) => {

"use strict";
module.exports = require("node:buffer");

/***/ }),

/***/ 7540:
/***/ ((module) => {

"use strict";
module.exports = require("node:console");

/***/ }),

/***/ 7598:
/***/ ((module) => {

"use strict";
module.exports = require("node:crypto");

/***/ }),

/***/ 3053:
/***/ ((module) => {

"use strict";
module.exports = require("node:diagnostics_channel");

/***/ }),

/***/ 610:
/***/ ((module) => {

"use strict";
module.exports = require("node:dns");

/***/ }),

/***/ 8474:
/***/ ((module) => {

"use strict";
module.exports = require("node:events");

/***/ }),

/***/ 7067:
/***/ ((module) => {

"use strict";
module.exports = require("node:http");

/***/ }),

/***/ 2467:
/***/ ((module) => {

"use strict";
module.exports = require("node:http2");

/***/ }),

/***/ 7030:
/***/ ((module) => {

"use strict";
module.exports = require("node:net");

/***/ }),

/***/ 643:
/***/ ((module) => {

"use strict";
module.exports = require("node:perf_hooks");

/***/ }),

/***/ 1792:
/***/ ((module) => {

"use strict";
module.exports = require("node:querystring");

/***/ }),

/***/ 7075:
/***/ ((module) => {

"use strict";
module.exports = require("node:stream");

/***/ }),

/***/ 1692:
/***/ ((module) => {

"use strict";
module.exports = require("node:tls");

/***/ }),

/***/ 3136:
/***/ ((module) => {

"use strict";
module.exports = require("node:url");

/***/ }),

/***/ 7975:
/***/ ((module) => {

"use strict";
module.exports = require("node:util");

/***/ }),

/***/ 3429:
/***/ ((module) => {

"use strict";
module.exports = require("node:util/types");

/***/ }),

/***/ 5919:
/***/ ((module) => {

"use strict";
module.exports = require("node:worker_threads");

/***/ }),

/***/ 8522:
/***/ ((module) => {

"use strict";
module.exports = require("node:zlib");

/***/ }),

/***/ 857:
/***/ ((module) => {

"use strict";
module.exports = require("os");

/***/ }),

/***/ 6928:
/***/ ((module) => {

"use strict";
module.exports = require("path");

/***/ }),

/***/ 3193:
/***/ ((module) => {

"use strict";
module.exports = require("string_decoder");

/***/ }),

/***/ 3557:
/***/ ((module) => {

"use strict";
module.exports = require("timers");

/***/ }),

/***/ 4756:
/***/ ((module) => {

"use strict";
module.exports = require("tls");

/***/ }),

/***/ 9023:
/***/ ((module) => {

"use strict";
module.exports = require("util");

/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __nccwpck_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		var threw = true;
/******/ 		try {
/******/ 			__webpack_modules__[moduleId].call(module.exports, module, module.exports, __nccwpck_require__);
/******/ 			threw = false;
/******/ 		} finally {
/******/ 			if(threw) delete __webpack_module_cache__[moduleId];
/******/ 		}
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__nccwpck_require__.m = __webpack_modules__;
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/create fake namespace object */
/******/ 	(() => {
/******/ 		var getProto = Object.getPrototypeOf ? (obj) => (Object.getPrototypeOf(obj)) : (obj) => (obj.__proto__);
/******/ 		var leafPrototypes;
/******/ 		// create a fake namespace object
/******/ 		// mode & 1: value is a module id, require it
/******/ 		// mode & 2: merge all properties of value into the ns
/******/ 		// mode & 4: return value when already ns object
/******/ 		// mode & 16: return value when it's Promise-like
/******/ 		// mode & 8|1: behave like require
/******/ 		__nccwpck_require__.t = function(value, mode) {
/******/ 			if(mode & 1) value = this(value);
/******/ 			if(mode & 8) return value;
/******/ 			if(typeof value === 'object' && value) {
/******/ 				if((mode & 4) && value.__esModule) return value;
/******/ 				if((mode & 16) && typeof value.then === 'function') return value;
/******/ 			}
/******/ 			var ns = Object.create(null);
/******/ 			__nccwpck_require__.r(ns);
/******/ 			var def = {};
/******/ 			leafPrototypes = leafPrototypes || [null, getProto({}), getProto([]), getProto(getProto)];
/******/ 			for(var current = mode & 2 && value; typeof current == 'object' && !~leafPrototypes.indexOf(current); current = getProto(current)) {
/******/ 				Object.getOwnPropertyNames(current).forEach((key) => (def[key] = () => (value[key])));
/******/ 			}
/******/ 			def['default'] = () => (value);
/******/ 			__nccwpck_require__.d(ns, def);
/******/ 			return ns;
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/define property getters */
/******/ 	(() => {
/******/ 		// define getter functions for harmony exports
/******/ 		__nccwpck_require__.d = (exports, definition) => {
/******/ 			for(var key in definition) {
/******/ 				if(__nccwpck_require__.o(definition, key) && !__nccwpck_require__.o(exports, key)) {
/******/ 					Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });
/******/ 				}
/******/ 			}
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/ensure chunk */
/******/ 	(() => {
/******/ 		__nccwpck_require__.f = {};
/******/ 		// This file contains only the entry chunk.
/******/ 		// The chunk loading function for additional chunks
/******/ 		__nccwpck_require__.e = (chunkId) => {
/******/ 			return Promise.all(Object.keys(__nccwpck_require__.f).reduce((promises, key) => {
/******/ 				__nccwpck_require__.f[key](chunkId, promises);
/******/ 				return promises;
/******/ 			}, []));
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/get javascript chunk filename */
/******/ 	(() => {
/******/ 		// This function allow to reference async chunks
/******/ 		__nccwpck_require__.u = (chunkId) => {
/******/ 			// return url for filenames based on template
/******/ 			return "" + chunkId + ".index.js";
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/hasOwnProperty shorthand */
/******/ 	(() => {
/******/ 		__nccwpck_require__.o = (obj, prop) => (Object.prototype.hasOwnProperty.call(obj, prop))
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/make namespace object */
/******/ 	(() => {
/******/ 		// define __esModule on exports
/******/ 		__nccwpck_require__.r = (exports) => {
/******/ 			if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 				Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 			}
/******/ 			Object.defineProperty(exports, '__esModule', { value: true });
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/compat */
/******/ 	
/******/ 	if (typeof __nccwpck_require__ !== 'undefined') __nccwpck_require__.ab = __dirname + "/";
/******/ 	
/******/ 	/* webpack/runtime/require chunk loading */
/******/ 	(() => {
/******/ 		// no baseURI
/******/ 		
/******/ 		// object to store loaded chunks
/******/ 		// "1" means "loaded", otherwise not loaded yet
/******/ 		var installedChunks = {
/******/ 			792: 1
/******/ 		};
/******/ 		
/******/ 		// no on chunks loaded
/******/ 		
/******/ 		var installChunk = (chunk) => {
/******/ 			var moreModules = chunk.modules, chunkIds = chunk.ids, runtime = chunk.runtime;
/******/ 			for(var moduleId in moreModules) {
/******/ 				if(__nccwpck_require__.o(moreModules, moduleId)) {
/******/ 					__nccwpck_require__.m[moduleId] = moreModules[moduleId];
/******/ 				}
/******/ 			}
/******/ 			if(runtime) runtime(__nccwpck_require__);
/******/ 			for(var i = 0; i < chunkIds.length; i++)
/******/ 				installedChunks[chunkIds[i]] = 1;
/******/ 		
/******/ 		};
/******/ 		
/******/ 		// require() chunk loading for javascript
/******/ 		__nccwpck_require__.f.require = (chunkId, promises) => {
/******/ 			// "1" is the signal for "already loaded"
/******/ 			if(!installedChunks[chunkId]) {
/******/ 				if(true) { // all chunks have JS
/******/ 					installChunk(require("./" + __nccwpck_require__.u(chunkId)));
/******/ 				} else installedChunks[chunkId] = 1;
/******/ 			}
/******/ 		};
/******/ 		
/******/ 		// no external install chunk
/******/ 		
/******/ 		// no HMR
/******/ 		
/******/ 		// no HMR manifest
/******/ 	})();
/******/ 	
/************************************************************************/
var __webpack_exports__ = {};
const {getCore} = __nccwpck_require__(4352);
const {getGitHub} = __nccwpck_require__(5904);

const Helpers = __nccwpck_require__(6636);
const comments = __nccwpck_require__(2283);

async function main() {
    const core = await getCore();
    const github = await getGitHub();
    const githubToken = core.getInput('github-token');

    if (!githubToken) {
        core.setFailed('github-token is missing');
        return;
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
        const core = await getCore();
        core.setFailed(err);
    }
})();

module.exports = __webpack_exports__;
/******/ })()
;