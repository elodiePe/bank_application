import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Each test file opens its own Postgres schema + connection against Supabase, whose
    // free tier caps direct connections low — run files one at a time to stay under it.
    fileParallelism: false,
  },
});
