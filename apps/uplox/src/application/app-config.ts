export type UploxAppConfig = {
    nodeEnv: string;
    redisUrl: string;
    databaseUrl: string;
    minioEndpoint: string;
    minioPort: string;
    minioAccessKey: string;
    minioSecretKey: string;
    minioBucket: string;
    minioRegion: string;
};

export class UploxAppConfigLoader {
    loadFromEnv(): UploxAppConfig {
        const nodeEnv = process.env.NODE_ENV ?? 'development';
        const redisUrl = process.env.REDIS_URL ?? 'redis://localhost:6379';
        const databaseUrl = process.env.DATABASE_URL ?? 'postgresql://localhost:5432/uplox';
        const minioEndpoint = process.env.MINIO_ENDPOINT ?? 'storage';
        const minioPort = process.env.MINIO_PORT ?? '9000';
        const minioAccessKey = process.env.MINIO_ACCESS_KEY ?? 'miniosuperadmin';
        const minioSecretKey = process.env.MINIO_SECRET_KEY ?? 'miniosuperadmin';
        const minioBucket = process.env.MINIO_BUCKET ?? 'uplox';
        const minioRegion = process.env.MINIO_REGION ?? 'us-east-1';

        return {
            nodeEnv,
            redisUrl,
            databaseUrl,
            minioEndpoint,
            minioPort,
            minioAccessKey,
            minioSecretKey,
            minioBucket,
            minioRegion,
        };
    }
}
