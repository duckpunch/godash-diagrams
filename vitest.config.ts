import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    exclude: ['external/**', 'node_modules/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      include: ['src/lib/**/*.ts'],
      exclude: [
        'src/lib/**/*.test.ts',
        'src/lib/**/__tests__/**',
        'src/main.ts',
        'external/**',
        'node_modules/**',
      ],
      // Thresholds disabled for now - will enable when we add diagram tests
      // thresholds: {
      //   lines: 80,
      //   functions: 80,
      //   branches: 80,
      //   statements: 80,
      // },
    },
  },
})
