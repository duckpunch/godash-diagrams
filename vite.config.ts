import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  build: {
    lib: {
      // Entry point for your library
      entry: resolve(__dirname, 'src/lib/index.ts'),
      // Global variable name for UMD build (when used via script tag)
      name: 'GodashDiagrams',
      // Output file name (will generate godash-diagrams.js, godash-diagrams.umd.cjs, etc)
      fileName: 'godash-diagrams',
      // Output both ESM and UMD formats
      formats: ['es', 'umd'],
    },
    rollupOptions: {
      // Externalize deps that shouldn't be bundled into your library
      external: [],
    },
  },
})
