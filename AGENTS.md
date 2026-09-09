# AGENTS.md

## Overview
- This repository contains reusable GitHub Actions under `actions/*`.
- Each action is a standalone Node package with its own `package.json` and `pnpm-lock.yaml`.
- There is no root `package.json`; installs, builds, and tests are run from the specific action directory you are changing.

## Repository Layout
- `actions/label-actions`: multi-file action with source in `src/`, tests in `test/`, helper scripts in `scripts/`, and compiled output in `dist/index.js`.
- `actions/slack-build`: single-file action with source in `index.js` and compiled output in `dist/index.js`.
- `.github/workflows/repo-ci.yml`: validates this repository on pull requests and on pushes to `main`, using Node `22`.
- `.github/workflows/rebuild-dist.yml`: rebuilds and pushes `dist/` on Renovate pull requests, which cannot run `pnpm build` themselves.
- `.github/workflows/test.yml` and `.github/workflows/lint-only.yml`: reusable workflows for other repositories; current reusable CI runs on Node `20` and `22`.

## Working Rules
- Scope changes to the action being modified. Do not introduce a root workspace or root package tooling unless explicitly requested.
- Keep the existing JavaScript/CommonJS style unless there is a strong reason to change it.
- Treat each action's `action.yml` as the public contract. Keep inputs, outputs, and runtime behavior aligned.
- When runtime code changes for a packaged action, rebuild the compiled artifact and commit the whole of `dist/`. `pnpm build` clears `dist/` first, because ncc numbers its chunk files by content and stale chunks would otherwise pile up.
- CI enforces this with `git diff --exit-code -- <action>/dist`, so a PR that changes what ends up inside a bundle must carry the rebuilt bundle with it.
- Do not hand-edit generated `dist/` files unless regeneration is impossible.

## Validation
- `actions/label-actions`: `pnpm install --frozen-lockfile && pnpm lint && pnpm test && pnpm build`
- `actions/slack-build`: `pnpm install --frozen-lockfile && pnpm lint && pnpm test && pnpm build`
- If you touch lint or CI behavior, also review `.github/workflows/repo-ci.yml`, `.github/workflows/test.yml`, and `.github/workflows/lint-only.yml`.

## Notes
- Both action packages have automated Vitest coverage.
- The repository CI expects pnpm-based installs and commands for local action packages; reusable workflows may still use Yarn for downstream repositories.
- Packaged action manifests currently target the GitHub Actions `node20` runtime.
- Renovate cannot run `pnpm build`, so `rebuild-dist.yml` commits the rebuilt bundles onto its branches. It pushes with a GitHub App token because pushes made with `GITHUB_TOKEN` do not trigger workflow runs, which would leave the PR stuck on a stale failing check.
