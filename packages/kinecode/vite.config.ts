import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    outDir: 'dist',
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'KineCode',
      formats: ['es', 'umd'],
      fileName: (format) => `kinecode.${format === 'es' ? 'js' : 'umd.cjs'}`
    },
    target: 'es2022'
  }
});
