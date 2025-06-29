import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
    test: {
        environment: 'node',
        coverage: {
            provider: 'v8',
            reporter: ['text', 'json', 'json-summary', 'html'],
            reportsDirectory: './coverage',
            include: ['apps/**/*.ts'],
        },
        include: ['apps/**/*.spec.ts'],
    },
    resolve: {
        alias: {
            '@domain': path.resolve(__dirname, './apps/uplox/src/domain'),
            '@shared': path.resolve(__dirname, './apps/uplox/src/shared'),
            '@': path.resolve(__dirname, './apps/uplox/src'),
        },
    },
});
