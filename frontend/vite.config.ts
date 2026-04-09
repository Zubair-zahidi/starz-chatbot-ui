// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  // Tailwind is handled via PostCSS (postcss.config.js) to avoid native-binary bundling issues in config load.
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/socket.io': {
        target: 'http://localhost:3001',
        ws: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return;
          if (id.includes('three')) return 'three';
          if (id.includes('react-router-dom') || id.includes('react-dom') || id.includes('react'))
            return 'react-vendor';
          if (id.includes('@radix-ui')) return 'ui-vendor';
          return 'vendor';
        },
      },
    },
  },
})
