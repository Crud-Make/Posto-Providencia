import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
    test: {
        environment: 'jsdom',
        globals: true,
        include: ['**/*.test.{ts,tsx}'],
    },
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './apps/web/src'),
            '@posto/types': path.resolve(__dirname, './packages/types/src/index.ts'),
            '@posto/utils': path.resolve(__dirname, './packages/utils/src/index.ts'),
            '@posto/api-core': path.resolve(__dirname, './packages/api-core/src/index.ts'),
        },
    },
});
