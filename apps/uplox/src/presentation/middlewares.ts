import { Context } from 'hono';
import { genId } from '@shared/utils/gen';
import { UploxAppEnv } from '@application/app-env';
import { AppMetrics } from '@application';

export function requestIdMiddleware(c: Context<UploxAppEnv, any, {}>, next: () => Promise<void>): Promise<void> {
    const requestId = genId('req');
    c.set('requestId', requestId);
    return next();
}

export function metricsFailedCounterMiddleware(metrics: AppMetrics) {
    return async (c: Context<UploxAppEnv, any, {}>, next: () => Promise<void>): Promise<void> => {
        const route = c.req.path;
        const method = c.req.method;
        let statusCode: number | undefined;
        try {
            await next();
            statusCode = c.res.status;
        } catch (err) {
            statusCode = c.res.status;
            if (statusCode && statusCode >= 400) {
                metrics.apiErrorsTotal(method, route, statusCode?.toString());
            }
            throw err;
        }
        if (statusCode && statusCode >= 400) {
            metrics.apiErrorsTotal(method, route, statusCode?.toString());
        }
    };
}

export function metricsUploadRequestDurationMillisMiddlware(metrics: AppMetrics) {
    return async (c: Context<UploxAppEnv, any, {}>, next: () => Promise<void>): Promise<void> => {
        const startTime = Date.now();
        try {
            await next();
        } catch (err) {
            throw err;
        } finally {
            const route = c.req.path;
            // Ignore healthcheck and metrics paths
            if (route !== '/metrics' && route !== '/health') {
                const duration = Date.now() - startTime;
                metrics.uploadRequestDurationMillis(duration, c.req.method, c.req.path, c.res.status.toString());
            }
        }
    };
}

export function metricsThroughputBytesPerSecMiddleware(metrics: AppMetrics) {
    return async (c: Context<UploxAppEnv, any, {}>, next: () => Promise<void>): Promise<void> => {
        let statusCode: number = -1;
        try {
            await next();
            statusCode = c.res.status;
        } catch (err) {
            statusCode = c.res.status;
            throw err;
        } finally {
            if (statusCode === 200) {
                const requestSize = c.req.header('content-length');
                if (!requestSize) {
                    try {
                        const data = await c.req.formData();
                        const file = data.get('file') as File;
                        if (file) {
                            const fileSize = file.size;
                            if (!isNaN(fileSize)) {
                                metrics.throughputBytesPerSecons(fileSize, c.req.method);
                            }
                        }
                    } catch (e) {
                        metrics.throughputBytesPerSecons(0, c.req.method);
                    }
                } else {
                    const requestSizeNum = parseInt(requestSize);
                    if (!isNaN(requestSizeNum)) {
                        metrics.throughputBytesPerSecons(requestSizeNum, c.req.method);
                    }
                }
            }
        }
    };
}

export function metricsHealthCheckLatencyMillisMiddleware(metrics: AppMetrics) {
    return async (c: Context<UploxAppEnv, any, {}>, next: () => Promise<void>): Promise<void> => {
        const route = c.req.path;
        const startTime = Date.now();
        try {
            await next();
        } catch (err) {
            throw err;
        } finally {
            if (route === '/health') {
                const duration = Date.now() - startTime;
                metrics.healthCheckLatencyMillis(duration, route);
            }
        }
    };
}
