
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const target =
  process.env.VITE_AI_PROXY_TARGET || 'http://127.0.0.1:8787';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5179,

    // Allowed hostnames for accessing the Vite dev server
    allowedHosts: [
      'localhost',
      '127.0.0.1',
      'http://cogniflow.nukelab.in/',
      'https://cogniflow.nukelab.in/',
      'cogniflow.nukelab.in',
      // Add your custom hostname here, e.g.:
      // 'myapp.example.com',
    ],

    proxy: {
      '/ai-api': {
        target,
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/ai-api/, ''),
      },
    },
  },
});
