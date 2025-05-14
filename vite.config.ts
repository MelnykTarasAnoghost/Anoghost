import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { nodePolyfills } from 'vite-plugin-node-polyfills'
import tailwindcss from '@tailwindcss/vite'


export default defineConfig({
  plugins: [
    tailwindcss(), react(),
    nodePolyfills({
      protocolImports: true,
    })
  ],
  // resolve: {
  //   alias: {
  //     stream: 'stream-browserify',
  //     buffer: 'buffer',
  //     process: 'process/browser'
  //   }
  // },
  // define: {
  //   global: 'globalThis',
  //   'process.env': {}
  // },
  // optimizeDeps: {
  //   include: ['buffer', 'process', 'stream']
  // }
})
