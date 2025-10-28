import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],

  // Path aliases
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@/components/ui': path.resolve(__dirname, './src/components/ui'),
      '@/components/kopia': path.resolve(__dirname, './src/components/kopia'),
      '@/lib/utils': path.resolve(__dirname, './src/lib/utils'),
      '@/lib/kopia': path.resolve(__dirname, './src/lib/kopia'),
      '@/tauri': path.resolve(__dirname, './src-tauri'),
    },
  },

  // Tauri expects a fixed port
  server: {
    port: 1420,
    strictPort: true,
  },

  // Env prefix for Vite
  envPrefix: ['VITE_', 'TAURI_'],

  // Build optimizations
  build: {
    target: 'esnext',
    minify: !process.env.TAURI_DEBUG ? 'esbuild' : false,
    sourcemap: !!process.env.TAURI_DEBUG,
  },
});
