// @ts-check
const tsPlugin = require("@typescript-eslint/eslint-plugin");
const enterpriseRules = require("@project/eslint-config").default;

/** @type {import("eslint").Linter.FlatConfig[]} */
module.exports = [
  // Plugin registration (app's own — avoids version conflicts)
  { plugins: { "@typescript-eslint": tsPlugin } },

  // Enterprise shared rules
  ...enterpriseRules({ project: "./tsconfig.json" }),

  // ─── API-specific: security framework (reflection-heavy) ─────────
  {
    files: ["src/core/security/**/*.ts", "src/shared/**/*.ts"],
    rules: {
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-non-null-assertion": "off",
    },
  },

  // ─── API-specific: seed files (allow any + console) ─────────────
  {
    files: ["src/infrastructure/database/seed*.ts", "src/infrastructure/database/seed-*.ts"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-non-null-assertion": "off",
      "@typescript-eslint/naming-convention": "off",
      "no-console": "off",
    },
  },

  // ─── API-specific: shared workflow engine (under cleanup) ────────
  {
    files: ["src/shared/workflow/**/*.ts"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-non-null-assertion": "off",
      "@typescript-eslint/no-unnecessary-condition": "off",
    },
  },

  // ─── API-specific: general codebase overrides to match existing codebase structure ───
  {
    files: ["src/**/*.ts", "test/**/*.ts"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-non-null-assertion": "off",
      "@typescript-eslint/prefer-nullish-coalescing": "off",
      "@typescript-eslint/naming-convention": "off",
      "@typescript-eslint/strict-boolean-expressions": "off",
      "@typescript-eslint/no-unnecessary-condition": "off",
      "@typescript-eslint/no-floating-promises": "off",
      "@typescript-eslint/no-misused-promises": "off",
      "@typescript-eslint/no-unused-vars": "off",
      "@typescript-eslint/return-await": "off",
      "no-duplicate-imports": "off",
      "no-console": "off",
    },
  },
];
