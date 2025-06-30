import { Context, Hono } from 'hono';
import { UploxFile } from '@domain/file';

export type AppEnv = {
    Variables: {
        requestId: string;
    };
};

export type Handler = (c: Context) => Promise<Response>;

export interface FeatureRoutes {
    attachRoutes(app: Hono<AppEnv>): void;
    getRoutes(): Route[];
}

export interface Route {
    path: string;
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
    handler: Handler;
}

export type ApplicationResult<T> = {
    requestId: string;
    data: T | null;
    error?: string;
    link?: string;
    details?: string;
    file?: UploxFile | null;
};
