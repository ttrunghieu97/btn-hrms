module.exports = {
  forbidden: [
    {
      name: 'no-circular',
      severity: 'error',
      comment: 'Circular dependency detected. Please refactor your modules to resolve the loop.',
      from: {},
      to: {
        circular: true
      }
    },
    {
      name: 'shared-purity',
      severity: 'error',
      comment: 'Shared layer must not depend on features to preserve infrastructure isolation.',
      from: {
        path: '^(src/shared/|src/lib/|src/components/ui/|src/hooks/)'
      },
      to: {
        path: '^src/features/'
      }
    },
    {
      name: 'no-imports-to-app',
      severity: 'error',
      comment: 'App/routing layer must not be imported by features, shared, or lib.',
      from: {
        path: '^(src/features/|src/shared/|src/lib/|src/components/)'
      },
      to: {
        path: '^src/app/'
      }
    },
    {
      name: 'feature-boundary-violation',
      severity: 'error',
      comment: 'A feature must never import internal modules of another feature. Communicate strictly via the Public API facade (index.ts).',
      from: {
        path: '^src/features/([^/]+)/'
      },
      to: {
        path: '^src/features/([^/]+)/.+$',
        pathNot: [
          '^src/features/$1/',
          '^src/features/([^/]+)/index\\.ts$',
          '^src/features/([^/]+)/index$',
          '^src/features/([^/]+)/components/table/index$' // Allowed special table exports if needed (usually none)
        ]
      }
    }
  ],
  options: {
    doNotFollow: {
      path: 'node_modules'
    },
    tsPreCompilationDeps: true,
    tsConfig: {
      fileName: 'tsconfig.json'
    }
  }
};
