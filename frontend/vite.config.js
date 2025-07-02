import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Proxy API-förfrågningar till backend under utveckling
      '/api': 'http://localhost:3001',
      '/tts': 'http://localhost:3001',
      '/exercises': 'http://localhost:3001'
    }
  },
  // Bygg ut till "dist" som standard (Render gillar det)
  build: {
    outDir: 'dist'
  }
});
