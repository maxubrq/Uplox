import { Context } from 'hono';
import { genId } from '@shared/utils/gen';
import { UploxAppEnv } from '@application/app-env';

export function requestIdMiddleware(c: Context<UploxAppEnv, any, {}>, next: () => Promise<void>): Promise<void> {
    const requestId = genId('req');
    c.set('requestId', requestId);
    return next();
}
