import { AppMetrics, UploxApp } from '@application';
import { UploxAppConfigs } from '@application/app-configs';
import { UploadRoutes } from '@features/upload';
import { UploadManager } from '@features/upload/application';
import { ClamAVScanner, FileTypeScanner, PromMetrics } from '@infrastructure';
import { MinioStorage } from '@infrastructure/minio-storage';
import {
    metricsFailedCounterMiddleware,
    metricsHealthCheckLatencyMillisMiddleware,
    metricsThroughputBytesPerSecMiddleware,
    metricsUploadRequestDurationMillisMiddlware,
    requestIdMiddleware,
    UploxAppImpl,
} from '@presentation';
import { UploxAppLoggerImpl } from '@shared';
import { Context, Handler } from 'hono';

function injectMetricsRoutes(app: UploxApp<Handler, Context>, appMetrics: AppMetrics) {
    app.attachRoute({
        path: '/metrics',
        method: 'GET',
        handler: async c => {
            const metrics = await appMetrics.serveRoute();
            return c.text(metrics);
        },
    });
}

function injectHealthCheckRoutes(app: UploxApp<Handler, Context>) {
    app.attachRoute({
        path: '/health',
        method: 'GET',
        handler: async c => {
            return c.text('OK');
        },
    });
}

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
        useSSL: false,
    });
    const appMetrics: AppMetrics = PromMetrics.getInstance();

    // 2. Create app
    const app = new UploxAppImpl(appConfig, logger);
    app.use(requestIdMiddleware);
    app.use(metricsFailedCounterMiddleware(appMetrics));
    app.use(metricsUploadRequestDurationMillisMiddlware(appMetrics));
    app.use(metricsThroughputBytesPerSecMiddleware(appMetrics));
    app.use(metricsHealthCheckLatencyMillisMiddleware(appMetrics));

    // 3. Upload routes & inject dependencies
    const fileTypeScanner = FileTypeScanner.getInstance(logger);
    const clamscan = ClamAVScanner.getInstance(logger);
    const uploadManager = new UploadManager(logger, fileTypeScanner, clamscan, storage, appMetrics);
    const uploadRoutes = new UploadRoutes(logger, uploadManager);
    uploadRoutes.attachRoutes(app);

    // 4. Inject metrics routes
    injectMetricsRoutes(app, appMetrics);

    // 5. Inject health check routes
    injectHealthCheckRoutes(app);

    // 6. Start app
    app.start();
}

bootstrap();
