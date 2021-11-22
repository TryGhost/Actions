module.exports = {
    SUPPORT_REQUEST: `Hey @{issue-author} 👋 We ask that you please do not use GitHub for help or support 😄. We use GitHub solely for bug-tracking and community-driven development.

Many questions can be answered by reviewing our [documentation](https://ghost.org/docs/). If you can't find an answer then our [forum](https://forum.ghost.org/c/help/6) is a great place to get community support, plus it helps create a central location for searching problems/solutions.

FYI: Many projects use issue templates to point you in the right direction. Reading the guidelines or issue templates before opening issues can save you and project maintainers valuable time.`,

    FEATURE_REQUEST: `Hey @{issue-author} 👋

Friendly reminder: we don't track feature requests on GitHub.

Please look for similar ideas to vote for on the [forum](https://forum.ghost.org/c/Ideas/l/votes) and if you can't anything similar then post your own idea.

FYI: Many projects use issue templates to point you in the right direction. Reading the guidelines or issue templates before opening issues can save you and project maintainers valuable time.`,

    NEEDS_INFO: `Note from our bot: The \`needs info\` label has been added to this issue. Updating your original issue with more details is great, but won't notify us, so please make sure you leave a comment so that we can see when you've updated us.`,

    NEEDS_TEMPLATE: `Hey @{issue-author} 👋

Looks like you've stumbled upon a bug, but we don't have enough information here to help.

Please reopen this issue using our [bug report template](https://github.com/{repository-name}/issues/new?assignees=&labels=&template=bug_report.yml), including as much info as possible and we will do our best to help track it down.`,

    NO_UPDATE: `Hey @{issue-author} 👋

Our team needed some more info to get to the bottom of this, however we've not heard back from you. We're going to close this for now, but let us know if you manage to dig up some more info and we'll reopen.`,

    PING_ASSIGNEE: `This issue is currently awaiting triage from @{issue-assignee}. We're having a busy time right now, but we'll update this issue ASAP. If you have any more information to help us triage faster please leave us some comments. Thank you for understanding 🙂`,

    INVALID_SECURITY_REPORT: `If you'd like to report a security issue with Ghost, please follow the responsible disclosure process outlined in our [security policy](https://github.com/{repository-name}/security/policy). Most repositories have these and they are very clearly sign-posted.

If you're trying to report a dependency with a known vulnerability, we appreciate your time however we have multiple tools & processes in place to notify us about these so we can assess them. The majority of the time, these are invalid reports as the vulnerability cannot be exploited via Ghost. We recommend reading this article about how [npm audit is mostly wrong](https://overreacted.io/npm-audit-broken-by-design/).`,

    SELF_HOSTING: `Hey @{issue-author} 👋

We've reviewed your bug report and believe the issue is environment specific, rather than a bug. Many questions can be answered by reviewing our [documentation](https://ghost.org/docs/). If you can't find an answer then our [forum](https://forum.ghost.org/c/help/self-hosting/18) is a great place to get community support, plus it helps create a central location for searching problems/solutions.`
};
