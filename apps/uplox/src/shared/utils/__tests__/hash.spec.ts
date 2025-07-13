import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createHash } from 'crypto';
import fs from 'fs';
import { Readable } from 'stream';
import { hash, hashFile, hashStream } from '../hash';

// Mock the crypto module
vi.mock('crypto', () => ({
    createHash: vi.fn(),
}));

// Mock the fs module
vi.mock('fs', () => ({
    default: {
        readFileSync: vi.fn(),
    },
}));

describe('Hash Utils', () => {
    const mockCreateHash = vi.mocked(createHash);
    const mockReadFileSync = vi.mocked(fs.readFileSync);

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('hash', () => {
        it('should hash a string input', () => {
            const mockHashObject = {
                update: vi.fn().mockReturnThis(),
                digest: vi.fn().mockReturnValue('abc123'),
            };
            mockCreateHash.mockReturnValue(mockHashObject as any);

            const result = hash('sha256', 'test string');

            expect(mockCreateHash).toHaveBeenCalledWith('sha256');
            expect(mockHashObject.update).toHaveBeenCalledWith('test string');
            expect(mockHashObject.digest).toHaveBeenCalledWith('hex');
            expect(result).toBe('abc123');
        });

        it('should hash a Buffer input', () => {
            const mockHashObject = {
                update: vi.fn().mockReturnThis(),
                digest: vi.fn().mockReturnValue('def456'),
            };
            mockCreateHash.mockReturnValue(mockHashObject as any);

            const buffer = Buffer.from('test buffer');
            const result = hash('sha256', buffer);

            expect(mockCreateHash).toHaveBeenCalledWith('sha256');
            expect(mockHashObject.update).toHaveBeenCalledWith(buffer);
            expect(mockHashObject.digest).toHaveBeenCalledWith('hex');
            expect(result).toBe('def456');
        });

        it('should return a hex string', () => {
            const mockHashObject = {
                update: vi.fn().mockReturnThis(),
                digest: vi.fn().mockReturnValue('a1b2c3d4e5f6'),
            };
            mockCreateHash.mockReturnValue(mockHashObject as any);

            const result = hash('sha256', 'test');

            expect(typeof result).toBe('string');
            expect(result).toBe('a1b2c3d4e5f6');
        });
    });

    describe('hashFile', () => {
        it('should hash a file content', () => {
            const mockFileContent = Buffer.from('file content');
            const mockHashObject = {
                update: vi.fn().mockReturnThis(),
                digest: vi.fn().mockReturnValue('file123'),
            };
            
            mockReadFileSync.mockReturnValue(mockFileContent);
            mockCreateHash.mockReturnValue(mockHashObject as any);

            const result = hashFile('sha256', '/path/to/file.txt');

            expect(mockReadFileSync).toHaveBeenCalledWith('/path/to/file.txt');
            expect(mockCreateHash).toHaveBeenCalledWith('sha256');
            expect(mockHashObject.update).toHaveBeenCalledWith(mockFileContent);
            expect(mockHashObject.digest).toHaveBeenCalledWith('hex');
            expect(result).toBe('file123');
        });

        it('should throw error when file reading fails', () => {
            const error = new Error('File not found');
            mockReadFileSync.mockImplementation(() => {
                throw error;
            });

            expect(() => hashFile('sha256', '/nonexistent/file.txt')).toThrow('File not found');
        });
    });

    describe('hashStream', () => {
        it('should hash a readable stream', async () => {
            const mockHashObject = {
                update: vi.fn().mockReturnThis(),
                digest: vi.fn().mockReturnValue('stream789'),
            };
            mockCreateHash.mockReturnValue(mockHashObject as any);

            let readCount = 0;
            const mockStream = new Readable({
                read() {
                    if (readCount === 0) {
                        this.push('chunk1');
                        this.push('chunk2');
                        this.push(null); // end stream
                        readCount++;
                    }
                }
            });

            const result = await hashStream('sha256', mockStream);

            expect(mockCreateHash).toHaveBeenCalledWith('sha256');
            expect(mockHashObject.update).toHaveBeenCalledWith(Buffer.from('chunk1'));
            expect(mockHashObject.update).toHaveBeenCalledWith(Buffer.from('chunk2'));
            expect(mockHashObject.digest).toHaveBeenCalledWith('hex');
            expect(result).toBe('stream789');
        });

        it('should handle empty stream', async () => {
            const mockHashObject = {
                update: vi.fn().mockReturnThis(),
                digest: vi.fn().mockReturnValue('empty'),
            };
            mockCreateHash.mockReturnValue(mockHashObject as any);

            let readCount = 0;
            const mockStream = new Readable({
                read() {
                    if (readCount === 0) {
                        this.push(null); // immediately end stream
                        readCount++;
                    }
                }
            });

            const result = await hashStream('sha256', mockStream);

            expect(mockCreateHash).toHaveBeenCalledWith('sha256');
            expect(mockHashObject.update).not.toHaveBeenCalled();
            expect(mockHashObject.digest).toHaveBeenCalledWith('hex');
            expect(result).toBe('empty');
        });

        it('should reject when stream emits error', async () => {
            const mockHashObject = {
                update: vi.fn().mockReturnThis(),
                digest: vi.fn().mockReturnValue('error'),
            };
            mockCreateHash.mockReturnValue(mockHashObject as any);

            const error = new Error('Stream error');
            let readCount = 0;
            const mockStream = new Readable({
                read() {
                    if (readCount === 0) {
                        this.emit('error', error);
                        readCount++;
                    }
                }
            });

            await expect(hashStream('sha256', mockStream)).rejects.toThrow('Stream error');
        });

        it('should handle multiple data chunks', async () => {
            const mockHashObject = {
                update: vi.fn().mockReturnThis(),
                digest: vi.fn().mockReturnValue('multichunk'),
            };
            mockCreateHash.mockReturnValue(mockHashObject as any);

            const chunks = ['chunk1', 'chunk2', 'chunk3'];
            const mockStream = new Readable({
                read() {
                    const chunk = chunks.shift();
                    if (chunk) {
                        this.push(chunk);
                    } else {
                        this.push(null);
                    }
                }
            });

            const result = await hashStream('sha256', mockStream);

            expect(mockHashObject.update).toHaveBeenCalledTimes(3);
            expect(mockHashObject.update).toHaveBeenNthCalledWith(1, Buffer.from('chunk1'));
            expect(mockHashObject.update).toHaveBeenNthCalledWith(2, Buffer.from('chunk2'));
            expect(mockHashObject.update).toHaveBeenNthCalledWith(3, Buffer.from('chunk3'));
            expect(result).toBe('multichunk');
        });

        it('should handle stream that errors after some data', async () => {
            const mockHashObject = {
                update: vi.fn().mockReturnThis(),
                digest: vi.fn().mockReturnValue('partial'),
            };
            mockCreateHash.mockReturnValue(mockHashObject as any);

            const error = new Error('Mid-stream error');
            let readCount = 0;
            const mockStream = new Readable({
                read() {
                    if (readCount === 0) {
                        this.push('some data');
                        readCount++;
                        // Emit error after some data
                        setImmediate(() => this.emit('error', error));
                    }
                }
            });

            await expect(hashStream('sha256', mockStream)).rejects.toThrow('Mid-stream error');
            expect(mockHashObject.update).toHaveBeenCalledWith(Buffer.from('some data'));
        });
    });
});
