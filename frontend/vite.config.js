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
  test: {
    environment: 'node',
    include: ['tests/**/*.test.{js,jsx}'],
    testTimeout: 20000,
    // Uji SELALU offline: jangan pakai VITE_API_URL dari frontend/.env, agar uji tidak memanggil
    // backend/Gemini sungguhan (hasil tidak menentu & menghabiskan kuota harian).
    env: { VITE_API_URL: '' },
    // Node ≥ 25 punya localStorage bawaan (tanpa penyimpanan → undefined) yang menutupi milik jsdom.
    // Matikan khusus di proses uji agar hasil sama di Node 22 dan Node 26.
    poolOptions: { forks: { execArgv: ['--no-experimental-webstorage'] } },
  },
});
