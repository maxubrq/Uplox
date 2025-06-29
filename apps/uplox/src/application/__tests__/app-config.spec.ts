import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { UploxAppConfigLoader, UploxAppConfig } from '../app-config';

describe('UploxAppConfigLoader', () => {
    let configLoader: UploxAppConfigLoader;
    let originalEnv: NodeJS.ProcessEnv;

    beforeEach(() => {
        configLoader = new UploxAppConfigLoader();
        // Store original environment variables
        originalEnv = { ...process.env };
        // Clear all environment variables that we'll be testing
        delete process.env.NODE_ENV;
        delete process.env.REDIS_URL;
        delete process.env.DATABASE_URL;
        delete process.env.MINIO_ENDPOINT;
        delete process.env.MINIO_PORT;
        delete process.env.MINIO_ACCESS_KEY;
        delete process.env.MINIO_SECRET_KEY;
        delete process.env.MINIO_BUCKET;
        delete process.env.MINIO_REGION;
    });

    afterEach(() => {
        // Restore original environment variables
        process.env = originalEnv;
    });

    describe('loadFromEnv', () => {
        it('should return default values when no environment variables are set', () => {
            const config = configLoader.loadFromEnv();

            const expectedConfig: UploxAppConfig = {
                nodeEnv: 'development',
                redisUrl: 'redis://localhost:6379',
                databaseUrl: 'postgresql://localhost:5432/uplox',
                minioEndpoint: 'storage',
                minioPort: '9000',
                minioAccessKey: 'miniosuperadmin',
                minioSecretKey: 'miniosuperadmin',
                minioBucket: 'uplox',
                minioRegion: 'us-east-1',
            };

            expect(config).toEqual(expectedConfig);
        });

        it('should return custom values when all environment variables are set', () => {
            // Set custom environment variables
            process.env.NODE_ENV = 'production';
            process.env.REDIS_URL = 'redis://prod-redis:6379';
            process.env.DATABASE_URL = 'postgresql://prod-db:5432/uplox_prod';
            process.env.MINIO_ENDPOINT = 'prod-minio';
            process.env.MINIO_PORT = '9001';
            process.env.MINIO_ACCESS_KEY = 'prod-access-key';
            process.env.MINIO_SECRET_KEY = 'prod-secret-key';
            process.env.MINIO_BUCKET = 'uplox-prod';
            process.env.MINIO_REGION = 'eu-west-1';

            const config = configLoader.loadFromEnv();

            const expectedConfig: UploxAppConfig = {
                nodeEnv: 'production',
                redisUrl: 'redis://prod-redis:6379',
                databaseUrl: 'postgresql://prod-db:5432/uplox_prod',
                minioEndpoint: 'prod-minio',
                minioPort: '9001',
                minioAccessKey: 'prod-access-key',
                minioSecretKey: 'prod-secret-key',
                minioBucket: 'uplox-prod',
                minioRegion: 'eu-west-1',
            };

            expect(config).toEqual(expectedConfig);
        });

        it('should mix default and custom values when some environment variables are set', () => {
            // Set only some environment variables
            process.env.NODE_ENV = 'staging';
            process.env.MINIO_ENDPOINT = 'staging-minio';
            process.env.MINIO_BUCKET = 'uplox-staging';

            const config = configLoader.loadFromEnv();

            const expectedConfig: UploxAppConfig = {
                nodeEnv: 'staging',
                redisUrl: 'redis://localhost:6379', // default
                databaseUrl: 'postgresql://localhost:5432/uplox', // default
                minioEndpoint: 'staging-minio',
                minioPort: '9000', // default
                minioAccessKey: 'miniosuperadmin', // default
                minioSecretKey: 'miniosuperadmin', // default
                minioBucket: 'uplox-staging',
                minioRegion: 'us-east-1', // default
            };

            expect(config).toEqual(expectedConfig);
        });

        it('should handle empty string environment variables by preserving them', () => {
            // Set environment variables to empty strings
            process.env.NODE_ENV = '';
            process.env.REDIS_URL = '';
            process.env.DATABASE_URL = '';

            const config = configLoader.loadFromEnv();

            // Empty strings are preserved because ?? operator only handles null/undefined
            expect(config.nodeEnv).toBe('');
            expect(config.redisUrl).toBe('');
            expect(config.databaseUrl).toBe('');
            // Other values should still use defaults
            expect(config.minioEndpoint).toBe('storage');
            expect(config.minioBucket).toBe('uplox');
        });

        it('should use defaults when environment variables are undefined', () => {
            // Explicitly ensure variables are undefined (they already are from beforeEach)
            expect(process.env.NODE_ENV).toBeUndefined();
            expect(process.env.REDIS_URL).toBeUndefined();
            expect(process.env.DATABASE_URL).toBeUndefined();

            const config = configLoader.loadFromEnv();

            // Undefined values should use defaults due to ?? operator
            expect(config.nodeEnv).toBe('development');
            expect(config.redisUrl).toBe('redis://localhost:6379');
            expect(config.databaseUrl).toBe('postgresql://localhost:5432/uplox');
        });

        it('should handle different NODE_ENV values correctly', () => {
            const environments = ['development', 'production', 'test', 'staging'];

            environments.forEach(env => {
                process.env.NODE_ENV = env;
                const config = configLoader.loadFromEnv();
                expect(config.nodeEnv).toBe(env);
            });
        });

        it('should return a new object instance on each call', () => {
            const config1 = configLoader.loadFromEnv();
            const config2 = configLoader.loadFromEnv();

            expect(config1).toEqual(config2);
            expect(config1).not.toBe(config2); // Different object instances
        });

        it('should handle special characters in environment variables', () => {
            process.env.MINIO_ACCESS_KEY = 'key-with-dashes_and_underscores123';
            process.env.MINIO_SECRET_KEY = 'secret!@#$%^&*()+={}[]|\\:";\'<>?,./';
            process.env.DATABASE_URL = 'postgresql://user:pass@host:5432/db?ssl=true&option=value';

            const config = configLoader.loadFromEnv();

            expect(config.minioAccessKey).toBe('key-with-dashes_and_underscores123');
            expect(config.minioSecretKey).toBe('secret!@#$%^&*()+={}[]|\\:";\'<>?,./');
            expect(config.databaseUrl).toBe('postgresql://user:pass@host:5432/db?ssl=true&option=value');
        });
    });
});
