let coreOverride;
let corePromise;

async function getCore() {
    if (coreOverride) {
        return coreOverride;
    }

    if (!corePromise) {
        corePromise = import('@actions/core').then(core => core.default ?? core);
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
