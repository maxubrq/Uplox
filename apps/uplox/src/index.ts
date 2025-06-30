import { serve } from '@hono/node-server';
import { getLogger, UploxLogger } from '@shared/logger';
import { Hono } from 'hono';
import { AppEnv } from '@application/ports';
import { UploxAppConfig, UploxAppConfigLoader } from '@application/app-config';


async function bootstrap() {
    const app = new Hono<AppEnv>();
    const logger = getLogger('Uplox');
    const config = new UploxAppConfigLoader().loadFromEnv();
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
