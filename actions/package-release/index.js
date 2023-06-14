/* eslint-disable no-console, max-lines */

const {gitmojis} = require('gitmojis');
const {request} = require('undici');
const semver = require('semver');
const simpleGit = require('simple-git');

(async () => {
    // example: refs/tags/@tryghost/koenig-lexical@1.0.3
    const GITHUB_REF = process.env.GITHUB_REF;
    console.log('GITHUB_REF', GITHUB_REF);

    const tagVersion = GITHUB_REF.replace('refs/tags/', '');
    console.log('tagVersion', tagVersion);
    
    const [/**/, packageName, packageVersion] = tagVersion.split('@', 3);
    console.log('packageName', packageName);
    console.log('packageVersion', packageVersion);
   
    const packageNameWithoutScope = packageName.replace('tryghost/', '');
    
    const git = simpleGit();
    const tags = await git.tags();

    const packageTags = tags.all.filter(tag => tag.includes(packageName));

    if (packageTags.length < 2) {
        console.log('Not enough package tags found, exiting');
        process.exit(0);
    }

    const indexOfCurrentTag = packageTags.indexOf(tagVersion);
    if (indexOfCurrentTag === -1) {
        console.log('Current tag not found, exiting');
        process.exit(0);
    }

    if (indexOfCurrentTag === 0) {
        console.log('Current tag is the first tag, exiting');
        process.exit(0);
    }

    const previousTag = packageTags[indexOfCurrentTag - 1];
    console.log('previousTag', previousTag);

    const changelog = await git.log({
        file: `packages/${packageNameWithoutScope}`,
        from: previousTag,
        to: tagVersion
    });

    const changelogContents = changelog
        .all
        .filter((entry) => {
            if (entry.message.match(/[\uD800-\uDBFF][\uDC00-\uDFFF]/)) {
                return true;
            }
            
            const gitmoji = gitmojis.find(g => entry.message.startsWith(g.code));
            if (gitmoji) {
                return true;
            }

            return false;
        })
        .map((entry) => {
            let message = entry.message;

            // if the line starts with a gitmoji, convert gitmojis to slack emojis
            const gitmoji = gitmojis.find(g => entry.message.startsWith(g.code));
            if (gitmoji) {
                message = `${gitmoji.emoji} ${entry.message.replace(gitmoji.code, '').trim()}`;
            }

            return `* ${message} - ${entry.author_name}`;
        });

    if (packageNameWithoutScope === 'koenig-lexical') {
        try {
            console.log('Clearing jsDelivr cache for koenig-lexical');
            const majorMinorVersion = semver.major(packageVersion) + '.' + semver.minor(packageVersion);
            const response = await request(`https://purge.jsdelivr.net/ghost/${packageNameWithoutScope}@~${majorMinorVersion}/dist/koenig-lexical.umd.js`);
            console.log('response', response);
        } catch (err) {
            console.log('Failed to clear cache', err);
        }
    }
    
    if (changelogContents.length) {
        const slackBody = `👻 *@${packageName} v${packageVersion} has been published!*\n\n${changelogContents.join('\n')}`;
        console.log();
        console.log(slackBody);

        const WEBHOOK_URL = process.env.RELEASE_NOTIFICATION_URL;
        if (WEBHOOK_URL) {
            const {IncomingWebhook} = require('@slack/webhook');
            const webhook = new IncomingWebhook(WEBHOOK_URL);

            try {
                await webhook.send({
                    username: 'Ghost',
                    blocks: [{
                        type: 'section',
                        text: {
                            type: 'mrkdwn',
                            text: slackBody
                        }
                    }]
                });
            } catch (err) {
                console.log('Failed to send slack notification');
            }
        }
    }
})();