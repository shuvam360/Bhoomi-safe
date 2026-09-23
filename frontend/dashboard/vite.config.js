import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';

export default defineConfig({
  base: process.env.GITHUB_PAGES === 'true' ? '/Bhoomi-safe/' : '/',
  plugins: [
    react(),
    {
      name: 'serve-citizen-app-live',
      configureServer(server) {
        server.middlewares.use('/citizen-app', (req, res, next) => {
          let reqPath = req.url.split('?')[0];
          if (reqPath === '' || reqPath === '/') {
            reqPath = '/index.html';
          }
          
          const filePath = path.resolve(__dirname, '../citizen-app', '.' + reqPath);
          if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
            const ext = path.extname(filePath).toLowerCase();
            const mimeTypes = {
              '.html': 'text/html; charset=utf-8',
              '.js': 'application/javascript; charset=utf-8',
              '.css': 'text/css; charset=utf-8',
              '.json': 'application/json; charset=utf-8',
              '.webmanifest': 'application/manifest+json; charset=utf-8',
              '.png': 'image/png',
              '.jpg': 'image/jpeg',
              '.svg': 'image/svg+xml',
              '.ico': 'image/x-icon'
            };
            res.setHeader('Content-Type', mimeTypes[ext] || 'application/octet-stream');
            if (reqPath.endsWith('sw.js')) {
              res.setHeader('Service-Worker-Allowed', '/citizen-app/');
            }
            return fs.createReadStream(filePath).pipe(res);
          }
          next();
        });
      }
    }
  ],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      }
    }
  }
});
