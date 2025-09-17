#!/usr/bin/env node

/**
 * Script to retroactively label existing open PRs based on Ghost Foundation membership
 *
 * Usage:
 *   node label-existing-prs.js --owner=TryGhost --repo=Ghost --token=ghp_xxx
 *   node label-existing-prs.js --owner=TryGhost --repo=Ghost --token=ghp_xxx --dry-run
 *
 * Options:
 *   --owner    GitHub organization/owner name (required)
 *   --repo     Repository name (required)
 *   --token    GitHub personal access token with repo and read:org permissions (required)
 *   --dry-run  Preview changes without applying labels (optional)
 */

const github = require('@actions/github');

// Parse command line arguments
const args = process.argv.slice(2).reduce((acc, arg) => {
    const [key, value] = arg.split('=');
    // If no value is provided (e.g., --dry-run), set it to true
    acc[key.replace('--', '')] = value !== undefined ? value : true;
    return acc;
}, {});

// Validate required arguments
if (!args.owner || !args.repo || !args.token) {
    console.error('❌ Missing required arguments');
    console.error('Usage: node label-existing-prs.js --owner=OWNER --repo=REPO --token=TOKEN [--dry-run]');
    process.exit(1);
}

const octokit = github.getOctokit(args.token);

// Check if dry-run mode is enabled (handles --dry-run, --dry-run=true, --dry-run=1, etc.)
const isDryRun = args['dry-run'] === true || args['dry-run'] === 'true' || args['dry-run'] === '1' || args['dry-run'] === '';

// Statistics tracking
const stats = {
    total: 0,
    alreadyLabeled: 0,
    labeledAsCore: 0,
    labeledAsCommunity: 0,
    errors: 0,
    processed: 0
};

/**
 * Check if a user is a member of the Ghost Foundation organization
 * @param {string} username
 * @returns {Promise<boolean>}
 */
async function isGhostFoundationMember(username) {
    try {
        await octokit.rest.orgs.checkMembershipForUser({
            org: 'TryGhost',
            username: username
        });
        return true;
    } catch (err) {
        if (err.status === 404) {
            return false;
        }
        console.error(`⚠️  Error checking org membership for ${username}:`, err.message);
        return false;
    }
}

/**
 * Get all open pull requests
 * @returns {Promise<Array>}
 */
async function getAllOpenPRs() {
    const prs = [];
    let page = 1;
    const perPage = 100;

    console.log(`📋 Fetching open PRs from ${args.owner}/${args.repo}...`);

    while (true) {
        try {
            const { data } = await octokit.rest.pulls.list({
                owner: args.owner,
                repo: args.repo,
                state: 'open',
                per_page: perPage,
                page: page
            });

            if (data.length === 0) {
                break;
            }

            prs.push(...data);
            console.log(`   Fetched page ${page} (${data.length} PRs)`);
            page++;

            // If we got less than perPage results, we've reached the end
            if (data.length < perPage) {
                break;
            }
        } catch (err) {
            console.error('❌ Error fetching PRs:', err.message);
            throw err;
        }
    }

    return prs;
}

/**
 * Check if a PR already has a core team or community label
 * @param {Object} pr
 * @returns {string|null} Returns the existing label name or null
 */
function getExistingLabel(pr) {
    const labels = pr.labels.map(l => l.name.toLowerCase());
    if (labels.includes('core team')) {
        return 'core team';
    }
    if (labels.includes('community')) {
        return 'community';
    }
    return null;
}

/**
 * Add a label to a PR
 * @param {Object} pr
 * @param {string} label
 */
async function addLabel(pr, label) {
    if (isDryRun) {
        console.log(`   [DRY RUN] Would add label "${label}"`);
        return;
    }

    try {
        await octokit.rest.issues.addLabels({
            owner: args.owner,
            repo: args.repo,
            issue_number: pr.number,
            labels: [label]
        });
        console.log(`   ✅ Added label "${label}"`);
    } catch (err) {
        console.error(`   ❌ Failed to add label:`, err.message);
        stats.errors++;
    }
}

