import { beforeEach, describe, expect, it, vi } from 'vitest';
import { UploxFile } from '../file';

describe('UploxFile', () => {
    const mockDate = new Date('2023-01-01T00:00:00.000Z');
    const mockHashes = {
        md5: 'abc123',
        sha1: 'def456',
        sha256: 'ghi789'
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('constructor', () => {
        it('should create an instance with all parameters', () => {
            const file = new UploxFile(
                'test-id',
                'test-file.txt',
                1024,
                'text/plain',
                'txt',
                mockDate,
                mockDate,
                mockHashes
            );

            expect(file.id).toBe('test-id');
            expect(file.name).toBe('test-file.txt');
            expect(file.size).toBe(1024);
            expect(file.mimeType).toBe('text/plain');
            expect(file.extension).toBe('txt');
            expect(file.createdAt).toBe(mockDate);
            expect(file.updatedAt).toBe(mockDate);
            expect(file.hashes).toEqual(mockHashes);
        });

        it('should create an instance with only required parameters', () => {
            const file = new UploxFile('test-id', 'test-file.txt', 1024);

            expect(file.id).toBe('test-id');
            expect(file.name).toBe('test-file.txt');
            expect(file.size).toBe(1024);
            expect(file.mimeType).toBeUndefined();
            expect(file.extension).toBeUndefined();
            expect(file.createdAt).toBeUndefined();
            expect(file.updatedAt).toBeUndefined();
            expect(file.hashes).toBeUndefined();
        });

        it('should handle empty strings for optional parameters', () => {
            const file = new UploxFile(
                'test-id',
                'test-file.txt',
                1024,
                '',
                '',
                undefined,
                undefined,
                {}
            );

            expect(file.mimeType).toBe('');
            expect(file.extension).toBe('');
            expect(file.hashes).toEqual({});
        });
    });

    describe('fromJSON', () => {
        it('should create an instance from valid JSON with all properties', () => {
            const json = {
                id: 'test-id',
                name: 'test-file.txt',
                size: 1024,
                mimeType: 'text/plain',
                extension: 'txt',
                createdAt: mockDate,
                updatedAt: mockDate,
                hashes: mockHashes
            };

            const file = UploxFile.fromJSON(json);

            expect(file.id).toBe('test-id');
            expect(file.name).toBe('test-file.txt');
            expect(file.size).toBe(1024);
            expect(file.mimeType).toBe('text/plain');
            expect(file.extension).toBe('txt');
            expect(file.createdAt).toBe(mockDate);
            expect(file.updatedAt).toBe(mockDate);
            expect(file.hashes).toEqual(mockHashes);
        });

        it('should create an instance from valid JSON with only required properties', () => {
            const json = {
                id: 'test-id',
                name: 'test-file.txt',
                size: 1024
            };

            const file = UploxFile.fromJSON(json);

            expect(file.id).toBe('test-id');
            expect(file.name).toBe('test-file.txt');
            expect(file.size).toBe(1024);
            expect(file.mimeType).toBeUndefined();
            expect(file.extension).toBeUndefined();
            expect(file.createdAt).toBeUndefined();
            expect(file.updatedAt).toBeUndefined();
            expect(file.hashes).toBeUndefined();
        });

        it('should throw error when id is missing', () => {
            const json = {
                name: 'test-file.txt',
                size: 1024
            };

            expect(() => UploxFile.fromJSON(json)).toThrow('Invalid file JSON');
        });

        it('should throw error when name is missing', () => {
            const json = {
                id: 'test-id',
                size: 1024
            };

            expect(() => UploxFile.fromJSON(json)).toThrow('Invalid file JSON');
        });

        it('should throw error when size is missing', () => {
            const json = {
                id: 'test-id',
                name: 'test-file.txt'
            };

            expect(() => UploxFile.fromJSON(json)).toThrow('Invalid file JSON');
        });

        it('should throw error when id is empty string', () => {
            const json = {
                id: '',
                name: 'test-file.txt',
                size: 1024
            };

            expect(() => UploxFile.fromJSON(json)).toThrow('Invalid file JSON');
        });

        it('should throw error when name is empty string', () => {
            const json = {
                id: 'test-id',
                name: '',
                size: 1024
            };

            expect(() => UploxFile.fromJSON(json)).toThrow('Invalid file JSON');
        });

        it('should throw error when size is 0', () => {
            const json = {
                id: 'test-id',
                name: 'test-file.txt',
                size: 0
            };

            expect(() => UploxFile.fromJSON(json)).toThrow('Invalid file JSON');
        });

        it('should throw error when id is null', () => {
            const json = {
                id: null,
                name: 'test-file.txt',
                size: 1024
            };

            expect(() => UploxFile.fromJSON(json)).toThrow('Invalid file JSON');
        });

        it('should throw error when name is null', () => {
            const json = {
                id: 'test-id',
                name: null,
                size: 1024
            };

            expect(() => UploxFile.fromJSON(json)).toThrow('Invalid file JSON');
        });

        it('should throw error when size is null', () => {
            const json = {
                id: 'test-id',
                name: 'test-file.txt',
                size: null
            };

            expect(() => UploxFile.fromJSON(json)).toThrow('Invalid file JSON');
        });

        it('should handle falsy but valid values for optional properties', () => {
            const json = {
                id: 'test-id',
                name: 'test-file.txt',
                size: 1024,
                mimeType: '',
                extension: '',
                createdAt: null,
                updatedAt: null,
                hashes: null
            };

            const file = UploxFile.fromJSON(json);

            expect(file.mimeType).toBe('');
            expect(file.extension).toBe('');
            expect(file.createdAt).toBeNull();
            expect(file.updatedAt).toBeNull();
            expect(file.hashes).toBeNull();
        });
    });

    describe('toJSON', () => {
        it('should return JSON representation with all properties', () => {
            const file = new UploxFile(
                'test-id',
                'test-file.txt',
                1024,
                'text/plain',
                'txt',
                mockDate,
                mockDate,
                mockHashes
            );

            const json = file.toJSON();

            expect(json).toEqual({
                id: 'test-id',
                name: 'test-file.txt',
                size: 1024,
                mimeType: 'text/plain',
                extension: 'txt',
                createdAt: mockDate,
                updatedAt: mockDate,
                hashes: mockHashes
            });
        });

        it('should return JSON representation with only required properties', () => {
            const file = new UploxFile('test-id', 'test-file.txt', 1024);

            const json = file.toJSON();

            expect(json).toEqual({
                id: 'test-id',
                name: 'test-file.txt',
                size: 1024,
                mimeType: undefined,
                extension: undefined,
                createdAt: undefined,
                updatedAt: undefined,
                hashes: undefined
            });
        });

        it('should return JSON representation with falsy values', () => {
            const file = new UploxFile(
                'test-id',
                'test-file.txt',
                1024,
                '',
                '',
                null as any,
                null as any,
                {}
            );

            const json = file.toJSON();

            expect(json).toEqual({
                id: 'test-id',
                name: 'test-file.txt',
                size: 1024,
                mimeType: '',
                extension: '',
                createdAt: null,
                updatedAt: null,
                hashes: {}
            });
        });
    });

    describe('fromFile', () => {
        it('should create an instance from File object', () => {
            // Mock the File constructor
            const mockFile = {
                name: 'test-file.txt',
                size: 1024,
                type: 'text/plain'
            } as File;

            const file = UploxFile.fromFile(mockFile, 'test-id');

            expect(file.id).toBe('test-id');
            expect(file.name).toBe('test-file.txt');
            expect(file.size).toBe(1024);
            expect(file.mimeType).toBeUndefined();
            expect(file.extension).toBeUndefined();
            expect(file.createdAt).toBeUndefined();
            expect(file.updatedAt).toBeUndefined();
            expect(file.hashes).toBeUndefined();
        });

        it('should handle File object with special characters in name', () => {
            const mockFile = {
                name: 'test-file (1) [copy].txt',
                size: 2048,
                type: 'text/plain'
            } as File;

            const file = UploxFile.fromFile(mockFile, 'test-id-special');

            expect(file.id).toBe('test-id-special');
            expect(file.name).toBe('test-file (1) [copy].txt');
            expect(file.size).toBe(2048);
        });

        it('should handle File object with empty name', () => {
            const mockFile = {
                name: '',
                size: 512,
                type: 'application/octet-stream'
            } as File;

            const file = UploxFile.fromFile(mockFile, 'test-id-empty');

            expect(file.id).toBe('test-id-empty');
            expect(file.name).toBe('');
            expect(file.size).toBe(512);
        });

        it('should handle File object with zero size', () => {
            const mockFile = {
                name: 'empty-file.txt',
                size: 0,
                type: 'text/plain'
            } as File;

            const file = UploxFile.fromFile(mockFile, 'test-id-zero');

            expect(file.id).toBe('test-id-zero');
            expect(file.name).toBe('empty-file.txt');
            expect(file.size).toBe(0);
        });
    });

    describe('roundtrip serialization', () => {
        it('should maintain data integrity through fromJSON -> toJSON cycle', () => {
            const originalData = {
                id: 'test-id',
                name: 'test-file.txt',
                size: 1024,
                mimeType: 'text/plain',
                extension: 'txt',
                createdAt: mockDate,
                updatedAt: mockDate,
                hashes: mockHashes
            };

            const file = UploxFile.fromJSON(originalData);
            const serialized = file.toJSON();

            expect(serialized).toEqual(originalData);
        });

        it('should maintain data integrity with minimal data', () => {
            const originalData = {
                id: 'test-id',
                name: 'test-file.txt',
                size: 1024
            };

            const file = UploxFile.fromJSON(originalData);
            const serialized = file.toJSON();

            expect(serialized).toEqual({
                ...originalData,
                mimeType: undefined,
                extension: undefined,
                createdAt: undefined,
                updatedAt: undefined,
                hashes: undefined
            });
        });
    });

    describe('edge cases and properties', () => {
        it('should handle large file sizes', () => {
            const largeSize = Number.MAX_SAFE_INTEGER;
            const file = new UploxFile('test-id', 'large-file.bin', largeSize);

            expect(file.size).toBe(largeSize);
            expect(file.toJSON().size).toBe(largeSize);
        });

        it('should handle Unicode characters in file names', () => {
            const unicodeName = 'файл-тест-🎉.txt';
            const file = new UploxFile('test-id', unicodeName, 1024);

            expect(file.name).toBe(unicodeName);
            expect(file.toJSON().name).toBe(unicodeName);
        });

        it('should handle complex mime types', () => {
            const complexMimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
            const file = new UploxFile('test-id', 'document.docx', 1024, complexMimeType);

            expect(file.mimeType).toBe(complexMimeType);
            expect(file.toJSON().mimeType).toBe(complexMimeType);
        });

        it('should handle partial hash objects', () => {
            const partialHashes = { md5: 'abc123' };
            const file = new UploxFile('test-id', 'file.txt', 1024, undefined, undefined, undefined, undefined, partialHashes);

            expect(file.hashes).toEqual(partialHashes);
            expect(file.toJSON().hashes).toEqual(partialHashes);
        });

        it('should be instances of UploxFile', () => {
            const file1 = new UploxFile('test-id', 'test-file.txt', 1024);
            const file2 = UploxFile.fromJSON({ id: 'test-id', name: 'test-file.txt', size: 1024 });
            const mockFile = { name: 'test-file.txt', size: 1024 } as File;
            const file3 = UploxFile.fromFile(mockFile, 'test-id');

            expect(file1).toBeInstanceOf(UploxFile);
            expect(file2).toBeInstanceOf(UploxFile);
            expect(file3).toBeInstanceOf(UploxFile);
        });
    });
});
