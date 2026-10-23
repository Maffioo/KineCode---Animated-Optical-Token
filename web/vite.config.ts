import { defineConfig } from 'vite';
import basicSsl from '@vitejs/plugin-basic-ssl';
import { resolve } from 'path';

export default defineConfig({
  server: {
    port: 3000,
    host: true
  },
  plugins: [basicSsl()],
  resolve: {
    alias: {
      kinecode: resolve(__dirname, '../packages/kinecode/src/index.ts')
    }
  },
  build: {
    outDir: 'dist',
    target: 'esnext',
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        scanner: resolve(__dirname, 'scanner.html')
      }
    }
  }
});
