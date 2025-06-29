import { describe, it, expect, vi, beforeEach } from 'vitest';
import { hash } from '../hash';

// Mock the modules properly for vitest hoisting
vi.mock('blake3-wasm', () => ({
    createHash: vi.fn(),
}));

vi.mock('crypto-hash', () => ({
    sha256: vi.fn(),
}));

describe('hash', () => {
    let mockFile: File;
    let mockArrayBuffer: ArrayBuffer;

    beforeEach(() => {
        vi.clearAllMocks();

        // Create a mock ArrayBuffer
        mockArrayBuffer = new ArrayBuffer(8);
        const view = new Uint8Array(mockArrayBuffer);
        view.set([1, 2, 3, 4, 5, 6, 7, 8]);

        // Create a mock File
        mockFile = {
            arrayBuffer: vi.fn(() => Promise.resolve(mockArrayBuffer)),
            name: 'test-file.txt',
            size: 8,
            type: 'text/plain',
            lastModified: Date.now(),
            stream: vi.fn(),
            slice: vi.fn(),
            text: vi.fn(),
            webkitRelativePath: '',
        } as unknown as File;
    });

    describe('blake3 algorithm', () => {
        it('should hash file using blake3 algorithm', async () => {
            const mockHashInstance = {
                update: vi.fn(),
                digest: vi.fn(() => 'blake3-result-hash'),
            };

            const { createHash } = await import('blake3-wasm');
            vi.mocked(createHash).mockReturnValue(mockHashInstance as any);

            const result = await hash(mockFile, 'blake3');

            expect(createHash).toHaveBeenCalledTimes(1);
            expect(mockHashInstance.update).toHaveBeenCalledWith(mockArrayBuffer);
            expect(mockHashInstance.digest).toHaveBeenCalledWith('hex');
            expect(result).toBe('blake3-result-hash');
        });

        it('should call file.arrayBuffer() for blake3', async () => {
            const mockHashInstance = {
                update: vi.fn(),
                digest: vi.fn(() => 'default-blake3-hash'),
            };

            const { createHash } = await import('blake3-wasm');
            vi.mocked(createHash).mockReturnValue(mockHashInstance as any);

            const result = await hash(mockFile, 'blake3');

            expect(mockFile.arrayBuffer).toHaveBeenCalledTimes(1);
            expect(result).toBe('default-blake3-hash');
        });
    });

    describe('sha256 algorithm', () => {
        it('should hash file using sha256 algorithm', async () => {
            const { sha256 } = await import('crypto-hash');
            vi.mocked(sha256).mockResolvedValue('sha256-result-hash' as unknown as ArrayBuffer);

            const result = await hash(mockFile, 'sha256');

            expect(sha256).toHaveBeenCalledWith(mockArrayBuffer);
            expect(result).toBe('sha256-result-hash');
        });

        it('should call file.arrayBuffer() for sha256', async () => {
            const { sha256 } = await import('crypto-hash');
            vi.mocked(sha256).mockResolvedValue('default-sha256-hash' as unknown as ArrayBuffer);

            const result = await hash(mockFile, 'sha256');

            expect(mockFile.arrayBuffer).toHaveBeenCalledTimes(1);
            expect(result).toBe('default-sha256-hash');
        });
    });

    describe('error handling', () => {
        it('should handle file.arrayBuffer() rejection for blake3', async () => {
            const errorFile = {
                ...mockFile,
                arrayBuffer: vi.fn(() => Promise.reject(new Error('File read error'))),
            } as unknown as File;

            const mockHashInstance = {
                update: vi.fn(),
                digest: vi.fn(),
            };

            const { createHash } = await import('blake3-wasm');
            vi.mocked(createHash).mockReturnValue(mockHashInstance as any);

            await expect(hash(errorFile, 'blake3')).rejects.toThrow('File read error');
        });

        it('should handle file.arrayBuffer() rejection for sha256', async () => {
            const errorFile = {
                ...mockFile,
                arrayBuffer: vi.fn(() => Promise.reject(new Error('File read error'))),
            } as unknown as File;

            await expect(hash(errorFile, 'sha256')).rejects.toThrow('File read error');
        });

        it('should handle crypto-hash sha256 rejection', async () => {
            const { sha256 } = await import('crypto-hash');
            vi.mocked(sha256).mockRejectedValue(new Error('Crypto error'));

            await expect(hash(mockFile, 'sha256')).rejects.toThrow('Crypto error');
        });
    });

    describe('different file types', () => {
        it('should handle empty file with blake3', async () => {
            const emptyBuffer = new ArrayBuffer(0);
            const emptyFile = {
                ...mockFile,
                arrayBuffer: vi.fn(() => Promise.resolve(emptyBuffer)),
                size: 0,
            } as unknown as File;

            const mockHashInstance = {
                update: vi.fn(),
                digest: vi.fn(() => 'empty-blake3-hash'),
            };

            const { createHash } = await import('blake3-wasm');
            vi.mocked(createHash).mockReturnValue(mockHashInstance as any);

            const result = await hash(emptyFile, 'blake3');

            expect(mockHashInstance.update).toHaveBeenCalledWith(emptyBuffer);
            expect(result).toBe('empty-blake3-hash');
        });

        it('should handle empty file with sha256', async () => {
            const emptyBuffer = new ArrayBuffer(0);
            const emptyFile = {
                ...mockFile,
                arrayBuffer: vi.fn(() => Promise.resolve(emptyBuffer)),
                size: 0,
            } as unknown as File;

            const { sha256 } = await import('crypto-hash');
            vi.mocked(sha256).mockResolvedValue('empty-sha256-hash' as unknown as ArrayBuffer);

            const result = await hash(emptyFile, 'sha256');

            expect(sha256).toHaveBeenCalledWith(emptyBuffer);
            expect(result).toBe('empty-sha256-hash');
        });

        it('should handle large file buffer', async () => {
            const largeBuffer = new ArrayBuffer(1024 * 1024); // 1MB
            const largeFile = {
                ...mockFile,
                arrayBuffer: vi.fn(() => Promise.resolve(largeBuffer)),
                size: 1024 * 1024,
            } as unknown as File;

            const mockHashInstance = {
                update: vi.fn(),
                digest: vi.fn(() => 'large-file-blake3-hash'),
            };

            const { createHash } = await import('blake3-wasm');
            vi.mocked(createHash).mockReturnValue(mockHashInstance as any);

            const result = await hash(largeFile, 'blake3');

            expect(largeFile.arrayBuffer).toHaveBeenCalledTimes(1);
            expect(mockHashInstance.update).toHaveBeenCalledWith(largeBuffer);
            expect(result).toBe('large-file-blake3-hash');
        });
    });

    describe('algorithm type safety', () => {
        it('should work with blake3 algorithm string', async () => {
            const mockHashInstance = {
                update: vi.fn(),
                digest: vi.fn(() => 'default-blake3-hash'),
            };

            const { createHash } = await import('blake3-wasm');
            vi.mocked(createHash).mockReturnValue(mockHashInstance as any);

            const algorithm: 'blake3' = 'blake3';
            const result = await hash(mockFile, algorithm);
            expect(result).toBe('default-blake3-hash');
        });

        it('should work with sha256 algorithm string', async () => {
            const { sha256 } = await import('crypto-hash');
            vi.mocked(sha256).mockResolvedValue('default-sha256-hash' as unknown as ArrayBuffer);

            const algorithm: 'sha256' = 'sha256';
            const result = await hash(mockFile, algorithm);
            expect(result).toBe('default-sha256-hash');
        });
    });
});
