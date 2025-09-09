// vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import tailwindcss from '@tailwindcss/vite';
import { nodePolyfills } from 'vite-plugin-node-polyfills';

export default defineConfig({
  plugins: [
    tailwindcss(),
    react(),
    nodePolyfills({
      exclude: [],
      globals: { // For polyfilling global variables like 'Buffer', 'global', 'process'
        Buffer: true,
        global: true, // This attempts to polyfill 'global'
        process: true,
      },
      protocolImports: true, // For 'node:' protocol imports
    }),
  ],
  resolve: {
    alias: {
      'stream': "stream"
    },
  },
  optimizeDeps: {
    esbuildOptions: {
      define: {
        global: 'globalThis',
      },
    },
  },
  server: {
    port: 5173,
    host: '0.0.0.0',
    allowedHosts: ['anoghost-front.onrender.com'],
  },
});