/**
 * @project/eslint-config
 *
 * Enterprise shared ESLint config for the monorepo.
 *
 * IMPORTANT: returns rules + overrides ONLY.
 * Each app registers its own plugins to avoid version conflicts.
 *
 * Usage:
 *
 *   import enterpriseRules from '@project/eslint-config';
 *
 *   export default [
 *     { plugins: { '@typescript-eslint': tseslint.plugin } },  // app's own
 *     ...enterpriseRules({ project: './tsconfig.json' }),
 *     // app-specific overrides
 *   ];
 */

// @ts-check
import tsParser from "@typescript-eslint/parser";

const OFF = "off";
const WARN = "warn";
const ERROR = "error";

const namingConvention = [
  ERROR,
  { selector: "typeAlias", format: ["PascalCase"] },
  { selector: "enum", format: ["PascalCase"] },
  { selector: "class", format: ["PascalCase"] },
  { selector: "function", format: ["camelCase"] },
  { selector: "method", format: ["camelCase"] },
  { selector: "variable", format: ["camelCase", "UPPER_CASE"], leadingUnderscore: "allow" },
  { selector: "parameter", format: ["camelCase"], leadingUnderscore: "allow" },
];

const unusedVars = [
  ERROR,
  {
    argsIgnorePattern: "^_",
    varsIgnorePattern: "^_",
    caughtErrorsIgnorePattern: "^_",
    destructuredArrayIgnorePattern: "^_",
    ignoreRestSiblings: true,
  },
];

const strictBoolean = [
  WARN,
  {
    allowString: false,
    allowNumber: false,
    allowNullableObject: true,
    allowNullableString: true,
    allowNullableNumber: true,
    allowNullableBoolean: false,
    allowAny: false,
  },
];

/**
 * @param {object} [opts]
 * @param {string} [opts.project="./tsconfig.json"]
 * @param {boolean} [opts.allowAnyInTests=true]
 * @param {boolean} [opts.isReact=false]  — relax naming for React components
 * @returns {import("eslint").Linter.FlatConfig[]}
 */
export default function enterpriseRules(opts = {}) {
  const {
    project = "./tsconfig.json",
    allowAnyInTests = true,
    isReact = false,
  } = opts;

  /** @type {import("eslint").Linter.FlatConfig[]} */
  const configs = [
    {
      ignores: [
        "**/dist/**",
        "**/node_modules/**",
        "**/.next/**",
        "**/out/**",
        "**/build/**",
        "**/drizzle/**",
      "**/generated/**",
      ],
    },

    // ─── Main source rules ───────────────────────────
    {
      files: ["src/**/*.ts", "src/**/*.tsx"],
      languageOptions: {
        parser: tsParser,
        parserOptions: {
          ecmaVersion: "latest",
          sourceType: "module",
          project,
        },
      },
      rules: {
        // SAFETY
        "@typescript-eslint/no-explicit-any": ERROR,
        "@typescript-eslint/no-non-null-assertion": ERROR,
        "@typescript-eslint/no-unnecessary-type-assertion": ERROR,
        "@typescript-eslint/prefer-nullish-coalescing": ERROR,
        "@typescript-eslint/prefer-optional-chain": ERROR,
        "@typescript-eslint/strict-boolean-expressions": strictBoolean,
        "@typescript-eslint/no-unnecessary-condition": WARN,
        "@typescript-eslint/no-unused-vars": unusedVars,

        // ASYNC
        "@typescript-eslint/no-floating-promises": ERROR,
        "@typescript-eslint/no-misused-promises": ERROR,
        "@typescript-eslint/await-thenable": ERROR,
        "@typescript-eslint/return-await": [ERROR, "in-try-catch"],
        "@typescript-eslint/only-throw-error": ERROR,
        "@typescript-eslint/prefer-promise-reject-errors": ERROR,

        // STYLE
        "@typescript-eslint/naming-convention": isReact
          ? [ERROR,
              { selector: "typeAlias", format: ["PascalCase"] },
              { selector: "enum", format: ["PascalCase"] },
              { selector: "class", format: ["PascalCase"] },
              { selector: "function", format: ["camelCase", "PascalCase"] },
              { selector: "variable", format: ["camelCase", "PascalCase", "UPPER_CASE"], leadingUnderscore: "allow" },
              { selector: "parameter", format: ["camelCase"], leadingUnderscore: "allow" },
            ]
          : namingConvention,
        "@typescript-eslint/consistent-type-imports": [
          ERROR,
          { prefer: "type-imports", fixStyle: "inline-type-imports" },
        ],
        "@typescript-eslint/array-type": [ERROR, { default: "array" }],
        "@typescript-eslint/no-inferrable-types": ERROR,
        "@typescript-eslint/no-duplicate-enum-values": ERROR,
        "no-var": ERROR,
        "prefer-const": ERROR,
        eqeqeq: [ERROR, "always", { null: "ignore" }],

        // MAINTAINABILITY
        "no-duplicate-imports": ERROR,
        "no-template-curly-in-string": ERROR,
        "no-console": [ERROR, { allow: ["warn", "error"] }],
      },
    },
  ];

  // ─── Overrides ─────────────────────────────────────
  configs.push(
    {
      files: ["**/*.spec.ts", "**/*.spec.tsx", "**/*.test.ts", "**/*.test.tsx", "test/**"],
      rules: {
        "@typescript-eslint/no-explicit-any": allowAnyInTests ? OFF : WARN,
        "@typescript-eslint/no-non-null-assertion": OFF,
        "@typescript-eslint/strict-boolean-expressions": OFF,
        "@typescript-eslint/no-unnecessary-condition": OFF,
        "no-console": OFF,
      },
    },
    {
      files: ["src/infrastructure/database/schema/**/*.ts", "**/drizzle/**"],
      rules: {
        "@typescript-eslint/no-explicit-any": OFF,
        "@typescript-eslint/no-non-null-assertion": OFF,
        "@typescript-eslint/naming-convention": OFF,
        "no-console": OFF,
      },
    },
    {
      files: ["scripts/**", "src/scripts/**"],
      rules: {
        "no-console": OFF,
      },
    },
  );

  return configs;
}
