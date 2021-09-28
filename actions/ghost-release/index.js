/* eslint-disable max-lines */

const fs = require('fs');
const path = require('path');
const semver = require('semver');
const releaseUtils = require('@tryghost/release-utils');

const basePath = process.env.GITHUB_WORKSPACE || process.cwd();
const ghostPackageInfo = JSON.parse(fs.readFileSync(path.join(basePath, 'package.json')));
const changelogPath = path.join(basePath, '.dist', 'changelog.md');
const ghostVersion = ghostPackageInfo.version;
const zipName = `Ghost-${ghostVersion}.zip`;

(async () => {
    try {
        const tags = await releaseUtils.releases.get({
            userAgent: 'ghost-release',
            uri: `https://api.github.com/repos/TryGhost/Ghost/releases?per_page=100`
        });

        const sameMajorReleaseTags = [];
        const otherReleaseTags = [];

        tags.forEach((release) => {
            let lastVersion = release.name || release.tag_name;

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

        changelog
            .write({
                githubRepoPath: `https://github.com/TryGhost/Ghost`,
                lastVersion: previousVersionTagged
            })
            .write({
                githubRepoPath: `https://github.com/TryGhost/Admin`,
                lastVersion: previousVersionTagged,
                append: true,
                folder: path.join(basePath, 'core', 'client')
            })
            .sort()
            .clean();

        const ghostVersionTagged = (semver.major(ghostVersion) >= 4) ? `v${ghostVersion}` : ghostVersion;

        const response = await releaseUtils.releases.create({
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
            extraText: `---\n\nView the changelogs for full details:\n* Ghost - https://github.com/tryghost/ghost/compare/${previousVersionTagged}...${ghostVersionTagged}\n* Admin - https://github.com/tryghost/admin/compare/${previousVersionTagged}...${ghostVersionTagged}`
        });

        await releaseUtils.releases.uploadZip({
            github: {
                token: process.env.RELEASE_TOKEN
            },
            zipPath: path.join(basePath, '.dist', 'release', zipName),
            uri: `${response.uploadUrl.substring(0, response.uploadUrl.indexOf('{'))}?name=${zipName}`,
            userAgent: 'ghost-release'
        });
    } catch (err) {
        console.error(err); // eslint-disable-line no-console
        process.exit(1);
    }
})();
