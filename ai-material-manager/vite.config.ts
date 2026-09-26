import path from 'path';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    root: path.resolve(__dirname, 'client'),
    base: '/',
    plugins: [react()],
    define: {
      __APP_BUILD_ID__: JSON.stringify(
        process.env.APP_BUILD_ID || Date.now().toString(36),
      ),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'client/src'),
        '@client': path.resolve(__dirname, 'client'),
        '@shared': path.resolve(__dirname, 'shared'),
      },
    },
    build: {
      outDir: path.resolve(__dirname, 'dist/client'),
      emptyOutDir: false,
      rollupOptions: {
        output: {
          // 把几乎不变的第三方库拆成独立文件：发版只改业务代码时，浏览器仍可复用这部分缓存
          manualChunks: {
            'vendor-react': [
              'react',
              'react-dom',
              'react-dom/client',
              'react-router-dom',
              'scheduler',
            ],
            'vendor-query': [
              '@tanstack/react-query',
              '@tanstack/react-query-persist-client',
              '@tanstack/query-sync-storage-persister',
            ],
          },
        },
      },
    },
    server: {
      host: env.CLIENT_HOST || '0.0.0.0',
      port: Number(env.CLIENT_PORT || 8080),
      proxy: {
        '/api': {
          target: `http://${env.SERVER_HOST || '127.0.0.1'}:${env.SERVER_PORT || env.PORT || '3000'}`,
          changeOrigin: true,
        },
        '/healthz': {
          target: `http://${env.SERVER_HOST || '127.0.0.1'}:${env.SERVER_PORT || env.PORT || '3000'}`,
          changeOrigin: true,
        },
      },
    },
  };
});
