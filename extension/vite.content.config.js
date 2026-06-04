import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    emptyOutDir: false,
    rollupOptions: {
      input: {
        content: resolve(__dirname, 'src/content.jsx'),
      },
      output: {
        entryFileNames: 'content.js',
        assetFileNames: 'content.[ext]',
        chunkFileNames: 'content.js',
      },
    },
  },
});
