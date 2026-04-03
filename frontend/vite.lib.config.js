import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

// Library build – produces an ESM + UMD bundle
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.js'),
      name: 'ChemSchemaEditor',
      fileName: (format) => `chemschema-editor.${format === 'es' ? 'js' : 'umd.cjs'}`,
    },
    rollupOptions: {
      // Vue must not be bundled – consumers supply it
      external: ['vue'],
      output: {
        exports: 'named',
        globals: {
          vue: 'Vue',
        },
        // Preserve CSS file
        assetFileNames: (assetInfo) => {
          if (assetInfo.name === 'style.css') return 'style.css'
          return assetInfo.name
        },
      },
    },
    sourcemap: true,
  },
})
