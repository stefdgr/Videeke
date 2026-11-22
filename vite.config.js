import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';

export default defineConfig({
  plugins: [preact()],
  server: {
    // `npm run dev` praat met de API die `npm run dev:api` op poort 8788 draait.
    proxy: { '/api': 'http://localhost:8788' },
  },
  test: { environment: 'node', include: ['tests/**/*.test.js'] },
});
