let githubOverride;
let githubPromise;

async function getGitHub() {
    if (githubOverride) {
        return githubOverride;
    }

    if (!githubPromise) {
        githubPromise = import('@actions/github').then(github => github.default ?? github);
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
