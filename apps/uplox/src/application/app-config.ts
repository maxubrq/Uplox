export type UploxAppConfig = {
    nodeEnv: string;
    redisUrl: string;
    databaseUrl: string;
    minioEndpoint: string;
    minioPort: string;
    minioAccessKey: string;
    minioSecretKey: string;
};

export class UploxAppConfigLoader {
    loadFromEnv(): UploxAppConfig {
        const nodeEnv = process.env.NODE_ENV ?? 'development';
        const redisUrl = process.env.REDIS_URL ?? 'redis://localhost:6379';
        const databaseUrl = process.env.DATABASE_URL ?? 'postgresql://localhost:5432/uplox';
        const minioEndpoint = process.env.MINIO_ENDPOINT ?? 'localhost';
        const minioPort = process.env.MINIO_PORT ?? '9000';
        const minioAccessKey = process.env.MINIO_ACCESS_KEY ?? 'minioadmin';
        const minioSecretKey = process.env.MINIO_SECRET_KEY ?? 'minioadmin';

        return {
            nodeEnv,
            redisUrl,
            databaseUrl,
            minioEndpoint,
            minioPort,
            minioAccessKey,
            minioSecretKey,
        };
    }
}