/**
 * Process a single PR
 * @param {Object} pr
 */
async function processPR(pr) {
    stats.processed++;
    const progress = `[${stats.processed}/${stats.total}]`;

    console.log(`\n${progress} PR #${pr.number} by @${pr.user.login}`);

    // Check if this is a dependency bot PR (e.g., Renovate, Dependabot)
    const isDependencyBot = (pr.user.type === 'Bot' || pr.user.login.includes('[bot]') || pr.user.login === 'renovate-bot') &&
                            (pr.user.login.includes('renovate') || pr.user.login.includes('dependabot'));

    if (isDependencyBot) {
        // Check if already has dependencies label
        const existingLabels = pr.labels.map(l => l.name.toLowerCase());
        if (existingLabels.includes('dependencies')) {
            console.log(`   ⏭️  Already labeled as "dependencies"`);
            stats.alreadyLabeled++;
            return;
        }

        console.log(`   🤖 Dependency bot PR - adding "dependencies" label`);
        await addLabel(pr, 'dependencies');
        stats.labeledAsDependencies = (stats.labeledAsDependencies || 0) + 1;
        return;
    }

    // Skip other bot PRs that aren't dependency bots
    if (pr.user.type === 'Bot' || pr.user.login.includes('[bot]')) {
        console.log(`   🤖 Skipping bot PR (not a dependency bot)`);
        stats.skippedBots = (stats.skippedBots || 0) + 1;
        return;
    }

    // Check if already labeled
    const existingLabel = getExistingLabel(pr);
    if (existingLabel) {
        console.log(`   ⏭️  Already labeled as "${existingLabel}"`);
        stats.alreadyLabeled++;
        return;
    }

    // Check if author is a Ghost Foundation member
    const isMember = await isGhostFoundationMember(pr.user.login);
    const label = isMember ? 'core team' : 'community';

    await addLabel(pr, label);

    if (isMember) {
        stats.labeledAsCore++;
    } else {
        stats.labeledAsCommunity++;
    }
}

/**
 * Main function
 */
async function main() {
    console.log('🏷️  Ghost PR Labeling Script');
    console.log('============================');
    console.log(`Repository: ${args.owner}/${args.repo}`);
    console.log(`Mode: ${isDryRun ? '🔍 DRY RUN (no changes will be made)' : '⚡ LIVE (labels will be applied)'}`);
    
    if (!isDryRun) {
        console.log('\n⚠️  WARNING: This will modify PR labels. Use --dry-run to preview changes first.');
    }
    console.log('');

    try {
        // Get all open PRs
        const prs = await getAllOpenPRs();
        stats.total = prs.length;

        console.log(`\n📊 Found ${stats.total} open PRs\n`);

        if (stats.total === 0) {
            console.log('No open PRs found. Exiting.');
            return;
        }

        // Process each PR
        for (const pr of prs) {
            await processPR(pr);

            // Add a small delay to avoid hitting rate limits
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        // Print summary
        console.log('\n\n📈 Summary');
        console.log('==========');
        console.log(`Total PRs processed: ${stats.processed}`);
        console.log(`Non-dependency bot PRs skipped: ${stats.skippedBots || 0}`);
        console.log(`Already labeled: ${stats.alreadyLabeled}`);
        console.log(`Newly labeled as "dependencies": ${stats.labeledAsDependencies || 0}`);
        console.log(`Newly labeled as "core team": ${stats.labeledAsCore}`);
        console.log(`Newly labeled as "community": ${stats.labeledAsCommunity}`);
        console.log(`Errors: ${stats.errors}`);

        if (isDryRun) {
            console.log('\n⚠️  This was a DRY RUN. No labels were actually added.');
            console.log('Run without --dry-run to apply the labels.');
        }

    } catch (err) {
        console.error('\n❌ Fatal error:', err.message);
        process.exit(1);
    }
}

// Run the script
main().catch(err => {
    console.error('Unhandled error:', err);
    process.exit(1);
});
