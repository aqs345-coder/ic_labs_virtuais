import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  build: {
    rollupOptions: {
      input: {
        hub: 'index.html',
        refracao: 'labs/01-refracao/index.html',
      },
    },
  },
});