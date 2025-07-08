import { UploxAppConfigs } from '@application/app-configs';
import { UploadRoutes } from '@features/upload';
import { UploadManager } from '@features/upload/application';
import { ClamAVScanner, FileTypeScanner } from '@infrastructure';
import { MinioStorage } from '@infrastructure/minio-storage';
import { requestIdMiddleware, UploxAppImpl } from '@presentation';
import { UploxAppLoggerImpl } from '@shared';

function bootstrap() {
    // 1. Load app configs
    const appConfig = UploxAppConfigs.fromEnv();
    const logger = UploxAppLoggerImpl.getInstance('uplox', appConfig.logUseJson, appConfig.logLevel);
    const storage = new MinioStorage(logger, appConfig.minioBucket, {
        endpoint: appConfig.minioEndpoint,
        accessKey: appConfig.minioAccessKey,
        port: appConfig.minioPort,
        region: appConfig.minioRegion,
        secretKey: appConfig.minioSecretKey,
        useSSL: false
    })

    // 2. Create app
    const app = new UploxAppImpl(appConfig, logger);
    app.use(requestIdMiddleware);

    // 3. Upload routes & inject dependencies
    const fileTypeScanner = FileTypeScanner.getInstance(logger);
    const clamscan = ClamAVScanner.getInstance(logger);
    const uploadManager = new UploadManager(logger, fileTypeScanner, clamscan, storage);
    const uploadRoutes = new UploadRoutes(logger, uploadManager);
    uploadRoutes.attachRoutes(app);

    // 4. Start app
    app.start();
}

bootstrap();
