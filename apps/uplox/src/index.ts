import { serve } from '@hono/node-server';
import { getLogger, UploxLogger } from '@shared/logger';
import { Hono } from 'hono';
import { PresignRoutes } from '@presign/presentation';
import { PresignService } from '@presign/application';
import { AppEnv } from '@application/ports';
import { UploxAppConfig, UploxAppConfigLoader } from '@application/app-config';
import { MinioStorage } from '@presign/presentation/minio-storage';
import { ClamavScanner } from '@presign/presentation/clamav-scanner';

async function presignFeature(app: Hono<AppEnv>, logger: UploxLogger, config: UploxAppConfig) {
    const minioStorage = await MinioStorage.getInstance(config, logger);
    const clamavScanner = new ClamavScanner(logger);
    const presignService = new PresignService(logger, config, minioStorage, clamavScanner);
    const presignRoutes = new PresignRoutes(presignService, logger);
    presignRoutes.attachRoutes(app);
}

async function bootstrap() {
    const app = new Hono<AppEnv>();
    const logger = getLogger('Uplox');
    const config = new UploxAppConfigLoader().loadFromEnv();
    await presignFeature(app, logger, config);
    serve(
        {
            fetch: app.fetch,
            port: process.env.PORT ? parseInt(process.env.PORT) : 3000,
        },
        info => {
            logger.info(`[Server] Running on port=${info.port}`);
        },
    );
}

bootstrap();
