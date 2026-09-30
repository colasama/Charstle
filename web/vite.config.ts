import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// 开发时 UI 跑在 5173，/api 与 /ws 转发到 Core 的管理端口（默认 8899）
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': { target: 'http://127.0.0.1:8899', changeOrigin: true, ws: true },
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    chunkSizeWarningLimit: 2000,
  },
});
