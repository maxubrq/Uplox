import { describe, it, expect, vi, beforeEach } from 'vitest';
import { genId } from '../gen';

// Mock the short-uuid module
vi.mock('short-uuid', () => ({
    generate: vi.fn()
}));

// Import the mocked generate function
import { generate } from 'short-uuid';
const mockGenerate = vi.mocked(generate);

describe('genId', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should generate an ID with the correct format', () => {
        // Arrange
        const mockUuid = 'abc123def456';
        const prefix = 'user';
        mockGenerate.mockReturnValue(mockUuid as any);

        // Act
        const result = genId(prefix);

        // Assert
        expect(result).toBe(`${prefix}_${mockUuid}`);
        expect(mockGenerate).toHaveBeenCalledOnce();
    });

    it('should call generate function from short-uuid', () => {
        // Arrange
        const prefix = 'order';
        mockGenerate.mockReturnValue('xyz789' as any);

        // Act
        genId(prefix);

        // Assert
        expect(mockGenerate).toHaveBeenCalledOnce();
        expect(mockGenerate).toHaveBeenCalledWith();
    });

    it('should work with different prefixes', () => {
        // Arrange
        const mockUuid = 'test-uuid-123';
        mockGenerate.mockReturnValue(mockUuid as any);

        const testCases = [
            { prefix: 'user', expected: `user_${mockUuid}` },
            { prefix: 'order', expected: `order_${mockUuid}` },
            { prefix: 'product', expected: `product_${mockUuid}` },
            { prefix: 'session', expected: `session_${mockUuid}` }
        ];

        testCases.forEach(({ prefix, expected }) => {
            // Act
            const result = genId(prefix);

            // Assert
            expect(result).toBe(expected);
        });

        expect(mockGenerate).toHaveBeenCalledTimes(testCases.length);
    });

    it('should handle empty prefix', () => {
        // Arrange
        const mockUuid = 'empty-prefix-test';
        const prefix = '';
        mockGenerate.mockReturnValue(mockUuid as any);

        // Act
        const result = genId(prefix);

        // Assert
        expect(result).toBe(`_${mockUuid}`);
        expect(mockGenerate).toHaveBeenCalledOnce();
    });

    it('should handle special characters in prefix', () => {
        // Arrange
        const mockUuid = 'special-chars-test';
        const prefix = 'test-with-dashes_and_underscores';
        mockGenerate.mockReturnValue(mockUuid as any);

        // Act
        const result = genId(prefix);

        // Assert
        expect(result).toBe(`${prefix}_${mockUuid}`);
        expect(mockGenerate).toHaveBeenCalledOnce();
    });

    it('should generate unique IDs on multiple calls', () => {
        // Arrange
        const prefix = 'test';
        mockGenerate
            .mockReturnValueOnce('first-uuid' as any)
            .mockReturnValueOnce('second-uuid' as any)
            .mockReturnValueOnce('third-uuid' as any);

        // Act
        const result1 = genId(prefix);
        const result2 = genId(prefix);
        const result3 = genId(prefix);

        // Assert
        expect(result1).toBe('test_first-uuid');
        expect(result2).toBe('test_second-uuid');
        expect(result3).toBe('test_third-uuid');
        expect(mockGenerate).toHaveBeenCalledTimes(3);
    });

    it('should handle long prefixes', () => {
        // Arrange
        const mockUuid = 'long-prefix-test';
        const prefix = 'very-long-prefix-with-many-characters-and-descriptive-name';
        mockGenerate.mockReturnValue(mockUuid as any);

        // Act
        const result = genId(prefix);

        // Assert
        expect(result).toBe(`${prefix}_${mockUuid}`);
        expect(result).toContain('_');
        expect(result).toMatch(new RegExp(`^${prefix}`));
        expect(result).toMatch(new RegExp(`${mockUuid}$`));
        expect(mockGenerate).toHaveBeenCalledOnce();
    });
});
