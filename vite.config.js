import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/main.ts'),
      name: 'ImageExtrude',
      fileName: 'bundle',
      formats: ['es']
    },
    rollupOptions: {
      // Externalize dependencies that CADit provides
      external: (id) => {
        // Externalize manifold-3d and jscad
        if (id.includes('manifold-3d') || id.includes('@jscad/modeling')) {
          return true;
        }
        return false;
      }
    },
    outDir: 'dist',
    emptyOutDir: false, // Don't delete type declarations
    target: 'esnext',
    minify: false // Keep readable for debugging
  }
});
