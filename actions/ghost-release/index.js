/* eslint-disable max-lines */

const fs = require('fs');
const path = require('path');
const semver = require('semver');

const github = require('@actions/github');
const releaseUtils = require('@tryghost/release-utils');

const basePath = process.env.GITHUB_WORKSPACE || process.cwd();
const rootPackageInfo = JSON.parse(fs.readFileSync(path.join(basePath, 'package.json'), 'utf-8'));

let subPath = '.';

if (rootPackageInfo.name !== 'ghost' && Array.isArray(rootPackageInfo.workspaces)) {
    subPath = 'ghost/core';
}

const ghostPackageInfo = JSON.parse(fs.readFileSync(path.join(basePath, subPath, 'package.json'), 'utf-8'));
const changelogPath = path.join(basePath, 'changelog.md');
const ghostVersion = ghostPackageInfo.version;

const newMonorepo = ghostVersion.startsWith('5');

(async () => {
    try {
        const client = github.getOctokit(process.env.RELEASE_TOKEN);

        const {data: tags} = await client.rest.repos.listReleases({
            owner: 'TryGhost',
            repo: 'Ghost',
            per_page: 100
        });

        const sameMajorReleaseTags = [];
        const otherReleaseTags = [];

        tags.forEach((release) => {
            let lastVersion = release.name || release.tag_name;

            if (lastVersion.includes('@tryghost')) {
                return;
            }

            if (release.prerelease) {
                return;
            }

            // only compare to versions smaller than the new one
            if (semver.gt(ghostVersion, lastVersion)) {
                // check if the majors are the same
                if (semver.major(lastVersion) === semver.major(ghostVersion)) {
                    sameMajorReleaseTags.push(lastVersion);
                } else {
                    otherReleaseTags.push(lastVersion);
                }
            }
        });

        const previousVersion = (sameMajorReleaseTags.length !== 0) ? sameMajorReleaseTags[0] : otherReleaseTags[0];
        const previousVersionTagged = (semver.major(previousVersion) >= 4) ? `v${previousVersion}` : previousVersion;

        const changelog = new releaseUtils.Changelog({
            changelogPath,
            folder: basePath
        });

        if (newMonorepo) {
            changelog
                .write({
                    githubRepoPath: `https://github.com/TryGhost/Ghost`,
                    lastVersion: previousVersionTagged
                })
                .sort()
                .clean();
        } else {
            const adminDir = path.join(path.join(basePath, subPath), 'core', 'client');
            changelog
                .write({
                    githubRepoPath: `https://github.com/TryGhost/Ghost`,
                    lastVersion: previousVersionTagged
                })
                .write({
                    githubRepoPath: `https://github.com/TryGhost/Admin`,
                    lastVersion: previousVersionTagged,
                    append: true,
                    folder: adminDir
                })
                .sort()
                .clean();
        }

        const ghostVersionTagged = (semver.major(ghostVersion) >= 4) ? `v${ghostVersion}` : ghostVersion;

        let extraText;
        if (newMonorepo) {
            extraText = `---\n\nView the changelog for full details: https://github.com/tryghost/ghost/compare/${previousVersionTagged}...${ghostVersionTagged}`;
        } else {
            extraText = `---\n\nView the changelog for full details:\n\n* Ghost - https://github.com/tryghost/ghost/compare/${previousVersionTagged}...${ghostVersionTagged}`;
            extraText += `\n* Admin - https://github.com/tryghost/admin/compare/${previousVersionTagged}...${ghostVersionTagged}`;
        }
        extraText += `\n\n🪄 Love open source? We're hiring [JavaScript Engineers](https://careers.ghost.org/) to work on Ghost full-time`;

        await releaseUtils.releases.create({
            draft: false,
            preRelease: false,
            tagName: ghostVersionTagged,
            releaseName: ghostVersion,
            userAgent: 'ghost-release',
            uri: `https://api.github.com/repos/TryGhost/Ghost/releases`,
            github: {
                token: process.env.RELEASE_TOKEN
            },
            changelogPath: [{changelogPath}],
            extraText
        });

        const webhookUrl = process.env.RELEASE_NOTIFICATION_URL;

        if (webhookUrl) {
            const {IncomingWebhook} = require('@slack/webhook');
            const webhook = new IncomingWebhook(webhookUrl);

            const changelogContents = releaseUtils.utils.getFinalChangelog({
                changelogPath
            })
                .filter(item => item !== undefined)
                .filter((item, pos, self) => self.indexOf(item) === pos)
                .join('\n');

            await webhook.send({
                username: 'Ghost',
                blocks: [{
                    type: 'section',
                    text: {
                        type: 'mrkdwn',
                        text: `👻 *Ghost v${ghostVersion} is loose!* - https://github.com/TryGhost/Ghost/releases/tag/${ghostVersionTagged}\n\n${changelogContents}`
                    }
                }]
            });
        }
    } catch (err) {
        console.error(err); // eslint-disable-line no-console
        process.exit(1);
    }
})();
