import { defineConfig } from 'vite';

export default defineConfig({
  assetsInclude: ['**/*.splinecode'],
  publicDir: 'public',
  server: {
    fs: {
      strict: false
    }
  }
});
