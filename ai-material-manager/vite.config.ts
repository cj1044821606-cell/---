import path from 'path';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    root: path.resolve(__dirname, 'client'),
    base: '/',
    plugins: [react()],
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
