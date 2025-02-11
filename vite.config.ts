import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    lib: {
      entry: new URL('./src/index.ts', import.meta.url).pathname,
      name: 'MeshGradient',
      fileName: (format) => `mesh-gradient.${format}.js`,
    },
    rollupOptions: {
      output: [
        {
          format: 'es',
          entryFileNames: 'mesh-gradient.esm.js',
        },
        {
          format: 'umd',
          entryFileNames: 'mesh-gradient.umd.js',
          name: 'MeshGradient',
        },
        {
          format: 'cjs',
          entryFileNames: 'mesh-gradient.cjs.js',
        }
      ],
    },
  },
});
