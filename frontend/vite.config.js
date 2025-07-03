const { defineConfig } = require('vite');
const react = require('@vitejs/plugin-react');
const path = require('path');

module.exports = defineConfig({
  base: '/',
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
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
