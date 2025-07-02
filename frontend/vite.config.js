export default defineConfig({
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
