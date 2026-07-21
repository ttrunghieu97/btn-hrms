import { defineConfig } from 'orval';

export default defineConfig({
  api: {
    input: {
      target: './openapi.json'
    },
    output: {
      target: './src/api/generated/endpoints.ts',
      schemas: './src/api/generated/model',
      client: 'react-query',
      mode: 'single',
      clean: true,
      override: {
        mutator: {
          path: './src/lib/fetcher.ts',
          name: 'customFetch'
        },
        query: {
          useQuery: true,
          useInfinite: true,
          useMutation: true
        }
      }
    }
  }
});
