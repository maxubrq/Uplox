import { UploxAppConfigs } from '@application/app-configs';
import { UploxAppLoggerImpl } from '@shared/logger/logger';
import { UploxAppImpl } from '@presentation';
import { UploadRoutes } from '@features/upload';
import { requestIdMiddleware } from '@presentation';

function bootstrap() {
    const appConfig = UploxAppConfigs.fromEnv();
    const logger = UploxAppLoggerImpl.getInstance('uplox', appConfig.logUseJson, appConfig.logLevel);
    const app = new UploxAppImpl(appConfig, logger);
    app.use(requestIdMiddleware);
    const uploadRoutes = new UploadRoutes(logger);
    uploadRoutes.attachRoutes(app);
    app.start();
}

bootstrap();
