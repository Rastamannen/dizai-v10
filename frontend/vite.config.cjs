const { defineConfig } = require('vite');
const react = require('@vitejs/plugin-react');

module.exports = defineConfig({
  base: '/',
  plugins: [react()],
  server: {
    proxy: {
      '/api': 'http://localhost:3001',
      '/tts': 'http://localhost:3001',
      '/exercises': 'http://localhost:3001'
    }
  },
  build: {
    outDir: 'dist'
  }
});
