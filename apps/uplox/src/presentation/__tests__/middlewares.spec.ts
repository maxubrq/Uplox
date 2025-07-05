import { describe, it, expect, vi, beforeEach } from 'vitest';
import { requestIdMiddleware } from '../middlewares';
import { genId } from '@shared/utils/gen';
import { Context } from 'hono';
import { UploxAppEnv } from '@application/app-env';

// Mock the genId function
vi.mock('@shared/utils/gen', () => ({
    genId: vi.fn(),
}));

describe('requestIdMiddleware', () => {
    let mockContext: Partial<Context<UploxAppEnv, any, {}>>;
    let mockNext: ReturnType<typeof vi.fn>;
    let mockGenId: ReturnType<typeof vi.fn>;

    beforeEach(() => {
        // Reset all mocks before each test
        vi.clearAllMocks();

        // Setup mock context with set method
        mockContext = {
            set: vi.fn(),
        };

        // Setup mock next function
        mockNext = vi.fn().mockResolvedValue(undefined);

        // Setup mock genId
        mockGenId = vi.mocked(genId);
    });

    it('should generate a request ID with "req" prefix', async () => {
        // Arrange
        const expectedRequestId = 'req_123456789';
        mockGenId.mockReturnValue(expectedRequestId);

        // Act
        await requestIdMiddleware(mockContext as Context<UploxAppEnv, any, {}>, mockNext);

        // Assert
        expect(mockGenId).toHaveBeenCalledWith('req');
        expect(mockGenId).toHaveBeenCalledTimes(1);
    });

    it('should set the generated request ID in context', async () => {
        // Arrange
        const expectedRequestId = 'req_abcdef123';
        mockGenId.mockReturnValue(expectedRequestId);

        // Act
        await requestIdMiddleware(mockContext as Context<UploxAppEnv, any, {}>, mockNext);

        // Assert
        expect(mockContext.set).toHaveBeenCalledWith('requestId', expectedRequestId);
        expect(mockContext.set).toHaveBeenCalledTimes(1);
    });

    it('should call the next function', async () => {
        // Arrange
        mockGenId.mockReturnValue('req_test123');

        // Act
        await requestIdMiddleware(mockContext as Context<UploxAppEnv, any, {}>, mockNext);

        // Assert
        expect(mockNext).toHaveBeenCalledTimes(1);
    });

    it('should return the result of next function', async () => {
        // Arrange
        mockGenId.mockReturnValue('req_test456');
        mockNext.mockResolvedValue(undefined);

        // Act
        const result = await requestIdMiddleware(mockContext as Context<UploxAppEnv, any, {}>, mockNext);

        // Assert
        expect(result).toBeUndefined();
    });

    it('should handle next function rejection', async () => {
        // Arrange
        const error = new Error('Next function failed');
        mockGenId.mockReturnValue('req_error123');
        mockNext.mockRejectedValue(error);

        // Act & Assert
        await expect(requestIdMiddleware(mockContext as Context<UploxAppEnv, any, {}>, mockNext)).rejects.toThrow(
            'Next function failed',
        );

        // Verify that genId and context.set were still called
        expect(mockGenId).toHaveBeenCalledWith('req');
        expect(mockContext.set).toHaveBeenCalledWith('requestId', 'req_error123');
    });

    it('should execute operations in correct order', async () => {
        // Arrange
        const expectedRequestId = 'req_order123';
        mockGenId.mockReturnValue(expectedRequestId);

        const callOrder: string[] = [];
        mockGenId.mockImplementation((prefix: string) => {
            callOrder.push('genId');
            return expectedRequestId;
        });

        mockContext.set = vi.fn().mockImplementation(() => {
            callOrder.push('context.set');
        });

        mockNext.mockImplementation(async () => {
            callOrder.push('next');
        });

        // Act
        await requestIdMiddleware(mockContext as Context<UploxAppEnv, any, {}>, mockNext);

        // Assert
        expect(callOrder).toEqual(['genId', 'context.set', 'next']);
    });
});
