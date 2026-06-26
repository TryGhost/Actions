# Actions

Reusable GitHub Actions and workflow templates for Ghost repositories.

This repo contains two packaged Node actions under `actions/*`, plus reusable
workflows under `.github/workflows` that other Ghost repositories call from
their own CI.

## Actions

- `actions/label-actions`: triages issues and pull requests by applying labels,
  leaving standard comments, closing stale `needs:info` items, and enabling
  auto-merge when the matching label is applied.
- `actions/slack-build`: sends a Slack build notification for a workflow run
  using `SLACK_WEBHOOK_URL`.

Each action is a standalone pnpm package. There is no root package manager
workspace, so run installs and checks from the action directory you are changing.

```sh
cd actions/label-actions
pnpm install --frozen-lockfile
pnpm lint
pnpm test
pnpm build
```

Use the same command sequence from `actions/slack-build` when changing that
action.

When runtime code changes, run `pnpm build` and commit the regenerated `dist/`
output with the source change. GitHub Actions loads the packaged files declared
in each action's `action.yml`.

## Reusable workflows

- `.github/workflows/test.yml`: reusable Yarn-based test workflow for downstream
  repositories.
- `.github/workflows/lint-only.yml`: reusable Yarn-based lint workflow for
  downstream repositories.
- `.github/workflows/repo-ci.yml`: this repository's own pnpm-based validation
  for the packaged actions.

## Copyright & License

Copyright (c) 2013-2026 Ghost Foundation - Released under the [MIT license](LICENSE).
