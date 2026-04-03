import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'
import tailwindcss from 'tailwindcss'
import autoprefixer from 'autoprefixer'
import { resolve } from 'path'
import { tailwindConfig } from './tailwind.theme'

export default defineConfig({
  plugins: [vue(), vueJsx()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  css: {
    postcss: {
      plugins: [
        tailwindcss({
          content: [
            './index.html',
            './src/**/*.{ts,tsx}',
            './demo/**/*.{ts,tsx}',
          ],
          ...tailwindConfig,
        }),
        autoprefixer(),
      ],
    },
  },
  server: {
    port: 5173,
    open: true,
  },
})
