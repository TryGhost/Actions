const core = require('@actions/core');
const {GhostMetrics} = require('@tryghost/metrics');
const metrics = new GhostMetrics(JSON.parse(core.getInput('configuration')));

function isNumeric(str) {
    if (typeof str != "string") return false;
    return !isNaN(str) && !isNaN(parseFloat(str));
}

(async () => {
    const name = core.getInput('metricName');
    let value = core.getInput('metricValue');

    if (isNumeric(value)) {
        value = parseFloat(value);
    }

    await metrics.metric(name, value);
})();
