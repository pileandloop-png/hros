import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      'firebase/app': path.resolve(__dirname, './src/services/mock/app.ts'),
      'firebase/auth': path.resolve(__dirname, './src/services/mock/auth.ts'),
      'firebase/firestore': path.resolve(__dirname, './src/services/mock/firestore.ts'),
      'firebase/storage': path.resolve(__dirname, './src/services/mock/storage.ts'),
      'firebase/functions': path.resolve(__dirname, './src/services/mock/functions.ts'),
    },
  },
  server: {
    port: 5173,
  },
});
