module.exports = {
    TEAM_ISSUE_P0: `This issue has been labelled as P0 which means it needs an immediate fix and release. See https://www.notion.so/ghost/Bug-Prioritization-bc64d4e9ebd3468ca31c9f8ac15cba0b for more info.`,

    TEAM_ISSUE_P1: `This issue has been labelled as P1 which means a fix and release should be prioritized during working hours. See https://www.notion.so/ghost/Bug-Prioritization-bc64d4e9ebd3468ca31c9f8ac15cba0b for more info.`,

    TEAM_ISSUE_P2: `This issue has been labelled as P2 which means a fix should be in the next scheduled release. See https://www.notion.so/ghost/Bug-Prioritization-bc64d4e9ebd3468ca31c9f8ac15cba0b for more info.`,

    TEAM_ISSUE_P3: `This issue has been labelled as P3 which means this is a low priority issue for the next cooldown phase, and may be moved to the OSS repo. See https://www.notion.so/ghost/Bug-Prioritization-bc64d4e9ebd3468ca31c9f8ac15cba0b for more info.`,

    TEAM_ISSUE_OSS: `This issue has been labelled as \`oss\`, which means it is a rare or low priority issue suitable for our contributors to work on. The triager will move it to the correct repo soon.`,

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

    PING_ASSIGNEE: `This issue is currently awaiting triage from @{issue-assignee}. We're having a busy time right now, but we'll update this issue ASAP. If you have any more information to help us triage faster please leave us some comments. Thank you for understanding 🙂`,

    INVALID_SECURITY_REPORT: `If you'd like to report a security issue with Ghost, please follow the responsible disclosure process outlined in our [security policy](https://github.com/{repository-name}/security/policy). Security issues are reported privately so that are able to properly manage disclosure and patching. Many repositories have these policies and they are very clearly sign-posted.

If you're trying to report a dependency with a known vulnerability, we appreciate your time however we already have automated systems in place to ensure these are surfaced and assessed in a timely manner. The majority of the time, these are invalid reports as the vulnerability cannot be exploited via Ghost. We recommend reading this article about how [npm audit is mostly wrong](https://overreacted.io/npm-audit-broken-by-design/).`,

    GHOST_PRO: `Hi there! If you're having any issue with a Ghost(Pro) site, please drop us an email on support@ghost.org and we'll be more than happy to give you a hand directly 🙂`,

    SELF_HOSTING: `Hey @{issue-author} 👋

We've reviewed your bug report and believe the issue is environment specific, rather than a bug. Many questions can be answered by reviewing our [documentation](https://ghost.org/docs/). If you can't find an answer then our [forum](https://forum.ghost.org/c/help/self-hosting/18) is a great place to get community support, plus it helps create a central location for searching problems/solutions.`,

    PR_NEEDS_INFO: `Note from our bot: The \`needs:info\` label has been added to this pull request. Updating your original PR message with more details is great, but won't notify us, so please leave a comment so that we (and our bot) can see when you've updated us. Thank you for the PR, hopefully we can get it merged soon!`,

    PR_NEEDS_INFO_CLOSED: `Our team needed some more info to get to the bottom of this, however we've not heard back from you. We're going to close this PR for now, but let us know if you manage to dig up some more info and we'll reopen. Thank you 🙏`,

    PR_MERGED: `Thank you for your PR 🙏 It has now been merged 🎉 and will be in the next release, which is usually on a Friday. Hope to see you again soon 👋`,

    PR_CHANGES_REQUESTED: `Note from our bot: Some changes have been requested on this pull request. Updating your code is great, but won't notify us, so please leave a comment so that we (and our bot) can see when you've made the changes. Thank you 🙏`,

    PR_CHANGES_REQUESTED_REMINDER: `Hi there 👋 We requested a few changes on this PR, but haven't heard back. If you are still interested in helping us get this change into Ghost please comment and let us know. Thank you 🙏`,

    PR_CHANGES_REQUESTED_CLOSED: `This PR wasn't quite ready for prime time, and we've not heard back from you. We're going to close this PR for now, but let us know if you'd like to work on it some more and we will reopen. Thank you 🙏`
};
