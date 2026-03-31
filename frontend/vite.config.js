import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'

const localUploadPlugin = () => ({
  name: 'local-upload',
  configureServer(server) {
    server.middlewares.use((req, res, next) => {
      if (req.url === '/api/upload' && req.method === 'POST') {
        let body = '';
        // Increase max payload size for images
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
          try {
            const { image, ext } = JSON.parse(body);
            const base64Data = image.replace(/^data:image\/\w+;base64,/, "");
            const filename = `campaign_${Date.now()}${ext}`;
            const uploadDir = path.resolve(process.cwd(), 'public/uploads');
            
            if (!fs.existsSync(uploadDir)) {
              fs.mkdirSync(uploadDir, { recursive: true });
            }
            
            fs.writeFileSync(path.join(uploadDir, filename), base64Data, 'base64');
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ url: `/uploads/${filename}` }));
          } catch (e) {
            res.statusCode = 500;
            res.end(JSON.stringify({ error: e.message }));
          }
        });
      } else {
        next();
      }
    });
  }
});

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), localUploadPlugin()],
  optimizeDeps: {
    include: ['tslib', '@rainbow-me/rainbowkit']
  }
})
