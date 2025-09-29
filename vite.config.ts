/// <reference types="vitest" />
import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';

export default defineConfig({
  plugins: [
    dts({
      include: ['src/**/*'],
      exclude: ['src/**/*.test.ts', 'src/**/*.spec.ts'],
      rollupTypes: true,
    }),
  ],
  build: {
    lib: {
      entry: {
        index: resolve(__dirname, 'src/index.ts'),
        'auth/index': resolve(__dirname, 'src/auth/index.ts'),
        'firestore/index': resolve(__dirname, 'src/firestore/index.ts'),
        'database/index': resolve(__dirname, 'src/database/index.ts'),
        'functions/index': resolve(__dirname, 'src/functions/index.ts'),
        'messaging/index': resolve(__dirname, 'src/messaging/index.ts'),
        'storage/index': resolve(__dirname, 'src/storage/index.ts'),
      },
      fileName: (format, entryName) => {
        const extension = format === 'es' ? 'js' : 'cjs';
        return `${entryName}.${extension}`;
      },
    },
    rollupOptions: {
      external: [
        'react',
        'firebase/app',
        'firebase/auth',
        'firebase/firestore',
        'firebase/database',
        'firebase/functions',
        'firebase/messaging',
        'firebase/storage',
      ],
      output: [
        {
          format: 'es',
          preserveModules: true,
          preserveModulesRoot: 'src',
          entryFileNames: '[name].js',
          globals: {
            react: 'React',
          },
        },
        {
          format: 'cjs',
          preserveModules: true,
          preserveModulesRoot: 'src',
          entryFileNames: '[name].cjs',
          globals: {
            react: 'React',
          },
        },
      ],
    },
    sourcemap: true,
    minify: true,
  },
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['src/**/*.{test,spec}.{js,ts,tsx}'],
    setupFiles: [],
    testTimeout: 10000,
  },
});
