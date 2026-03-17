# AGENTS.md

## Overview
- This repository contains reusable GitHub Actions under `actions/*`.
- Each action is a standalone Node package with its own `package.json` and `yarn.lock`.
- There is no root `package.json`; installs, builds, and tests are run from the specific action directory you are changing.

## Repository Layout
- `actions/ghost-release`: single-file action with source in `index.js` and compiled output in `dist/index.js`.
- `actions/label-actions`: multi-file action with source in `src/`, tests in `test/`, helper scripts in `scripts/`, and compiled output in `dist/index.js`.
- `actions/slack-build`: single-file action with source in `index.js` and compiled output in `dist/index.js`.
- `.github/workflows/`: shared CI workflows; current CI runs on Node `20` and `22`.

## Working Rules
- Scope changes to the action being modified. Do not introduce a root workspace or root package tooling unless explicitly requested.
- Keep the existing JavaScript/CommonJS style unless there is a strong reason to change it.
- Treat each action's `action.yml` as the public contract. Keep inputs, outputs, and runtime behavior aligned.
- When runtime code changes for a packaged action, rebuild the compiled artifact and commit the updated `dist/index.js`.
- Do not hand-edit generated `dist/` files unless regeneration is impossible.

## Validation
- `actions/ghost-release`: `yarn && yarn lint && yarn build`
- `actions/label-actions`: `yarn && yarn test && yarn build`
- `actions/slack-build`: `yarn && yarn build`
- If you touch lint or CI behavior, also review `.github/workflows/test.yml` and `.github/workflows/lint-only.yml`.

## Notes
- `label-actions` is the only action with an automated test suite in this repository.
- The shared CI workflow expects Yarn-based installs and commands.
