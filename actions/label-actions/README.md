# Label Actions

A GitHub Action to help the Ghost core team with triaging across our many repositories.

Loosely inspired by [Label Actions](https://github.com/dessant/label-actions) by dessant.

## Develop

1. `git clone` this repo & `cd` into it as usual
2. `cd actions/label-actions`
3. Run `pnpm install --frozen-lockfile` to install this action's dependencies.
4. Run `pnpm lint` and `pnpm test` before changing packaged behavior.

## Building

- `pnpm build` will compile `src/*` and dependencies into `dist/index.js`

## Publishing

Be sure to include `dist/` when committing to GitHub 🙂

# Copyright & License

Copyright (c) 2013-2026 Ghost Foundation - Released under the [MIT license](LICENSE).
