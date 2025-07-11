export class UploxAppConfigs {
    public readonly nodeEnv: string;
    public readonly redisUrl: string;
    public readonly databaseUrl: string;
    public readonly minioEndpoint: string;
    public readonly minioPort: number;
    public readonly minioAccessKey: string;
    public readonly minioSecretKey: string;
    public readonly minioBucket: string;
    public readonly minioRegion: string;
    public readonly minioUseSSL: boolean;
    public readonly scannerHost: string;
    public readonly scannerPort: number;
    public readonly port: number;
    public readonly logLevel: string;
    public readonly logUseJson: boolean;

    private constructor() {
        this.nodeEnv = process.env.NODE_ENV || 'development';
        this.redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
        this.databaseUrl = process.env.DATABASE_URL || 'postgresql://localhost:5432/uplox';
        this.minioEndpoint = process.env.MINIO_ENDPOINT || 'storage';
        this.minioPort = parseInt(process.env.MINIO_PORT || '9000');
        this.minioAccessKey = process.env.MINIO_ACCESS_KEY || 'miniosuperadmin';
        this.minioSecretKey = process.env.MINIO_SECRET_KEY || 'miniosuperadmin';
        this.minioBucket = process.env.MINIO_BUCKET || 'uplox';
        this.minioRegion = process.env.MINIO_REGION || 'us-east-1';
        this.minioUseSSL = process.env.MINIO_USE_SSL === 'true';
        this.scannerHost = process.env.SCANNER_HOST || 'localhost';
        this.scannerPort = parseInt(process.env.SCANNER_PORT || '3310');
        this.port = parseInt(process.env.PORT || '3000');
        this.logLevel = this.nodeEnv !== 'production' ? 'debug' : process.env.LOG_LEVEL || 'info';
        this.logUseJson = this.nodeEnv !== 'production' ? true : process.env.LOG_USE_JSON === 'true';
    }

    static fromEnv() {
        return new UploxAppConfigs();
    }
}
