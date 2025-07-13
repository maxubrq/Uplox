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
        include: ['apps/uplox/src/**/*.spec.ts'],
        exclude: ['apps/scanner/src/**/*.spec.ts'],
    },
    resolve: {
        alias: {
            '@domain': path.resolve(__dirname, './apps/uplox/src/domain'),
            '@shared': path.resolve(__dirname, './apps/uplox/src/shared'),
            '@presign': path.resolve(__dirname, './apps/uplox/src/presign'),
            '@infrastructure': path.resolve(__dirname, './apps/uplox/src/infrastructure'),
            '@features': path.resolve(__dirname, './apps/uplox/src/features'),
            '@application': path.resolve(__dirname, './apps/uplox/src/application'),
            '@': path.resolve(__dirname, './apps/uplox/src'),
        },
    },
});
