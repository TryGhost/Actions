#!/usr/bin/env node

/**
 * Script to retroactively label existing open PRs based on Ghost Foundation team membership
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
    console.error('Usage: node label-existing-prs.js --owner=OWNER --repo=REPO --token=TOKEN [--dry-run] [--start-page=N]');
    process.exit(1);
}

// Get starting page number
const startPage = parseInt(args['start-page']) || 1;

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
 * Check if a user is a core team member
 *
 * Note: We previously tried using team membership checks, but the GITHUB_TOKEN
 * used in Actions cannot access team membership data, even for "visible"
 * (non-secret) teams. This is a GitHub limitation.
 *
 * Instead, we identify core team members by:
 * 1. Being a member of the TryGhost organization AND
 * 2. Having write or admin access to the Admin repository
 *
 * This approach correctly distinguishes between:
 * - Core team (org member + write access to Admin)
 * - Contributors (org member + read access to Admin)
 * - Community (not org member)
 *
 * @param {string} username
 * @returns {Promise<boolean>}
 */
async function isGhostFoundationMember(username) {
    try {
        // First check org membership
        try {
            await octokit.rest.orgs.checkMembershipForUser({
                org: 'TryGhost',
                username: username
            });
            console.log(`   ✓ ${username} is a member of TryGhost org`);
        } catch (err) {
            if (err.status === 404) {
                console.log(`   ✗ ${username} is not a member of TryGhost org`);
                return false;
            }
            throw err;
        }

        // If they're an org member, check Admin repo permissions
        const {data} = await octokit.rest.repos.getCollaboratorPermissionLevel({
            owner: 'TryGhost',
            repo: 'Admin',
            username: username
        });

        const isCore = data.permission === 'write' || data.permission === 'admin';
        console.log(`   ${isCore ? '✓' : '✗'} ${username} has ${data.permission} access to Admin repo - ${isCore ? 'core team' : 'contributor'}`);
        return isCore;
    } catch (err) {
        console.error(`   ❌ Error checking permissions:`, err.message);
        return false;
    }
}

/**
 * Get a single page of pull requests
 * @param {number} page Page number to fetch
 * @returns {Promise<Array>} Array of PRs, empty if no more pages
 */
async function getPRPage(page) {
    const perPage = 100;
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

    try {
        const {data} = await octokit.rest.pulls.list({
            owner: args.owner,
            repo: args.repo,
            state: 'all',
            sort: 'updated',
            direction: 'desc',
            per_page: perPage,
            page: page
        });

        if (data.length === 0) {
            return [];
        }

        // Filter PRs updated after our cutoff date
        const recentPRs = data.filter(pr => new Date(pr.updated_at) > oneMonthAgo);
        console.log(`   Fetched page ${page} (${recentPRs.length} recent PRs out of ${data.length} total)`);

        return recentPRs;
    } catch (err) {
        console.error('❌ Error fetching PRs:', err.message);
        throw err;
    }
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

    console.log(`\n${progress} PR #${pr.number} by @${pr.user.login} (${pr.state})`);

    // Check if already has core team or community label first
    const existingLabel = getExistingLabel(pr);
    if (existingLabel) {
        console.log(`   ⏭️  Already labeled as "${existingLabel}"`);
        stats.alreadyLabeled++;
        return; // Skip to next PR
    }

    // Check if this is a dependency bot PR (e.g., Renovate, Dependabot)
    const isDependencyBot = (pr.user.type === 'Bot' || pr.user.login.includes('[bot]') || pr.user.login === 'renovate-bot') &&
                            (pr.user.login.includes('renovate') || pr.user.login.includes('dependabot'));

    if (isDependencyBot) {
        // Check if already has dependencies label
        const existingLabels = pr.labels.map(l => l.name.toLowerCase());
        if (existingLabels.includes('dependencies')) {
            console.log(`   ⏭️  Already labeled as "dependencies"`);
            stats.alreadyLabeled++;
        } else {
            console.log(`   🤖 Dependency bot PR - adding "dependencies" label`);
            await addLabel(pr, 'dependencies');
            stats.labeledAsDependencies = (stats.labeledAsDependencies || 0) + 1;
        }
    } else if (pr.user.type === 'Bot' || pr.user.login.includes('[bot]')) {
        // Skip other bot PRs that aren't dependency bots
        console.log(`   🤖 Skipping bot PR (not a dependency bot)`);
        stats.skippedBots = (stats.skippedBots || 0) + 1;
    } else {
        // Check if author is a Ghost Foundation team member
        const isMember = await isGhostFoundationMember(pr.user.login);
        const label = isMember ? 'core team' : 'community';

        await addLabel(pr, label);

        if (isMember) {
            stats.labeledAsCore++;
        } else {
            stats.labeledAsCommunity++;
        }
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
    console.log(`Starting from page: ${startPage}`);

    if (!isDryRun) {
        console.log('\n⚠️  WARNING: This will modify PR labels. Use --dry-run to preview changes first.');
    }
    console.log('');

    try {
        let currentPage = startPage;
        let keepGoing = true;

        console.log(`📋 Fetching PRs from ${args.owner}/${args.repo}...`);

        while (keepGoing) {
            // Get one page of PRs
            const prs = await getPRPage(currentPage);

            if (prs.length === 0) {
                console.log('\n📊 No more PRs to process');
                break;
            }

            // Update stats for this page
            stats.total = prs.length;
            stats.processed = 0;

            console.log(`\n📊 Processing ${prs.length} PRs from page ${currentPage}\n`);

            // Process each PR on this page
            for (const pr of prs) {
                await processPR(pr);

                // Add a small delay to avoid hitting rate limits
                await new Promise(resolve => setTimeout(resolve, 100));
            }

            // Ask if user wants to continue to next page
            console.log(`\n✅ Finished processing page ${currentPage}`);
            console.log('Press Ctrl+C to stop, or wait 5 seconds to continue to next page...');

            try {
                await new Promise(resolve => setTimeout(resolve, 5000));
                currentPage++;
            } catch (e) {
                keepGoing = false;
            }
        }

        // Print summary for all pages processed
        console.log('\n\n📈 Final Summary');
        console.log('==============');
        console.log(`Pages processed: ${currentPage - startPage + 1}`);
        console.log(`Already labeled: ${stats.alreadyLabeled}`);
        console.log(`Non-dependency bot PRs skipped: ${stats.skippedBots || 0}`);
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
main().catch((err) => {
    console.error('Unhandled error:', err);
    process.exit(1);
});
