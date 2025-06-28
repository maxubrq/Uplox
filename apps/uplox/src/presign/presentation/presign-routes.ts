import { AppEnv, ApplicationResult, FeatureRoutes, Route } from '@application/ports';
import { ResourceType } from '@domain/resource-type';
import { UploxLogger } from '@shared/logger';
import { getDefaults } from '@shared/zod';
import { generateId } from '@shared/utils';
import { Context, Hono } from 'hono';
import { PresignConfig, PresignConfigSchema, PresignService } from '../application/presign-service';

/**
 * The routes for the presign feature
 * @param presignService - The presign service
 * @param logger - The logger
 *
 * Routes:
 *  - POST /presign
 *    - Request:
 *      - file: File
 *    - Response:
 *      - presign: string
 *      - error: string
 */
export class PresignRoutes implements FeatureRoutes {
    constructor(
        private readonly presignService: PresignService,
        private readonly logger: UploxLogger,
    ) {
        this.presignHandler = this.presignHandler.bind(this);
    }

    public async presignHandler(c: Context) {
        const requestId = c.get('requestId') ?? generateId(ResourceType.REQUEST);
        const body = await c.req.parseBody();
        const file = body.file;
        const config = body.config;
        let mergedConfig: PresignConfig = getDefaults(PresignConfigSchema) as unknown as PresignConfig;
        if (config && typeof config === 'string') {
            try {
                const configJSON = JSON.parse(config);
                const parsedConfig = PresignConfigSchema.safeParse(configJSON);
                if (!parsedConfig.success) {
                    this.logger.error('[Presign] Invalid config', { requestId, body, statusCode: 400 });
                    return c.json(
                        <ApplicationResult<string>>{
                            requestId,
                            data: null,
                            error: parsedConfig.error.message,
                            statusCode: 400,
                        },
                        400,
                    );
                }

                mergedConfig = { ...mergedConfig, ...parsedConfig.data };
                this.logger.info('[Presign] Merged config', {
                    requestId,
                    mergedConfig: JSON.stringify(mergedConfig),
                });
            } catch (e) {
                this.logger.error('[Presign] Invalid config', { requestId, body, statusCode: 400 });
                return c.json(
                    <ApplicationResult<string>>{
                        requestId,
                        data: null,
                        error: 'Invalid config',
                        statusCode: 400,
                    },
                    400,
                );
            }
        }

        this.logger.info('[Presign] Request', { requestId, file, mergedConfig });

        if (!file) {
            this.logger.error('[Presign] File is required', { requestId, body, statusCode: 400 });
            return c.json(
                <ApplicationResult<string>>{
                    requestId,
                    data: null,
                    error: 'File is required',
                    statusCode: 400,
                },
                400,
            );
        }

        const fileId = generateId(ResourceType.FILE);
        const {
            presign,
            error,
            file: uploxFile,
        } = await this.presignService.createPresign(requestId, fileId, file, mergedConfig);

        const result: ApplicationResult<string> = {
            requestId,
            data: presign,
            error: error?.message ?? undefined,
            file: uploxFile,
        };
        this.logger.info('[Presign] Response', { requestId, fileId, result });

        if (error) {
            this.logger.error('[Presign] Error', { requestId, fileId, error, statusCode: 400 });
        }

        return c.json(result, error ? 400 : 200);
    }

    public getRoutes(): Route[] {
        return [
            {
                path: '/presign',
                method: 'POST',
                handler: this.presignHandler,
            },
        ];
    }

    public attachRouteMethod(app: Hono<AppEnv>, route: Route) {
        switch (route.method) {
            case 'POST':
                app.post(route.path, route.handler);
                break;
            case 'GET':
                app.get(route.path, route.handler);
                break;
            case 'PUT':
                app.put(route.path, route.handler);
                break;
            case 'DELETE':
                app.delete(route.path, route.handler);
                break;
            case 'PATCH':
                app.patch(route.path, route.handler);
                break;
            default:
                throw new Error(`Method ${route.method} not supported`);
        }
    }

    public attachRoutes(app: Hono<AppEnv>) {
        const routes = this.getRoutes();
        routes.forEach(route => {
            this.attachRouteMethod(app, route);
            this.logger.info('[Presign] Attached route', { path: route.path, method: route.method });
        });
    }
}
