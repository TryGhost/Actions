# PR Labeling Scripts

This directory contains utility scripts for managing PR labels.

## label-existing-prs.js

This script retroactively labels existing open PRs based on whether the author is a member of the Ghost Foundation organization.

### Prerequisites

1. Ensure you have Node.js installed
2. Install dependencies from the parent directory:
   ```bash
   cd ../
   yarn install
   ```
3. Create the required labels in your repository:
   - `core team` - for PRs from Ghost Foundation members
   - `community` - for PRs from external contributors
   - `dependencies` - for PRs from dependency bots (Renovate, Dependabot)

### Usage

```bash
# Dry run (preview changes without applying)
node label-existing-prs.js --owner=TryGhost --repo=Ghost --token=ghp_YOUR_TOKEN --dry-run

# Apply labels
node label-existing-prs.js --owner=TryGhost --repo=Ghost --token=ghp_YOUR_TOKEN
```

### Options

- `--owner` (required): GitHub organization or user name
- `--repo` (required): Repository name
- `--token` (required): GitHub personal access token with:
  - `repo` scope (to read PRs and add labels)
  - `read:org` scope (to check organization membership)
- `--dry-run` (optional): Preview changes without applying labels

### Creating a GitHub Token

1. Go to https://github.com/settings/tokens/new
2. Give it a descriptive name like "PR Labeling Script"
3. Select scopes:
   - `repo` (Full control of private repositories)
   - `read:org` (Read org and team membership)
4. Click "Generate token"
5. Copy the token immediately (you won't see it again)

### Example Output

```
🏷️  Ghost PR Labeling Script
============================
Repository: TryGhost/Ghost
Mode: DRY RUN

📋 Fetching open PRs from TryGhost/Ghost...
   Fetched page 1 (100 PRs)
   Fetched page 2 (20 PRs)

📊 Found 120 open PRs

[1/120] PR #1234 by @johndoe
   [DRY RUN] Would add label "community"

[2/120] PR #1235 by @ghost-member
   [DRY RUN] Would add label "core team"

[3/120] PR #1236 by @contributor
   ⏭️  Already labeled as "community"

[4/120] PR #1237 by @renovate[bot]
   🤖 Dependency bot PR - adding "dependencies" label

[5/120] PR #1238 by @some-other-bot[bot]
   🤖 Skipping bot PR (not a dependency bot)

...

📈 Summary
==========
Total PRs processed: 120
Non-dependency bot PRs skipped: 5
Already labeled: 15
Newly labeled as "dependencies": 10
Newly labeled as "core team": 20
Newly labeled as "community": 70
Errors: 0

⚠️  This was a DRY RUN. No labels were actually added.
Run without --dry-run to apply the labels.
```

### Troubleshooting

1. **"Missing required arguments" error**
   - Ensure you provide all required arguments: `--owner`, `--repo`, and `--token`

2. **"404 Not Found" errors**
   - Check that the repository exists and is accessible
   - Ensure your token has the necessary permissions

3. **"Label not found" errors**
   - Make sure the "core team" and "community" labels exist in the repository
   - Labels are case-sensitive

4. **Rate limiting**
   - The script includes a 100ms delay between PRs to avoid rate limits
   - If you hit rate limits, wait an hour and try again

### Notes

- The script only processes open PRs
- Dependency bot PRs (Renovate, Dependabot) get labeled as "dependencies"
- Other bot PRs are automatically skipped
- PRs that already have appropriate labels are skipped
- Organization membership is checked against the "TryGhost" organization
- The script provides progress updates and a summary at the end
