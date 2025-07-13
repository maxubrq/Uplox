import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { UploxAppConfigs } from '../app-configs';

describe('UploxAppConfigs', () => {
    let originalEnv: NodeJS.ProcessEnv;

    beforeEach(() => {
        // Store original environment variables
        originalEnv = { ...process.env };
        
        // Clear all environment variables that might affect the tests
        delete process.env.NODE_ENV;
        delete process.env.REDIS_URL;
        delete process.env.DATABASE_URL;
        delete process.env.MINIO_ENDPOINT;
        delete process.env.MINIO_PORT;
        delete process.env.MINIO_ACCESS_KEY;
        delete process.env.MINIO_SECRET_KEY;
        delete process.env.MINIO_BUCKET;
        delete process.env.MINIO_REGION;
        delete process.env.MINIO_USE_SSL;
        delete process.env.SCANNER_HOST;
        delete process.env.SCANNER_PORT;
        delete process.env.PORT;
        delete process.env.LOG_LEVEL;
        delete process.env.LOG_USE_JSON;
    });

    afterEach(() => {
        // Restore original environment variables
        process.env = originalEnv;
    });

    describe('default values', () => {
        it('should use default values when environment variables are not set', () => {
            const config = UploxAppConfigs.fromEnv();

            expect(config.nodeEnv).toBe('development');
            expect(config.redisUrl).toBe('redis://localhost:6379');
            expect(config.databaseUrl).toBe('postgresql://localhost:5432/uplox');
            expect(config.minioEndpoint).toBe('storage');
            expect(config.minioPort).toBe(9000);
            expect(config.minioAccessKey).toBe('miniosuperadmin');
            expect(config.minioSecretKey).toBe('miniosuperadmin');
            expect(config.minioBucket).toBe('uplox');
            expect(config.minioRegion).toBe('us-east-1');
            expect(config.minioUseSSL).toBe(false);
            expect(config.scannerHost).toBe('localhost');
            expect(config.scannerPort).toBe(3310);
            expect(config.port).toBe(3000);
        });

        it('should use debug log level and JSON logging in development', () => {
            const config = UploxAppConfigs.fromEnv();

            expect(config.logLevel).toBe('debug');
            expect(config.logUseJson).toBe(true);
        });
    });

    describe('environment variable parsing', () => {
        it('should read string values from environment variables', () => {
            process.env.NODE_ENV = 'production';
            process.env.REDIS_URL = 'redis://prod-redis:6379';
            process.env.DATABASE_URL = 'postgresql://prod-db:5432/uplox';
            process.env.MINIO_ENDPOINT = 'minio.example.com';
            process.env.MINIO_ACCESS_KEY = 'prod-access-key';
            process.env.MINIO_SECRET_KEY = 'prod-secret-key';
            process.env.MINIO_BUCKET = 'prod-bucket';
            process.env.MINIO_REGION = 'eu-west-1';
            process.env.SCANNER_HOST = 'scanner.example.com';

            const config = UploxAppConfigs.fromEnv();

            expect(config.nodeEnv).toBe('production');
            expect(config.redisUrl).toBe('redis://prod-redis:6379');
            expect(config.databaseUrl).toBe('postgresql://prod-db:5432/uplox');
            expect(config.minioEndpoint).toBe('minio.example.com');
            expect(config.minioAccessKey).toBe('prod-access-key');
            expect(config.minioSecretKey).toBe('prod-secret-key');
            expect(config.minioBucket).toBe('prod-bucket');
            expect(config.minioRegion).toBe('eu-west-1');
            expect(config.scannerHost).toBe('scanner.example.com');
        });

        it('should parse integer values from environment variables', () => {
            process.env.MINIO_PORT = '9001';
            process.env.SCANNER_PORT = '3311';
            process.env.PORT = '8080';

            const config = UploxAppConfigs.fromEnv();

            expect(config.minioPort).toBe(9001);
            expect(config.scannerPort).toBe(3311);
            expect(config.port).toBe(8080);
        });

        it('should handle invalid port numbers gracefully', () => {
            process.env.MINIO_PORT = 'invalid';
            process.env.SCANNER_PORT = 'not-a-number';
            process.env.PORT = 'abc';

            const config = UploxAppConfigs.fromEnv();

            expect(config.minioPort).toBeNaN();
            expect(config.scannerPort).toBeNaN();
            expect(config.port).toBeNaN();
        });

        it('should parse boolean values from environment variables', () => {
            process.env.MINIO_USE_SSL = 'true';

            const config = UploxAppConfigs.fromEnv();

            expect(config.minioUseSSL).toBe(true);
        });

        it('should treat non-"true" values as false for boolean parsing', () => {
            process.env.MINIO_USE_SSL = 'false';
            const config1 = UploxAppConfigs.fromEnv();
            expect(config1.minioUseSSL).toBe(false);

            process.env.MINIO_USE_SSL = 'yes';
            const config2 = UploxAppConfigs.fromEnv();
            expect(config2.minioUseSSL).toBe(false);

            process.env.MINIO_USE_SSL = '1';
            const config3 = UploxAppConfigs.fromEnv();
            expect(config3.minioUseSSL).toBe(false);
        });
    });

    describe('logging configuration', () => {
        it('should use production log settings when NODE_ENV is production', () => {
            process.env.NODE_ENV = 'production';

            const config = UploxAppConfigs.fromEnv();

            expect(config.logLevel).toBe('info');
            expect(config.logUseJson).toBe(false);
        });

        it('should use custom log level in production when LOG_LEVEL is set', () => {
            process.env.NODE_ENV = 'production';
            process.env.LOG_LEVEL = 'error';

            const config = UploxAppConfigs.fromEnv();

            expect(config.logLevel).toBe('error');
        });

        it('should use custom log JSON setting in production when LOG_USE_JSON is set', () => {
            process.env.NODE_ENV = 'production';
            process.env.LOG_USE_JSON = 'true';

            const config = UploxAppConfigs.fromEnv();

            expect(config.logUseJson).toBe(true);
        });

        it('should ignore LOG_LEVEL and LOG_USE_JSON in non-production environments', () => {
            process.env.NODE_ENV = 'development';
            process.env.LOG_LEVEL = 'error';
            process.env.LOG_USE_JSON = 'false';

            const config = UploxAppConfigs.fromEnv();

            expect(config.logLevel).toBe('debug');
            expect(config.logUseJson).toBe(true);
        });
    });

    describe('factory method', () => {
        it('should create a new instance when fromEnv() is called', () => {
            const config1 = UploxAppConfigs.fromEnv();
            const config2 = UploxAppConfigs.fromEnv();

            expect(config1).toBeInstanceOf(UploxAppConfigs);
            expect(config2).toBeInstanceOf(UploxAppConfigs);
            expect(config1).not.toBe(config2); // Should be different instances
        });

        it('should reflect environment changes in new instances', () => {
            const config1 = UploxAppConfigs.fromEnv();
            expect(config1.nodeEnv).toBe('development');

            process.env.NODE_ENV = 'production';
            const config2 = UploxAppConfigs.fromEnv();
            expect(config2.nodeEnv).toBe('production');
        });
    });

    describe('edge cases', () => {
        it('should handle empty string environment variables', () => {
            process.env.NODE_ENV = '';
            process.env.REDIS_URL = '';
            process.env.MINIO_PORT = '';

            const config = UploxAppConfigs.fromEnv();

            // Empty strings are falsy, so they fall back to defaults
            expect(config.nodeEnv).toBe('development');
            expect(config.redisUrl).toBe('redis://localhost:6379');
            expect(config.minioPort).toBe(9000); // Falls back to default '9000', then parseInt('9000') = 9000
        });

        it('should handle whitespace in environment variables', () => {
            process.env.NODE_ENV = '  production  ';
            process.env.REDIS_URL = '  redis://localhost:6379  ';

            const config = UploxAppConfigs.fromEnv();

            expect(config.nodeEnv).toBe('  production  ');
            expect(config.redisUrl).toBe('  redis://localhost:6379  ');
        });

        it('should handle special characters in environment variables', () => {
            process.env.MINIO_ACCESS_KEY = 'key-with-!@#$%^&*()';
            process.env.MINIO_SECRET_KEY = 'secret/with\\special=chars';

            const config = UploxAppConfigs.fromEnv();

            expect(config.minioAccessKey).toBe('key-with-!@#$%^&*()');
            expect(config.minioSecretKey).toBe('secret/with\\special=chars');
        });
    });

    describe('all properties are readonly', () => {
        it('should have readonly properties', () => {
            const config = UploxAppConfigs.fromEnv();

            // These should not throw in TypeScript, but we can verify they exist
            expect(config.nodeEnv).toBeDefined();
            expect(config.redisUrl).toBeDefined();
            expect(config.databaseUrl).toBeDefined();
            expect(config.minioEndpoint).toBeDefined();
            expect(config.minioPort).toBeDefined();
            expect(config.minioAccessKey).toBeDefined();
            expect(config.minioSecretKey).toBeDefined();
            expect(config.minioBucket).toBeDefined();
            expect(config.minioRegion).toBeDefined();
            expect(config.minioUseSSL).toBeDefined();
            expect(config.scannerHost).toBeDefined();
            expect(config.scannerPort).toBeDefined();
            expect(config.port).toBeDefined();
            expect(config.logLevel).toBeDefined();
            expect(config.logUseJson).toBeDefined();
        });
    });
});
