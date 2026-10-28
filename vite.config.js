import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Caminhos relativos: funciona no endereço provisório (github.io/NeonPosts/)
// e na raiz de neonposts.com.br sem trocar nada
export default defineConfig({
  plugins: [react()],
  base: './',
})
