import { describe, it, expect, vi, beforeEach, afterEach, MockedFunction } from 'vitest';
import { UploxAppImpl } from '../app-impl';
import { UploxAppConfigs } from '@application/app-configs';
import { UploxAppLogger } from '@application/app-logger';
import { UploxRoute } from '@application/routes';
import { serve } from '@hono/node-server';
import { Hono, Handler } from 'hono';
import { AddressInfo } from 'net';

// Mock external dependencies
vi.mock('@hono/node-server', () => ({
    serve: vi.fn(),
}));

vi.mock('hono', () => ({
    Hono: vi.fn(() => ({
        get: vi.fn(),
        post: vi.fn(),
        put: vi.fn(),
        delete: vi.fn(),
        use: vi.fn(),
        fetch: vi.fn(),
    })),
}));

describe('UploxAppImpl', () => {
    let uploxApp: UploxAppImpl;
    let mockAppConfig: UploxAppConfigs;
    let mockLogger: UploxAppLogger;
    let mockHonoApp: {
        get: MockedFunction<any>;
        post: MockedFunction<any>;
        put: MockedFunction<any>;
        delete: MockedFunction<any>;
        use: MockedFunction<any>;
        fetch: MockedFunction<any>;
    };
    let mockServe: MockedFunction<typeof serve>;
    let mockProcessExit: any;

    beforeEach(() => {
        // Reset all mocks
        vi.clearAllMocks();

        // Mock app config
        mockAppConfig = {
            port: 3000,
            nodeEnv: 'test',
            redisUrl: 'redis://localhost:6379',
            databaseUrl: 'postgresql://localhost:5432/uplox',
            minioEndpoint: 'localhost:9000',
            minioPort: 9000,
            minioAccessKey: 'test',
            minioSecretKey: 'test',
            minioBucket: 'test',
            minioRegion: 'us-east-1',
            scannerHost: 'localhost',
            scannerPort: 3310,
            logLevel: 'debug',
            logUseJson: true,
        };

        // Mock logger
        mockLogger = {
            info: vi.fn(),
            warn: vi.fn(),
            error: vi.fn(),
            debug: vi.fn(),
            child: vi.fn(),
        };

        // Mock Hono app methods
        mockHonoApp = {
            get: vi.fn(),
            post: vi.fn(),
            put: vi.fn(),
            delete: vi.fn(),
            use: vi.fn(),
            fetch: vi.fn(),
        };

        // Mock Hono constructor
        vi.mocked(Hono).mockReturnValue(mockHonoApp as any);

        // Mock serve function
        mockServe = vi.mocked(serve);

        // Mock process.exit
        mockProcessExit = vi.spyOn(process, 'exit').mockImplementation(() => {
            throw new Error('process.exit called');
        });

        // Create instance
        uploxApp = new UploxAppImpl(mockAppConfig, mockLogger);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('constructor', () => {
        it('should initialize with correct app config and logger', () => {
            expect(Hono).toHaveBeenCalledWith();
            expect(uploxApp).toBeInstanceOf(UploxAppImpl);
        });

        it('should set port from app config', () => {
            const customConfig = { ...mockAppConfig, port: 4000 };
            const app = new UploxAppImpl(customConfig, mockLogger);
            expect(app).toBeInstanceOf(UploxAppImpl);
        });
    });

    describe('attachRoute', () => {
        it('should attach GET route correctly', () => {
            const mockHandler: Handler = vi.fn();
            const route: UploxRoute<Handler> = {
                method: 'GET',
                path: '/test',
                handler: mockHandler,
            };

            uploxApp.attachRoute(route);

            expect(mockHonoApp.get).toHaveBeenCalledWith('/test', mockHandler);
            expect(mockHonoApp.get).toHaveBeenCalledTimes(1);
        });

        it('should attach POST route correctly', () => {
            const mockHandler: Handler = vi.fn();
            const route: UploxRoute<Handler> = {
                method: 'POST',
                path: '/api/upload',
                handler: mockHandler,
            };

            uploxApp.attachRoute(route);

            expect(mockHonoApp.post).toHaveBeenCalledWith('/api/upload', mockHandler);
            expect(mockHonoApp.post).toHaveBeenCalledTimes(1);
        });

        it('should attach PUT route correctly', () => {
            const mockHandler: Handler = vi.fn();
            const route: UploxRoute<Handler> = {
                method: 'PUT',
                path: '/api/update',
                handler: mockHandler,
            };

            uploxApp.attachRoute(route);

            expect(mockHonoApp.put).toHaveBeenCalledWith('/api/update', mockHandler);
            expect(mockHonoApp.put).toHaveBeenCalledTimes(1);
        });

        it('should attach DELETE route correctly', () => {
            const mockHandler: Handler = vi.fn();
            const route: UploxRoute<Handler> = {
                method: 'DELETE',
                path: '/api/delete',
                handler: mockHandler,
            };

            uploxApp.attachRoute(route);

            expect(mockHonoApp.delete).toHaveBeenCalledWith('/api/delete', mockHandler);
            expect(mockHonoApp.delete).toHaveBeenCalledTimes(1);
        });

        it('should throw error for unsupported HTTP method', () => {
            const mockHandler: Handler = vi.fn();
            const route = {
                method: 'PATCH' as any,
                path: '/api/patch',
                handler: mockHandler,
            };

            expect(() => uploxApp.attachRoute(route)).toThrow('[UploxAppImpl] Unsupported method: PATCH');
        });
    });

    describe('use', () => {
        it('should attach middleware correctly', () => {
            const mockMiddleware = vi.fn();

            uploxApp.use(mockMiddleware);

            expect(mockHonoApp.use).toHaveBeenCalledWith(mockMiddleware);
            expect(mockHonoApp.use).toHaveBeenCalledTimes(1);
        });

        it('should attach multiple middlewares', () => {
            const middleware1 = vi.fn();
            const middleware2 = vi.fn();

            uploxApp.use(middleware1);
            uploxApp.use(middleware2);

            expect(mockHonoApp.use).toHaveBeenCalledWith(middleware1);
            expect(mockHonoApp.use).toHaveBeenCalledWith(middleware2);
            expect(mockHonoApp.use).toHaveBeenCalledTimes(2);
        });
    });

    describe('start', () => {
        it('should start server successfully and log info', () => {
            const mockInfo: AddressInfo = {
                port: 3000,
                address: '127.0.0.1',
                family: 'IPv4',
            };

            // Mock serve to immediately call the callback with info
            mockServe.mockImplementation((config, callback) => {
                if (callback) {
                    callback(mockInfo);
                }
                return {} as any;
            });

            uploxApp.start();

            expect(mockServe).toHaveBeenCalledWith(
                {
                    fetch: mockHonoApp.fetch,
                    port: mockAppConfig.port,
                },
                expect.any(Function),
            );

            expect(mockLogger.info).toHaveBeenCalledWith('[UploxAppImpl] Server is running on port 3000');
        });

        it('should handle server start failure and exit process', () => {
            // Mock serve to call callback with null/undefined info
            mockServe.mockImplementation((config, callback) => {
                if (callback) {
                    callback(null as any);
                }
                return {} as any;
            });

            expect(() => uploxApp.start()).toThrow('process.exit called');

            expect(mockLogger.error).toHaveBeenCalledWith('[UploxAppImpl] Failed to start the server');
            expect(mockProcessExit).toHaveBeenCalledWith(1);
        });

        it('should use correct port from config', () => {
            const customConfig = { ...mockAppConfig, port: 4000 };
            const app = new UploxAppImpl(customConfig, mockLogger);

            const mockInfo: AddressInfo = {
                port: 4000,
                address: '127.0.0.1',
                family: 'IPv4',
            };

            mockServe.mockImplementation((config, callback) => {
                if (callback) {
                    callback(mockInfo);
                }
                return {} as any;
            });

            app.start();

            expect(mockServe).toHaveBeenCalledWith(
                {
                    fetch: mockHonoApp.fetch,
                    port: 4000,
                },
                expect.any(Function),
            );
        });
    });

    describe('stop', () => {
        it('should stop server and log info', () => {
            expect(() => uploxApp.stop()).toThrow('process.exit called');

            expect(mockLogger.info).toHaveBeenCalledWith('[UploxAppImpl] Stopping the server');
            expect(mockProcessExit).toHaveBeenCalledWith(0);
        });
    });

    describe('integration scenarios', () => {
        it('should handle complete app lifecycle', () => {
            // Setup routes
            const getRoute: UploxRoute<Handler> = {
                method: 'GET',
                path: '/health',
                handler: vi.fn(),
            };

            const postRoute: UploxRoute<Handler> = {
                method: 'POST',
                path: '/api/upload',
                handler: vi.fn(),
            };

            // Setup middleware
            const middleware = vi.fn();

            // Attach routes and middleware
            uploxApp.attachRoute(getRoute);
            uploxApp.attachRoute(postRoute);
            uploxApp.use(middleware);

            // Mock successful server start
            const mockInfo: AddressInfo = {
                port: 3000,
                address: '127.0.0.1',
                family: 'IPv4',
            };
            mockServe.mockImplementation((config, callback) => {
                if (callback) {
                    callback(mockInfo);
                }
                return {} as any;
            });

            // Start server
            uploxApp.start();

            // Verify all interactions
            expect(mockHonoApp.get).toHaveBeenCalledWith('/health', getRoute.handler);
            expect(mockHonoApp.post).toHaveBeenCalledWith('/api/upload', postRoute.handler);
            expect(mockHonoApp.use).toHaveBeenCalledWith(middleware);
            expect(mockLogger.info).toHaveBeenCalledWith('[UploxAppImpl] Server is running on port 3000');
        });

        it('should handle multiple routes of same method', () => {
            const routes: UploxRoute<Handler>[] = [
                { method: 'GET', path: '/users', handler: vi.fn() },
                { method: 'GET', path: '/posts', handler: vi.fn() },
                { method: 'POST', path: '/users', handler: vi.fn() },
                { method: 'POST', path: '/posts', handler: vi.fn() },
            ];

            routes.forEach(route => uploxApp.attachRoute(route));

            expect(mockHonoApp.get).toHaveBeenCalledTimes(2);
            expect(mockHonoApp.post).toHaveBeenCalledTimes(2);
            expect(mockHonoApp.get).toHaveBeenCalledWith('/users', routes[0].handler);
            expect(mockHonoApp.get).toHaveBeenCalledWith('/posts', routes[1].handler);
            expect(mockHonoApp.post).toHaveBeenCalledWith('/users', routes[2].handler);
            expect(mockHonoApp.post).toHaveBeenCalledWith('/posts', routes[3].handler);
        });
    });
});
