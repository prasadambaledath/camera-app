import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  base: mode === 'production' ? '/camera-check/' : '/',
  plugins: [react()],
  server: {
    open: true,
  },
}))