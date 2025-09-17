# Team Visibility and Label Actions

## The GitHub Limitation

GitHub teams have two visibility levels:
- **"Visible"** (API: "closed") - Only visible to organization members
- **"Secret"** (API: "secret") - Hidden from org members not in the team

**There is no "public" option anymore!** GitHub removed truly public teams.

## What This Means

The `ghost-foundation` team is set to "Visible", which means:
- ✅ Organization members can see it
- ❌ GITHUB_TOKEN cannot read team membership
- ❌ Always returns 404 for membership checks

## The Solution: Repository Permission Fallback

The current implementation is the best approach:

1. **Try team membership first** - Works when using a PAT with read:org
2. **Fall back to repository permissions** - Works with GITHUB_TOKEN

This is not a workaround - it's the recommended pattern given GitHub's limitations.

## How It Works

The action uses a two-tier approach:

1. **Primary method**: Check `ghost-foundation` team membership directly
2. **Fallback method**: Check repository permissions (when team check returns 403)

### Classification Logic

- **Core team**:
  - Members of `ghost-foundation` team OR
  - Have write/admin access to BOTH Ghost AND Admin repositories
- **Community**:
  - Everyone else (including org members with only partial write access)
- **Dependency bots**: Get labeled "dependencies"

This approach correctly handles:
- Pure community contributors (read-only access)
- Community members with some privileges (write to Ghost, read to Admin)
- Core team members (write to both key repositories)

The fallback ensures the action works correctly for PRs from forks without requiring secrets.
