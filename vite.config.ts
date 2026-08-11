import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  // GitHub Pages serves the app from /<repo>/, everywhere else from the root.
  // The build sets VITE_BASE_PATH; the app reads the result as BASE_URL and
  // hands it to the router, so moving to a VPS or Vercel needs no code change.
  base: process.env.VITE_BASE_PATH || '/',
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
})
