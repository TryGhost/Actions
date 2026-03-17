const js = require('@eslint/js');
const ghost = require('eslint-plugin-ghost');
const globals = require('globals');

const baseConfig = require(require.resolve('eslint-plugin-ghost/lib/config/base.js'));
const nodeConfig = ghost.configs.node;
const testConfig = ghost.configs.test;
const {
    ['ghost/node/no-restricted-require']: _noRestrictedRequire,
    ['ghost/filenames/match-exported-class']: _matchExportedClass,
    ['ghost/filenames/match-regex']: _matchRegex,
    ...nodeRules
} = nodeConfig.rules;
const {
    ['ghost/mocha/no-global-tests']: _noGlobalTests,
    ['ghost/mocha/max-top-level-suites']: _maxTopLevelSuites,
    ['ghost/mocha/no-mocha-arrows']: _noMochaArrows,
    ['ghost/mocha/no-async-describe']: _noAsyncDescribe,
    ...testRules
} = testConfig.rules;

module.exports = [
    {
        ignores: ['dist/**']
    },
    {
        files: ['**/*.js'],
        plugins: {
            ghost
        },
        languageOptions: {
            ecmaVersion: nodeConfig.parserOptions.ecmaVersion,
            sourceType: 'commonjs',
            globals: {
                ...globals.es2021,
                ...globals.node
            }
        },
        rules: {
            ...js.configs.recommended.rules,
            ...baseConfig.rules
        }
    },
    {
        files: ['src/**/*.js', 'scripts/**/*.js'],
        rules: {
            ...nodeRules
        }
    },
    {
        files: ['test/**/*.js'],
        languageOptions: {
            globals: {
                ...globals.es2021,
                ...globals.mocha,
                ...globals.node,
                should: 'readonly',
                sinon: 'readonly'
            }
        },
        rules: testRules
    },
    {
        files: ['src/helpers.js'],
        rules: {
            'ghost/filenames/match-exported-class': 'off'
        }
    }
];
