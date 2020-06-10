const { IncomingWebhook } = require('@slack/webhook');

const url = process.env.SLACK_WEBHOOK_URL;
const webhook = new IncomingWebhook(url);

(async () => {
    await webhook.send({
        text: 'test',
    });
})();
