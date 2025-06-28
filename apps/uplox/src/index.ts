import { serve } from '@hono/node-server';
import { getLogger, UploxLogger } from '@shared/logger';
import { Hono } from 'hono';
import { PresignRoutes } from '@presign/presentation';
import { PresignService } from '@presign/application';
import { AppEnv } from '@application/ports';

function presignFeature(app: Hono<AppEnv>, logger: UploxLogger) {
    const presignService = new PresignService(logger);
    const presignRoutes = new PresignRoutes(presignService, logger);
    presignRoutes.attachRoutes(app);
}

function bootstrap() {
    const app = new Hono<AppEnv>();
    const logger = getLogger('Uplox');
    presignFeature(app, logger);
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
