import { UploxRoute } from './routes';

export interface UploxApp<H, C> {
    attachRoute(route: UploxRoute<H>): void;
    use(middleware: (c: C) => Promise<void> | void): void;
    start(): void | Promise<void>;
    stop(): void;
}
