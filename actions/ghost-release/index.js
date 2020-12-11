const fs = require('fs');
const path = require('path');
const semver = require('semver');
const releaseUtils = require('@tryghost/release-utils');

const ORGNAME = 'TryGhost';
const basePath = process.env.GITHUB_WORKSPACE || process.cwd();
const ghostPackageInfo = JSON.parse(fs.readFileSync(path.join(basePath, 'package.json')));
const changelogPath = path.join(basePath, '.dist', 'changelog.md');
const ghostVersion = ghostPackageInfo.version;
const zipName = `Ghost-${ghostVersion}.zip`;

let previousVersion;

releaseUtils.releases
    .get({
        userAgent: 'ghost-release',
        uri: `https://api.github.com/repos/${ORGNAME}/Ghost/releases`
    })
    .then((tags) => {
        const sameMajorReleaseTags = [], otherReleaseTags = [];

        tags.forEach((release) => {
            let lastVersion = release.tag_name || release.name;

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

        previousVersion = (sameMajorReleaseTags.length !== 0) ? sameMajorReleaseTags[0] : otherReleaseTags[0];
        return Promise.resolve();
    })
    .then(() => {
        const changelog = new releaseUtils.Changelog({
            changelogPath: changelogPath,
            folder: basePath
        });

        changelog
            .write({
                githubRepoPath: `https://github.com/${ORGNAME}/Ghost`,
                lastVersion: previousVersion
            })
            .write({
                githubRepoPath: `https://github.com/${ORGNAME}/Ghost-Admin`,
                lastVersion: previousVersion,
                append: true,
                folder: path.join(basePath, 'core', 'client')
            })
            .sort()
            .clean();

        return Promise.resolve();
    })
    .then(() => releaseUtils.releases.create({
        draft: false,
        preRelease: false,
        tagName: ghostVersion,
        releaseName: ghostVersion,
        userAgent: 'ghost-release',
        uri: `https://api.github.com/repos/${ORGNAME}/Ghost/releases`,
        github: {
            token: process.env.RELEASE_TOKEN
        },
        changelogPath: [{changelogPath: changelogPath}],
        extraText: `---\n\nView the changelogs for full details:\n* Ghost - https://github.com/tryghost/ghost/compare/${previousVersion}...${ghostVersion}\n* Ghost-Admin - https://github.com/tryghost/ghost-admin/compare/${previousVersion}...${ghostVersion}`
    }))
    .then(response => releaseUtils.releases.uploadZip({
        github: {
            token: process.env.RELEASE_TOKEN
        },
        zipPath: path.join(basePath, '.dist', 'release', zipName),
        uri: `${response.uploadUrl.substring(0, response.uploadUrl.indexOf('{'))}?name=${zipName}`,
        userAgent: 'ghost-release'
    }))
    .catch((err) => {
        console.error(err); // eslint-disable-line no-console
        process.exit(1);
    });
