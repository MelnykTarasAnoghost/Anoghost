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
      // Check plugin docs if 'stream/promises' needs explicit mention here
    }),
  ],
  resolve: {
    alias: {
      'stream': "stream"
      // Ensure 'stream: 'stream-browserify'' is NOT present here
      // Add other aliases if needed, but not for 'stream' if using nodePolyfills for it
    },
  },
  optimizeDeps: {
    esbuildOptions: {
      define: {
        global: 'globalThis', // KEEP THIS if it solves 'global is undefined' errors
      },
      // You might also need to ensure esbuild can resolve 'stream/promises' if it's involved here
      // For example, by ensuring 'stream' itself is correctly handled or by explicitly excluding
      // problematic packages from optimizeDeps if they are the source and should be handled by plugins.
    },
  },
});