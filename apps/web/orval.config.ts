import { defineConfig } from "orval";

export default defineConfig({
  api: {
    input: {
      target: "./openapi.json",
    },
    output: {
      target: "./src/api/generated",
      schemas: "./src/api/generated/model",
      client: "react-query",
      mode: "tags-split",
      clean: true,
      override: {
        mutator: {
          path: "./src/lib/fetcher.ts",
          name: "customFetch",
        },
        query: {
          useInfinite: true,
        },
      },
    },
  },
});
