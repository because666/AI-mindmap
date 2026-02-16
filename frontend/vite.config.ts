import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './',  // 使用相对路径，适配任何域名
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    // 确保生成正确的资源引用
    rollupOptions: {
      output: {
        // 保持资源文件路径简单
        assetFileNames: 'assets/[name]-[hash][extname]',
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
      },
    },
  },
})
