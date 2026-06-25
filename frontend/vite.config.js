import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import basicSsl from '@vitejs/plugin-basic-ssl';

export default defineConfig({
  plugins: [
    react(),
    basicSsl()  // Enables HTTPS with auto-generated self-signed certificate
  ],
  server: {
    port: 5173,
    host: true, // Expose on all network interfaces (0.0.0.0)
    https: true, // Required for WebRTC getUserMedia on mobile devices over LAN
    proxy: {
      '/api': {
        target: 'http://localhost:5001',
        changeOrigin: true,
        secure: false
      },
      '/uploads': {
        target: 'http://localhost:5001',
        changeOrigin: true,
        secure: false
      },
      '/socket.io': {
        target: 'http://localhost:5001',
        ws: true,
        secure: false
      }
    }
  }
});
