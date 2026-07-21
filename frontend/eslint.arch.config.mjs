import enterpriseRules from '@project/eslint-config';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import nextPlugin from '@next/eslint-plugin-next';

const productionSurfaceFiles = [
  'src/app/**/*.{ts,tsx}',
  'src/features/**/*.{ts,tsx}',
  'src/components/**/*.{ts,tsx}',
  'src/lib/**/*.{ts,tsx}',
  'src/config/**/*.{ts,tsx}'
];

const productionSurfaceIgnores = [
  'src/api/generated/**',
  'src/lib/fetcher.ts',
  'src/features/react-query-demo/**',
  'src/features/change-password/queries/change-password-mutation.ts',
  'src/features/employees/hooks/use-employee-file-upload.ts',
  'src/features/employees/queries/employee-queries.ts',
  'src/features/payroll/**',
  'src/features/shifts/**',
  'src/features/approval/**',
  'src/**/*.spec.ts',
  'src/**/*.spec.tsx'
];

const hardcodedUiCopyLegacyIgnores = [
  'src/lib/generated/**',
  'src/features/payroll/**',
  'src/features/shifts/**',
  'src/features/kanban/**',
  'src/features/tasks/**',
  'src/features/users/**',
  'src/features/approval/**',
  'src/components/**',
  'src/config/**'
];

const featureLayerIgnores = [
  'src/features/react-query-demo/**',
  'src/features/change-password/queries/change-password-mutation.ts',
  'src/features/employees/hooks/use-employee-file-upload.ts',
  'src/features/employees/queries/employee-queries.ts',
  'src/features/payroll/**',
  'src/features/shifts/**',
  'src/features/approval/**',
  'src/**/*.spec.ts',
  'src/**/*.spec.tsx'
];

const rawApiPathRestriction = {
  selector: "Literal[value=/\\/api\\/v1\\//], TemplateElement[value.raw=/.*\\/api\\/v1\\/.*/]",
  message: "Raw '/api/v1/' paths are forbidden outside approved infra/generated files."
};

const sharedConfig = enterpriseRules({ project: './tsconfig.json', isReact: true });

