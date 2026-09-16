import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      base: '/AIAG-VDA-PFMEA/',
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        // Ekrandaki sürüm damgası: tarayıcı eski bundle'ı önbellekten
        // çalıştırdığında fark edilsin (yayın sonrası "yeni mi eski mi"
        // sorusu tahminle cevaplanıyordu).
        __BUILD__: JSON.stringify(
          new Date().toISOString().slice(0, 16).replace('T', ' ') + ' UTC'),
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
