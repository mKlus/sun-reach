import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react()],
  // GitHub Pages project site lives at /sun-reach/. Local and preview stay /.
  base: process.env.BASE_PATH || '/',
  test: {
    include: ['src/**/*.test.ts'],
  },
})
