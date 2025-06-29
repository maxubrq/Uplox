import { serve } from '@hono/node-server';
import { getLogger, UploxLogger } from '@shared/logger';
import { Hono } from 'hono';
import { PresignRoutes } from '@presign/presentation';
import { PresignService } from '@presign/application';
import { AppEnv } from '@application/ports';
import { UploxAppConfig, UploxAppConfigLoader } from '@application/app-config';

function presignFeature(app: Hono<AppEnv>, logger: UploxLogger, config: UploxAppConfig) {
    const presignService = new PresignService(logger, config);
    const presignRoutes = new PresignRoutes(presignService, logger);
    presignRoutes.attachRoutes(app);
}

function bootstrap() {
    const app = new Hono<AppEnv>();
    const logger = getLogger('Uplox');
    const config = new UploxAppConfigLoader().loadFromEnv();
    presignFeature(app, logger, config);
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
