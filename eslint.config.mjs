// @ts-check
import eslint from '@eslint/js';
import globals from 'globals';
import stylistic from '@stylistic/eslint-plugin';
import tseslint from 'typescript-eslint';

export default tseslint.config(
    {
        ignores: ['eslint.config.mjs', 'dist/**', 'node_modules/**', 'coverage/**', '*.config.ts'],
    },

    // ── Base configs ──────────────────────────────────────────────
    eslint.configs.recommended,
    ...tseslint.configs.recommendedTypeChecked,

    // ── Language options ──────────────────────────────────────────
    {
        languageOptions: {
            globals: {
                ...globals.node,
            },
            sourceType: 'module',
            parserOptions: {
                project: ['./tsconfig.json', './tsconfig.test.json'],
                tsconfigRootDir: import.meta.dirname,
            },
        },
    },

    // ── Stylistic / formatting ────────────────────────────────────
    {
        plugins: {
            '@stylistic': stylistic,
        },
        rules: {
            // Indentation — 4 spaces
            '@stylistic/indent': ['warn', 4, {SwitchCase: 1}],

            // Quotes — single
            '@stylistic/quotes': ['warn', 'single', {avoidEscape: true}],

            // Semicolons — always
            '@stylistic/semi': ['warn', 'always'],

            // Trailing commas — never
            '@stylistic/comma-dangle': ['error', 'never'],

            // Brace style — 1TBS
            '@stylistic/brace-style': ['warn', '1tbs', {allowSingleLine: true}],

            // Arrow function parens — always
            '@stylistic/arrow-parens': ['warn', 'always'],

            // Spacing
            '@stylistic/comma-spacing': 'warn',
            '@stylistic/key-spacing': 'warn',
            '@stylistic/keyword-spacing': 'warn',
            '@stylistic/space-before-blocks': 'warn',
            '@stylistic/space-infix-ops': 'warn',
            '@stylistic/object-curly-spacing': ['warn', 'never'],
            '@stylistic/array-bracket-spacing': ['warn', 'never'],
            '@stylistic/space-before-function-paren': ['warn', {
                anonymous: 'always',
                named: 'never',
                asyncArrow: 'always',
            }],

            // Type annotation spacing
            '@stylistic/type-annotation-spacing': 'warn',

            // Block spacing
            '@stylistic/block-spacing': 'warn',

            // No multiple empty lines
            '@stylistic/no-multiple-empty-lines': ['warn', {max: 2, maxEOF: 1, maxBOF: 0}],

            // Trailing newline
            '@stylistic/eol-last': ['warn', 'always'],

            // No trailing spaces
            '@stylistic/no-trailing-spaces': 'warn',

            // Member delimiter style for interfaces/types
            '@stylistic/member-delimiter-style': ['warn', {
                multiline: {delimiter: 'semi', requireLast: true},
                singleline: {delimiter: 'semi', requireLast: false},
            }],
        },
    },

    // ── TypeScript rules ──────────────────────────────────────────
    {
        rules: {
            // Library code should be strict about any
            '@typescript-eslint/no-explicit-any': 'error',

            // Async safety
            '@typescript-eslint/no-floating-promises': 'error',
            '@typescript-eslint/no-unsafe-argument': 'error',
            '@typescript-eslint/no-unsafe-assignment': 'error',
            '@typescript-eslint/no-unsafe-member-access': 'error',
            '@typescript-eslint/no-unsafe-return': 'error',
            '@typescript-eslint/no-unsafe-call': 'error',

            // Prefer type-only imports where possible
            '@typescript-eslint/consistent-type-imports': ['error', {
                prefer: 'type-imports',
                fixStyle: 'inline-type-imports',
                disallowTypeAnnotations: false,
            }],

            // Unused variables
            '@typescript-eslint/no-unused-vars': ['error', {
                argsIgnorePattern: '^_',
                varsIgnorePattern: '^_',
                caughtErrorsIgnorePattern: '^_',
            }],

            // Naming conventions
            '@typescript-eslint/naming-convention': ['warn',
                {selector: 'variable', format: ['camelCase', 'UPPER_CASE', 'PascalCase'], leadingUnderscore: 'forbid'},
                {selector: 'function', format: ['camelCase']},
                {selector: 'typeLike', format: ['PascalCase']},
                {selector: 'enumMember', format: ['PascalCase']},
                {selector: 'classMethod', format: ['camelCase'], leadingUnderscore: 'forbid'},
                {selector: 'classProperty', format: ['camelCase', 'UPPER_CASE'], leadingUnderscore: 'forbid'},
                {selector: 'objectLiteralProperty', format: null},
                {selector: 'parameter', format: ['camelCase'], leadingUnderscore: 'allow'},
            ],

            // Require await in async functions
            '@typescript-eslint/require-await': 'error',
        },
    },

    // ── Best practices ────────────────────────────────────────────
    {
        rules: {
            // Equality — always strict
            'eqeqeq': ['error', 'always', {null: 'ignore'}],

            // Prefer const
            'prefer-const': 'warn',

            // No var
            'no-var': 'error',

            // Curly braces — always (even single-line)
            'curly': ['warn', 'all'],

            // No console — library code should not log
            'no-console': 'error',

            // No duplicate imports
            'no-duplicate-imports': 'warn',

            // Prefer template literals
            'prefer-template': 'warn',

            // No throw literals — throw Error objects
            'no-throw-literal': 'off',
            '@typescript-eslint/only-throw-error': 'error',

            // Prefer rest params over arguments
            'prefer-rest-params': 'warn',

            // Prefer spread over .apply()
            'prefer-spread': 'warn',

            // No useless constructors
            'no-useless-constructor': 'off',
            '@typescript-eslint/no-useless-constructor': 'warn',

            // Default exports discouraged
            'no-restricted-exports': ['warn', {
                restrictDefaultExports: {
                    direct: true,
                    named: true,
                    defaultFrom: true,
                    namedFrom: true,
                    namespaceFrom: true,
                },
            }],
        },
    },

    // ── Test file overrides ───────────────────────────────────────
    {
        files: ['test/**/*.ts'],
        rules: {
            '@typescript-eslint/no-non-null-assertion': 'off',
            '@typescript-eslint/no-unsafe-member-access': 'off',
            '@typescript-eslint/require-await': 'off',
            'no-console': 'off',
        },
    },
);
