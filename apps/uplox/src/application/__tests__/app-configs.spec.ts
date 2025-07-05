import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { UploxAppConfigs } from '../app-configs';

describe('UploxAppConfigs', () => {
    const originalEnv = process.env;

    beforeEach(() => {
        // Reset environment variables before each test
        vi.resetModules();
        process.env = { ...originalEnv };
    });

    afterEach(() => {
        // Restore original environment variables
        process.env = originalEnv;
    });

    describe('fromEnv', () => {
        it('should create instance with default values when no environment variables are set', () => {
            // Clear all relevant environment variables
            delete process.env.NODE_ENV;
            delete process.env.REDIS_URL;
            delete process.env.DATABASE_URL;
            delete process.env.MINIO_ENDPOINT;
            delete process.env.MINIO_PORT;
            delete process.env.MINIO_ACCESS_KEY;
            delete process.env.MINIO_SECRET_KEY;
            delete process.env.MINIO_BUCKET;
            delete process.env.MINIO_REGION;
            delete process.env.SCANNER_HOST;
            delete process.env.SCANNER_PORT;
            delete process.env.PORT;
            delete process.env.LOG_LEVEL;
            delete process.env.LOG_USE_JSON;

            const config = UploxAppConfigs.fromEnv();

            expect(config.nodeEnv).toBe('development');
            expect(config.redisUrl).toBe('redis://localhost:6379');
            expect(config.databaseUrl).toBe('postgresql://localhost:5432/uplox');
            expect(config.minioEndpoint).toBe('localhost:9000');
            expect(config.minioPort).toBe(9000);
            expect(config.minioAccessKey).toBe('miniosuperadmin');
            expect(config.minioSecretKey).toBe('miniosuperadmin');
            expect(config.minioBucket).toBe('uplox');
            expect(config.minioRegion).toBe('us-east-1');
            expect(config.scannerHost).toBe('localhost');
            expect(config.scannerPort).toBe(3310);
            expect(config.port).toBe(3000);
            expect(config.logLevel).toBe('debug');
            expect(config.logUseJson).toBe(true);
        });

        it('should create instance with custom values when environment variables are set', () => {
            process.env.NODE_ENV = 'test';
            process.env.REDIS_URL = 'redis://test-redis:6379';
            process.env.DATABASE_URL = 'postgresql://test-db:5432/test_uplox';
            process.env.MINIO_ENDPOINT = 'test-minio:9001';
            process.env.MINIO_PORT = '9001';
            process.env.MINIO_ACCESS_KEY = 'test-access-key';
            process.env.MINIO_SECRET_KEY = 'test-secret-key';
            process.env.MINIO_BUCKET = 'test-bucket';
            process.env.MINIO_REGION = 'eu-west-1';
            process.env.SCANNER_HOST = 'test-scanner';
            process.env.SCANNER_PORT = '3311';
            process.env.PORT = '3001';
            process.env.LOG_LEVEL = 'warn';
            process.env.LOG_USE_JSON = 'false';

            const config = UploxAppConfigs.fromEnv();

            expect(config.nodeEnv).toBe('test');
            expect(config.redisUrl).toBe('redis://test-redis:6379');
            expect(config.databaseUrl).toBe('postgresql://test-db:5432/test_uplox');
            expect(config.minioEndpoint).toBe('test-minio:9001');
            expect(config.minioPort).toBe(9001);
            expect(config.minioAccessKey).toBe('test-access-key');
            expect(config.minioSecretKey).toBe('test-secret-key');
            expect(config.minioBucket).toBe('test-bucket');
            expect(config.minioRegion).toBe('eu-west-1');
            expect(config.scannerHost).toBe('test-scanner');
            expect(config.scannerPort).toBe(3311);
            expect(config.port).toBe(3001);
            expect(config.logLevel).toBe('debug'); // Should be debug since NODE_ENV is not production
            expect(config.logUseJson).toBe(true); // Should be true since NODE_ENV is not production
        });

        it('should handle production environment correctly', () => {
            process.env.NODE_ENV = 'production';
            process.env.LOG_LEVEL = 'error';
            process.env.LOG_USE_JSON = 'true';

            const config = UploxAppConfigs.fromEnv();

            expect(config.nodeEnv).toBe('production');
            expect(config.logLevel).toBe('error');
            expect(config.logUseJson).toBe(true);
        });

        it('should use default log level in production when LOG_LEVEL is not set', () => {
            process.env.NODE_ENV = 'production';
            delete process.env.LOG_LEVEL;

            const config = UploxAppConfigs.fromEnv();

            expect(config.nodeEnv).toBe('production');
            expect(config.logLevel).toBe('info');
        });

        it('should handle LOG_USE_JSON=false in production', () => {
            process.env.NODE_ENV = 'production';
            process.env.LOG_USE_JSON = 'false';

            const config = UploxAppConfigs.fromEnv();

            expect(config.nodeEnv).toBe('production');
            expect(config.logUseJson).toBe(false);
        });

        it('should handle LOG_USE_JSON with truthy value in production', () => {
            process.env.NODE_ENV = 'production';
            process.env.LOG_USE_JSON = 'true';

            const config = UploxAppConfigs.fromEnv();

            expect(config.nodeEnv).toBe('production');
            expect(config.logUseJson).toBe(true);
        });

        it('should handle LOG_USE_JSON with falsy value in production', () => {
            process.env.NODE_ENV = 'production';
            process.env.LOG_USE_JSON = '';

            const config = UploxAppConfigs.fromEnv();

            expect(config.nodeEnv).toBe('production');
            expect(config.logUseJson).toBe(false);
        });

        it('should parse numeric environment variables correctly', () => {
            process.env.MINIO_PORT = '9999';
            process.env.SCANNER_PORT = '4444';
            process.env.PORT = '8080';

            const config = UploxAppConfigs.fromEnv();

            expect(config.minioPort).toBe(9999);
            expect(config.scannerPort).toBe(4444);
            expect(config.port).toBe(8080);
        });

        it('should handle invalid numeric environment variables', () => {
            process.env.MINIO_PORT = 'invalid';
            process.env.SCANNER_PORT = 'also-invalid';
            process.env.PORT = 'not-a-number';

            const config = UploxAppConfigs.fromEnv();

            expect(config.minioPort).toBeNaN();
            expect(config.scannerPort).toBeNaN();
            expect(config.port).toBeNaN();
        });

        it('should handle empty string environment variables', () => {
            process.env.REDIS_URL = '';
            process.env.DATABASE_URL = '';
            process.env.MINIO_ENDPOINT = '';

            const config = UploxAppConfigs.fromEnv();

            expect(config.redisUrl).toBe('redis://localhost:6379');
            expect(config.databaseUrl).toBe('postgresql://localhost:5432/uplox');
            expect(config.minioEndpoint).toBe('localhost:9000');
        });

        it('should create multiple instances correctly', () => {
            const config1 = UploxAppConfigs.fromEnv();
            const config2 = UploxAppConfigs.fromEnv();

            expect(config1).not.toBe(config2); // Different instances
            expect(config1.nodeEnv).toBe(config2.nodeEnv); // Same values
        });
    });

    describe('configuration properties', () => {
        it('should have all readonly properties accessible', () => {
            const config = UploxAppConfigs.fromEnv();

            // Test that all properties are accessible
            expect(typeof config.nodeEnv).toBe('string');
            expect(typeof config.redisUrl).toBe('string');
            expect(typeof config.databaseUrl).toBe('string');
            expect(typeof config.minioEndpoint).toBe('string');
            expect(typeof config.minioPort).toBe('number');
            expect(typeof config.minioAccessKey).toBe('string');
            expect(typeof config.minioSecretKey).toBe('string');
            expect(typeof config.minioBucket).toBe('string');
            expect(typeof config.minioRegion).toBe('string');
            expect(typeof config.scannerHost).toBe('string');
            expect(typeof config.scannerPort).toBe('number');
            expect(typeof config.port).toBe('number');
            expect(typeof config.logLevel).toBe('string');
            expect(typeof config.logUseJson).toBe('boolean');
        });
    });
});
