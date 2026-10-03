import { defineConfig } from 'vite';

export default defineConfig({
  base: '/ic_labs_virtuais/',
  build: {
    rollupOptions: {
      input: {
        hub: 'index.html',
        refracao: 'labs/01-refracao/index.html',
      },
    },
  },
});