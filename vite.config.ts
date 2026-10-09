import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * `VITE_BASE` fija la ruta de publicación. En GitHub Pages el sitio vive bajo `/<repo>/`; en local
 * y en cualquier dominio propio es `/`. Todo el código arma sus URLs con `import.meta.env.BASE_URL`.
 */
export default defineConfig({
  base: process.env.VITE_BASE ?? '/',
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 1200,
  },
});
