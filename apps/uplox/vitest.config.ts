import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
    test: {
        environment: 'node',
        globals: true,
        coverage: {
            provider: 'v8',
            reporter: ['text', 'json', 'json-summary', 'html'],
            reportsDirectory: './coverage',
            include: ['src/**/*.ts'],
            exclude: [
                'src/**/*.spec.ts',
                'src/**/*.test.ts',
                'src/**/__tests__/**',
                'src/**/__mocks__/**',
                'src/**/types.ts',
                'src/**/index.ts',
            ],
            thresholds: {
                global: {
                    branches: 80,
                    functions: 80,
                    lines: 80,
                    statements: 80,
                },
            },
        },
        include: ['src/**/*.{test,spec}.ts'],
        exclude: ['node_modules', 'dist', 'coverage'],
    },
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
            '@domain': path.resolve(__dirname, './src/domain'),
            '@shared': path.resolve(__dirname, './src/shared'),
            '@application': path.resolve(__dirname, './src/application'),
            '@presentation': path.resolve(__dirname, './src/presentation'),
            '@features': path.resolve(__dirname, './src/features'),
            '@infrastructure': path.resolve(__dirname, './src/infrastructure'),
        },
    },
});
