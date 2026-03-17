const js = require('@eslint/js');
const ghost = require('eslint-plugin-ghost');
const globals = require('globals');

const baseConfig = require(require.resolve('eslint-plugin-ghost/lib/config/base.js'));
const nodeConfig = ghost.configs.node;

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
            ...baseConfig.rules,
            ...nodeConfig.rules
        }
    },
    {
        files: ['**/index.js'],
        rules: nodeConfig.overrides[0].rules
    }
];
