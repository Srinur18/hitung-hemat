import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  base: './', // wajib untuk Capacitor (berkas dimuat lokal)
  resolve: {
    alias: { '@shared': fileURLToPath(new URL('../shared', import.meta.url)) },
  },
  server: { host: true, fs: { allow: ['..'] } },
  build: { target: 'es2019', chunkSizeWarningLimit: 700 },
  test: { environment: 'node', include: ['tests/**/*.test.{js,jsx}'], testTimeout: 20000 },
});