export default [
  // Plugin registration (app's own — avoids version conflicts)
  { plugins: { '@typescript-eslint': tseslint.plugin } },

  ...sharedConfig,
  {
    ignores: [
      '.next/**',
      'out/**',
      'build/**',
      'next-env.d.ts',
      'scripts/**',
      'src/api/generated/**',
      '**/*.spec.ts',
      '**/*.spec.tsx',
      '**/*.test.ts',
      '**/*.test.tsx',
      '**/__tests__/**'
    ]
  },
  {
    linterOptions: {
      reportUnusedDisableDirectives: 'off'
    },
    plugins: {
      'react-hooks': reactHooks,
      '@next/next': nextPlugin
    },
    languageOptions: {
      parser: tseslint.parser
    }
  },
  {
    files: ['src/features/**/*.{ts,tsx}'],
    ignores: featureLayerIgnores,
    rules: {
      'no-restricted-globals': [
        'error',
        {
          name: 'fetch',
          message:
            'Feature layer must not call fetch directly. Use generated API client through domain query/service modules.'
        }
      ],
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: '@/lib/fetcher',
              importNames: ['customFetch'],
              message:
                'Feature layer must not import customFetch. Use generated API client only.'
            },
            {
              name: 'axios',
              message: 'Feature layer must not import axios. Use generated API client only.'
            }
          ],
          patterns: [
            {
              group: ['axios', 'axios/*'],
              message: 'Feature layer must not use axios. Use generated API client only.'
            }
          ]
        }
      ],
      'no-restricted-syntax': [
        'error',
        {
          selector: "CallExpression[callee.name='fetch']",
          message:
            'Feature layer must not call fetch directly. Use generated API client only.'
        },
        {
          selector: "CallExpression[callee.name='customFetch']",
          message:
            'Feature layer must not call customFetch directly. Use generated API client only.'
        },
        rawApiPathRestriction
      ]
    }
  },
  {
    files: productionSurfaceFiles,
    ignores: productionSurfaceIgnores,
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: '@/constants/mock-api',
              message: 'Production surface must not import mock modules.'
            },
            {
              name: '@/constants/mock-api-users',
              message: 'Production surface must not import mock modules.'
            },
            {
              name: '@faker-js/faker',
              message: 'Production surface must not import demo/mock tooling.'
            }
          ],
          patterns: [
            {
              group: ['@/features/react-query-demo', '@/features/react-query-demo/**'],
              message: 'Production surface must not import demo features.'
            },
            {
              group: ['**/*demo*', '**/*mock*', '**/fixtures/**'],
              message: 'Production surface must not import demo/mock modules.'
            }
          ]
        }
      ],
      'no-restricted-syntax': ['error', rawApiPathRestriction]
    }
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    ignores: ['src/api/generated/**'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: "CallExpression[callee.property.name='toLocaleDateString']",
          message:
            "Use formatDateVN() from @/lib/date instead of toLocaleDateString(). 'vi-VN' locale is already built in."
        },
        {
          selector:
            "CallExpression[callee.object.callee.property.name='toISOString'][callee.property.name='slice']",
          message:
            "Use formatDateForInput() or todayDateString() from @/lib/date instead of .toISOString().slice(0, 10). UTC extraction shifts dates for VN timezone."
        },
        {
          selector:
            "CallExpression[callee.object.callee.property.name='toISOString'][callee.property.name='split']",
          message:
            "Use formatDateForInput() or todayDateString() from @/lib/date instead of .toISOString().split('T')[0]. UTC extraction shifts dates for VN timezone."
        }
      ]
    }
  },
  {
    files: productionSurfaceFiles,
    ignores: [...productionSurfaceIgnores, ...hardcodedUiCopyLegacyIgnores],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: "JSXText[value=/.*[A-Za-z]{3,}.*/]",
          message:
            'Hardcoded UI text is forbidden. Move copy to src/locales/vi/* (or shared copy facade) and reference it from code.'
        },
        {
          selector:
            "JSXAttribute[name.name=/^(title|description|label|placeholder|emptyMessage|subject|alt|aria-label|pageTitle|pageDescription)$/] > Literal[value=/[A-Za-z]{3,}/]",
          message:
            'Hardcoded UI attribute text is forbidden. Move copy to src/locales/vi/* (or shared copy facade).'
        },
        {
          selector:
            "Property[key.name=/^(title|description|label|placeholder|emptyMessage|subject|pageTitle|pageDescription|message)$/][value.type='Literal'][value.value=/[A-Za-z]{3,}/]",
          message:
            'Hardcoded UI copy object is forbidden outside src/locales/vi/*. Move this string to a locale/copy module.'
        }
      ]
    }
  },
  {
    files: ['src/app/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/features/*/**', '!@/features/*', '!@/features/*/server'],
              message: 'Pages/Routes must only import from the feature public API facade (@/features/name) or server facade (@/features/name/server).'
            }
          ]
        }
      ]
    }
  },
  {
    files: ['src/features/*/index.ts'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: 'ExportAllDeclaration',
          message: 'Exporting * from a Public API facade is forbidden. Use explicit exports instead.'
        }
      ]
    }
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/prefer-nullish-coalescing': 'off',
      '@typescript-eslint/naming-convention': 'off',
      '@typescript-eslint/strict-boolean-expressions': 'off',
      '@typescript-eslint/no-unnecessary-condition': 'off',
      '@typescript-eslint/no-floating-promises': 'off',
      '@typescript-eslint/no-misused-promises': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/return-await': 'off',
      '@typescript-eslint/no-unnecessary-type-assertion': 'off',
      '@typescript-eslint/consistent-type-imports': 'off',
      '@typescript-eslint/array-type': 'off',
      '@typescript-eslint/prefer-optional-chain': 'off',
      '@typescript-eslint/prefer-promise-reject-errors': 'off',
      'no-duplicate-imports': 'off',
      'no-restricted-syntax': 'off',
      'no-restricted-imports': 'off',
      'no-restricted-globals': 'off',
      'no-console': 'off'
    }
  }
];
