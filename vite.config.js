import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Publicado na raiz de neonposts.com.br, por isso base '/'
export default defineConfig({
  plugins: [react()],
  base: '/',
})
