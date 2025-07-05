import { UploxApp } from './app';

export type UploxRoute<H> = {
    path: string;
    method: 'GET' | 'POST' | 'PUT' | 'DELETE';
    handler: H;
};

export interface UploxRoutes<H, C> {
    getRoutes(): UploxRoute<H>[];
    attachRoutes(app: UploxApp<H, C>): void;
}
