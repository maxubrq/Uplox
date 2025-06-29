import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UploxFile, type FileHashes } from '../file';

// Mock File constructor if not available in Node environment
global.File =
    global.File ||
    class File {
        constructor(
            public chunks: BlobPart[],
            public name: string,
            public options: FilePropertyBag = {},
        ) {
            this.size = chunks.reduce((total, chunk) => {
                if (typeof chunk === 'string') return total + chunk.length;
                if (chunk instanceof ArrayBuffer) return total + chunk.byteLength;
                if (chunk instanceof Uint8Array) return total + chunk.length;
                return total;
            }, 0);
            this.type = options.type || '';
            this.lastModified = options.lastModified || Date.now();
        }

        size: number;
        type: string;
        lastModified: number;
    };

describe('UploxFile', () => {
    let mockFile: File;
    let mockHashes: FileHashes;

    beforeEach(() => {
        // Setup common test data
        mockFile = new File(['test file content'], 'test.txt', { type: 'text/plain' });
        mockHashes = {
            md5: 'mock-md5-hash',
            sha1: 'mock-sha1-hash',
            sha256: 'mock-sha256-hash',
            blake3: 'mock-blake3-hash',
        };
    });

    describe('constructor', () => {
        it('should create UploxFile instance with all properties', () => {
            const uploxFile = new UploxFile('test-id', 'test.txt', 1024, 'text/plain', mockHashes, mockFile);

            expect(uploxFile.id).toBe('test-id');
            expect(uploxFile.name).toBe('test.txt');
            expect(uploxFile.size).toBe(1024);
            expect(uploxFile.type).toBe('text/plain');
            expect(uploxFile.hashes).toEqual(mockHashes);
            expect(uploxFile.file).toBe(mockFile);
        });

        it('should create UploxFile instance with null hashes', () => {
            const uploxFile = new UploxFile('test-id', 'test.txt', 1024, 'text/plain', null, mockFile);

            expect(uploxFile.hashes).toBeNull();
        });
    });

    describe('fromFileWithHashes', () => {
        it('should create UploxFile from File with hashes', () => {
            const uploxFile = UploxFile.fromFileWithHashes('test-id', mockFile, mockHashes);

            expect(uploxFile.id).toBe('test-id');
            expect(uploxFile.name).toBe(mockFile.name);
            expect(uploxFile.size).toBe(mockFile.size);
            expect(uploxFile.type).toBe(mockFile.type);
            expect(uploxFile.hashes).toEqual(mockHashes);
            expect(uploxFile.file).toBe(mockFile);
        });

        it('should handle File with different properties', () => {
            const customFile = new File(['different content'], 'custom.pdf', {
                type: 'application/pdf',
            });
            const customHashes: FileHashes = {
                blake3: 'custom-blake3-hash',
            };

            const uploxFile = UploxFile.fromFileWithHashes('custom-id', customFile, customHashes);

            expect(uploxFile.id).toBe('custom-id');
            expect(uploxFile.name).toBe('custom.pdf');
            expect(uploxFile.type).toBe('application/pdf');
            expect(uploxFile.hashes).toEqual(customHashes);
        });
    });

    describe('fromFile', () => {
        it('should create UploxFile from File without hashes', () => {
            const uploxFile = UploxFile.fromFile('test-id', mockFile);

            expect(uploxFile.id).toBe('test-id');
            expect(uploxFile.name).toBe(mockFile.name);
            expect(uploxFile.size).toBe(mockFile.size);
            expect(uploxFile.type).toBe(mockFile.type);
            expect(uploxFile.hashes).toBeNull();
            expect(uploxFile.file).toBe(mockFile);
        });

        it('should handle empty File', () => {
            const emptyFile = new File([], 'empty.txt', { type: 'text/plain' });
            const uploxFile = UploxFile.fromFile('empty-id', emptyFile);

            expect(uploxFile.size).toBe(0);
            expect(uploxFile.name).toBe('empty.txt');
            expect(uploxFile.type).toBe('text/plain');
            expect(uploxFile.hashes).toBeNull();
        });
    });

    describe('fromBufferWithMeta', () => {
        it('should create UploxFile from Buffer with metadata', () => {
            const buffer = Buffer.from('test buffer content');
            const meta = {
                size: 1024,
                type: 'application/octet-stream',
                name: 'buffer-file.bin',
                hashes: mockHashes,
            };

            const uploxFile = UploxFile.fromBufferWithMeta('buffer-id', buffer, meta);

            expect(uploxFile.id).toBe('buffer-id');
            expect(uploxFile.name).toBe(meta.name);
            expect(uploxFile.size).toBe(meta.size);
            expect(uploxFile.type).toBe(meta.type);
            expect(uploxFile.hashes).toEqual(mockHashes);
            expect(uploxFile.file).toBeInstanceOf(File);
            expect(uploxFile.file.name).toBe(meta.name);
            expect(uploxFile.file.type).toBe(meta.type);
        });

        it('should handle Buffer with minimal metadata', () => {
            const buffer = Buffer.from('minimal test');
            const meta = {
                size: 12,
                type: 'text/plain',
                name: 'minimal.txt',
                hashes: null,
            };

            const uploxFile = UploxFile.fromBufferWithMeta('minimal-id', buffer, meta);

            expect(uploxFile.hashes).toBeNull();
            expect(uploxFile.size).toBe(12);
        });

        it('should handle Buffer with partial hashes', () => {
            const buffer = Buffer.from('partial hash test');
            const partialHashes: FileHashes = {
                blake3: 'only-blake3-hash',
            };
            const meta = {
                size: 17,
                type: 'text/plain',
                name: 'partial.txt',
                hashes: partialHashes,
            };

            const uploxFile = UploxFile.fromBufferWithMeta('partial-id', buffer, meta);

            expect(uploxFile.hashes).toEqual(partialHashes);
            expect(uploxFile.hashes?.md5).toBeUndefined();
            expect(uploxFile.hashes?.sha1).toBeUndefined();
            expect(uploxFile.hashes?.sha256).toBeUndefined();
            expect(uploxFile.hashes?.blake3).toBe('only-blake3-hash');
        });
    });

    describe('toJSON', () => {
        it('should return JSON representation with all properties', () => {
            const uploxFile = new UploxFile('json-id', 'json-test.txt', 2048, 'text/plain', mockHashes, mockFile);

            const json = uploxFile.toJSON();

            expect(json).toEqual({
                id: 'json-id',
                name: 'json-test.txt',
                size: 2048,
                type: 'text/plain',
                hashes: mockHashes,
            });
        });

        it('should return JSON representation with null hashes', () => {
            const uploxFile = new UploxFile('json-null-id', 'null-hashes.txt', 512, 'text/plain', null, mockFile);

            const json = uploxFile.toJSON();

            expect(json).toEqual({
                id: 'json-null-id',
                name: 'null-hashes.txt',
                size: 512,
                type: 'text/plain',
                hashes: null,
            });
        });

        it('should not include file property in JSON', () => {
            const uploxFile = UploxFile.fromFile('no-file-id', mockFile);
            const json = uploxFile.toJSON();

            expect(json).not.toHaveProperty('file');
            expect(Object.keys(json)).toEqual(['id', 'name', 'size', 'type', 'hashes']);
        });

        it('should handle empty string properties', () => {
            const emptyFile = new File([''], '', { type: '' });
            const uploxFile = new UploxFile('', '', 0, '', null, emptyFile);
            const json = uploxFile.toJSON();

            expect(json.id).toBe('');
            expect(json.name).toBe('');
            expect(json.type).toBe('');
            expect(json.size).toBe(0);
            expect(json.hashes).toBeNull();
        });
    });

    describe('integration tests', () => {
        it('should maintain consistency between static factory methods and constructor', () => {
            const fileFromFactory = UploxFile.fromFileWithHashes('test', mockFile, mockHashes);
            const fileFromConstructor = new UploxFile(
                'test',
                mockFile.name,
                mockFile.size,
                mockFile.type,
                mockHashes,
                mockFile,
            );

            expect(fileFromFactory.toJSON()).toEqual(fileFromConstructor.toJSON());
        });

        it('should create equivalent UploxFile instances from different methods', () => {
            const buffer = Buffer.from('test content');
            const meta = {
                size: mockFile.size,
                type: mockFile.type,
                name: mockFile.name,
                hashes: mockHashes,
            };

            const fromFile = UploxFile.fromFileWithHashes('same-id', mockFile, mockHashes);
            const fromBuffer = UploxFile.fromBufferWithMeta('same-id', buffer, meta);

            // Should have same JSON representation (excluding file differences)
            expect(fromFile.toJSON()).toEqual(fromBuffer.toJSON());
        });
    });
});
