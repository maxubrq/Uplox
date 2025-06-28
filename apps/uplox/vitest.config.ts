import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
    test: {
        environment: 'node',
    },
    resolve: {
        alias: {
            '@domain': path.resolve(__dirname, './src/domain'),
            '@shared': path.resolve(__dirname, './src/shared'),
            '@': path.resolve(__dirname, './src'),
        },
    },
});
