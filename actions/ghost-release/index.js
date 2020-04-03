const fs = require('fs');
const path = require('path');
const semver = require('semver');
const releaseUtils = require('@tryghost/release-utils');

const ORGNAME = 'TryGhost';
const basePath = process.env.GITHUB_WORKSPACE || process.cwd();

const ghostPackageInfo = JSON.parse(fs.readFileSync(path.join(basePath, 'package.json')));
const zipName = `Ghost-${ghostPackageInfo.version}.zip`;

function getPreviousVersion(tags) {
    const sameMajorReleaseTags = [], otherReleaseTags = [];

    tags.forEach((release) => {
        let lastVersion = release.tag_name || release.name;

        // only compare to versions smaller than the new one
        if (semver.gt(ghostPackageInfo.version, lastVersion)) {
            // check if the majors are the same
            if (semver.major(lastVersion) === semver.major(ghostPackageInfo.version)) {
                sameMajorReleaseTags.push(lastVersion);
            } else {
                otherReleaseTags.push(lastVersion);
            }
        }
    });

    return (sameMajorReleaseTags.length !== 0) ? sameMajorReleaseTags[0] : otherReleaseTags[0];
}

releaseUtils.releases
    .get({
        userAgent: 'ghost-release',
        uri: `https://api.github.com/repos/${ORGNAME}/Ghost/releases`
    })
    .then(getPreviousVersion)
    .then((previousVersion) => {
        const changelog = new releaseUtils.Changelog({
            changelogPath: path.join(basePath, 'changelog.md'),
            folder: process.cwd()
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

        console.log('changelog.md generated');
        return Promise.resolve();
    })
    .then(() => releaseUtils.gist.create({
        userAgent: 'ghost-release',
        gistName: 'changelog-' + ghostPackageInfo.version + '.md',
        gistDescription: 'Changelog ' + ghostPackageInfo.version,
        changelogPath: path.join(basePath, 'changelog.md'),
        github: {
            token: process.env.RELEASE_TOKEN
        },
        isPublic: true
    }))
    .then((response) => {
        console.log(`Gist generated: ${response.gistUrl}`);
        return Promise.resolve(response);
    })
    .then(response => releaseUtils.releases.create({
        draft: true,
        preRelease: false,
        tagName: ghostPackageInfo.version,
        releaseName: ghostPackageInfo.version + '+banana',
        userAgent: 'ghost-release',
        uri: `https://api.github.com/repos/${ORGNAME}/Ghost/releases`,
        github: {
            token: process.env.RELEASE_TOKEN
        },
        changelogPath: [{changelogPath: path.join(basePath, 'changelog.md')}],
        gistUrl: response.gistUrl
    }))
    .then((response) => {
        console.log(`Release draft generated: ${response.releaseUrl}`);
        return Promise.resolve(response);
    })
    .then(response => releaseUtils.releases.uploadZip({
        github: {
            token: process.env.RELEASE_TOKEN
        },
        zipPath: path.join(basePath, '.dist', 'release', zipName),
        uri: `${response.uploadUrl.substring(0, response.uploadUrl.indexOf('{'))}?name=${zipName}`,
        userAgent: 'ghost-release'
    }))
    .catch((err) => {
        console.error(err);
        process.exit(1);
    });
