const fs = require('fs');
const path = require('path');
const semver = require('semver');
const releaseUtils = require('@tryghost/release-utils');

const ORGNAME = 'TryGhost';
const basePath = process.env.GITHUB_WORKSPACE || process.cwd();

const ghostPackageInfo = JSON.parse(fs.readFileSync(path.join(basePath, 'package.json')));
const zipName = `Ghost-${ghostPackageInfo.version}.zip`;
let gistUrl, githubUploadURL;

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

releaseUtils.releases.get({
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
    gistUrl = response.gistUrl;
    console.log(`Gist generated: ${gistUrl}`);
    return Promise.resolve();
})
.then(() => releaseUtils.releases.create({
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
    gistUrl: gistUrl
}))
.then((response) => {
    githubUploadURL = response.uploadUrl;
    console.log(`Release draft generated: ${response.releaseUrl}`);
    return Promise.resolve();
})
.then(() => releaseUtils.releases.uploadZip({
    github: {
        token: process.env.RELEASE_TOKEN
    },
    zipPath: path.join(basePath, '.dist', 'release', zipName),
    uri: `${githubUploadURL.substring(0, githubUploadURL.indexOf('{'))}?name=${zipName}`,
    userAgent: 'ghost-release'
}))
.catch((err) => {
    console.error(err);
    process.exit(1);
});
