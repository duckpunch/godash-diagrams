import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/lib/auto.ts'),
      name: 'GodashDiagrams',
      fileName: 'godash-diagrams.auto',
      // Use IIFE format for auto-init (runs immediately when loaded)
      formats: ['iife'],
    },
    rollupOptions: {
      external: [],
    },
    outDir: 'dist',
    emptyOutDir: false, // Don't empty dist directory (preserve files from previous build)
  },
})
