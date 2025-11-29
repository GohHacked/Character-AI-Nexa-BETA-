import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Загружаем env переменные, чтобы прокинуть API_KEY
  const env = loadEnv(mode, (process as any).cwd(), '');
  return {
    plugins: [react()],
    define: {
      // Прокидываем process.env.API_KEY для работы geminiService
      'process.env.API_KEY': JSON.stringify(env.API_KEY),
    },
    server: {
      host: true
    }
  };
});