import { describe, it, expect, beforeEach, vi } from 'vitest';
import { UploxFileMetadata } from '../file-metadata';

describe('UploxFileMetadata', () => {
    let mockDate: Date;
    let mockHashes: { md5: string; sha1: string; sha256: string };

    beforeEach(() => {
        // Reset date mocks
        vi.clearAllMocks();
        mockDate = new Date('2023-01-01T00:00:00.000Z');
        mockHashes = {
            md5: 'abc123',
            sha1: 'def456',
            sha256: 'ghi789',
        };
    });

    describe('constructor', () => {
        it('should create an instance with all required properties', () => {
            const metadata = new UploxFileMetadata('test-file.txt', 1024, 'text/plain', mockDate, mockDate, mockHashes);

            expect(metadata).toBeInstanceOf(UploxFileMetadata);
            expect(metadata.name).toBe('test-file.txt');
            expect(metadata.size).toBe(1024);
            expect(metadata.type).toBe('text/plain');
            expect(metadata.createdAt).toBe(mockDate);
            expect(metadata.updatedAt).toBe(mockDate);
            expect(metadata.hashes).toEqual(mockHashes);
        });

        it('should create an instance with null type', () => {
            const metadata = new UploxFileMetadata('test-file', 1024, null, mockDate, mockDate, mockHashes);

            expect(metadata.type).toBeNull();
        });

        it('should create an instance with null hashes', () => {
            const metadata = new UploxFileMetadata('test-file.txt', 1024, 'text/plain', mockDate, mockDate, null);

            expect(metadata.hashes).toBeNull();
        });

        it('should create an instance with partial hashes', () => {
            const partialHashes = { md5: 'abc123' };
            const metadata = new UploxFileMetadata(
                'test-file.txt',
                1024,
                'text/plain',
                mockDate,
                mockDate,
                partialHashes,
            );

            expect(metadata.hashes).toEqual(partialHashes);
        });
    });

    describe('getter methods', () => {
        let metadata: UploxFileMetadata;

        beforeEach(() => {
            metadata = new UploxFileMetadata('test-file.txt', 2048, 'application/json', mockDate, mockDate, mockHashes);
        });

        it('should return correct name', () => {
            expect(metadata.name).toBe('test-file.txt');
        });

        it('should return correct size', () => {
            expect(metadata.size).toBe(2048);
        });

        it('should return correct type', () => {
            expect(metadata.type).toBe('application/json');
        });

        it('should return correct createdAt', () => {
            expect(metadata.createdAt).toBe(mockDate);
        });

        it('should return correct updatedAt', () => {
            expect(metadata.updatedAt).toBe(mockDate);
        });

        it('should return correct hashes', () => {
            expect(metadata.hashes).toEqual(mockHashes);
        });
    });

    describe('toJSON', () => {
        it('should serialize to JSON with all properties', () => {
            const metadata = new UploxFileMetadata('test-file.txt', 1024, 'text/plain', mockDate, mockDate, mockHashes);

            const json = metadata.toJSON();

            expect(json).toEqual({
                name: 'test-file.txt',
                size: 1024,
                type: 'text/plain',
                createdAt: mockDate.toISOString(),
                updatedAt: mockDate.toISOString(),
                hashes: mockHashes,
            });
        });

        it('should serialize to JSON with null type', () => {
            const metadata = new UploxFileMetadata('test-file', 1024, null, mockDate, mockDate, mockHashes);

            const json = metadata.toJSON();

            expect(json.type).toBeNull();
        });

        it('should serialize to JSON with null hashes', () => {
            const metadata = new UploxFileMetadata('test-file.txt', 1024, 'text/plain', mockDate, mockDate, null);

            const json = metadata.toJSON();

            expect(json.hashes).toBeNull();
        });

        it('should convert dates to ISO strings', () => {
            const specificDate = new Date('2023-12-25T15:30:45.123Z');
            const metadata = new UploxFileMetadata(
                'test-file.txt',
                1024,
                'text/plain',
                specificDate,
                specificDate,
                mockHashes,
            );

            const json = metadata.toJSON();

            expect(json.createdAt).toBe('2023-12-25T15:30:45.123Z');
            expect(json.updatedAt).toBe('2023-12-25T15:30:45.123Z');
        });
    });

    describe('fromJSON', () => {
        it('should create instance from valid JSON', () => {
            const json = {
                name: 'test-file.txt',
                size: 1024,
                type: 'text/plain',
                createdAt: mockDate.toISOString(),
                updatedAt: mockDate.toISOString(),
                hashes: mockHashes,
            };

            const metadata = UploxFileMetadata.fromJSON(json);

            expect(metadata).toBeInstanceOf(UploxFileMetadata);
            expect(metadata.name).toBe('test-file.txt');
            expect(metadata.size).toBe(1024);
            expect(metadata.type).toBe('text/plain');
            expect(metadata.createdAt).toEqual(mockDate);
            expect(metadata.updatedAt).toEqual(mockDate);
            expect(metadata.hashes).toEqual(mockHashes);
        });

        it('should create instance from JSON with null type', () => {
            const json = {
                name: 'test-file',
                size: 1024,
                type: null,
                createdAt: mockDate.toISOString(),
                updatedAt: mockDate.toISOString(),
                hashes: mockHashes,
            };

            const metadata = UploxFileMetadata.fromJSON(json);

            expect(metadata.type).toBeNull();
        });

        it('should create instance from JSON with null hashes', () => {
            const json = {
                name: 'test-file.txt',
                size: 1024,
                type: 'text/plain',
                createdAt: mockDate.toISOString(),
                updatedAt: mockDate.toISOString(),
                hashes: null,
            };

            const metadata = UploxFileMetadata.fromJSON(json);

            expect(metadata.hashes).toBeNull();
        });

        it('should create instance from JSON with partial hashes', () => {
            const partialHashes = { md5: 'abc123', sha256: 'ghi789' };
            const json = {
                name: 'test-file.txt',
                size: 1024,
                type: 'text/plain',
                createdAt: mockDate.toISOString(),
                updatedAt: mockDate.toISOString(),
                hashes: partialHashes,
            };

            const metadata = UploxFileMetadata.fromJSON(json);

            expect(metadata.hashes).toEqual(partialHashes);
        });

        it('should throw error when name is missing', () => {
            const json = {
                size: 1024,
                type: 'text/plain',
                createdAt: mockDate.toISOString(),
                updatedAt: mockDate.toISOString(),
                hashes: mockHashes,
            };

            expect(() => UploxFileMetadata.fromJSON(json)).toThrow('[UploxFileMetadata] Invalid file metadata:');
        });

        it('should throw error when size is missing', () => {
            const json = {
                name: 'test-file.txt',
                type: 'text/plain',
                createdAt: mockDate.toISOString(),
                updatedAt: mockDate.toISOString(),
                hashes: mockHashes,
            };

            expect(() => UploxFileMetadata.fromJSON(json)).toThrow('[UploxFileMetadata] Invalid file metadata:');
        });

        it('should create instance with invalid date when createdAt is missing', () => {
            const json = {
                name: 'test-file.txt',
                size: 1024,
                type: 'text/plain',
                updatedAt: mockDate.toISOString(),
                hashes: mockHashes,
            };

            const metadata = UploxFileMetadata.fromJSON(json);

            expect(metadata).toBeInstanceOf(UploxFileMetadata);
            expect(isNaN(metadata.createdAt.getTime())).toBe(true); // Invalid date
        });

        it('should create instance with invalid date when updatedAt is missing', () => {
            const json = {
                name: 'test-file.txt',
                size: 1024,
                type: 'text/plain',
                createdAt: mockDate.toISOString(),
                hashes: mockHashes,
            };

            const metadata = UploxFileMetadata.fromJSON(json);

            expect(metadata).toBeInstanceOf(UploxFileMetadata);
            expect(isNaN(metadata.updatedAt.getTime())).toBe(true); // Invalid date
        });

        it('should throw error when name is empty string', () => {
            const json = {
                name: '',
                size: 1024,
                type: 'text/plain',
                createdAt: mockDate.toISOString(),
                updatedAt: mockDate.toISOString(),
                hashes: mockHashes,
            };

            expect(() => UploxFileMetadata.fromJSON(json)).toThrow('[UploxFileMetadata] Invalid file metadata:');
        });

        it('should throw error when size is 0', () => {
            const json = {
                name: 'test-file.txt',
                size: 0,
                type: 'text/plain',
                createdAt: mockDate.toISOString(),
                updatedAt: mockDate.toISOString(),
                hashes: mockHashes,
            };

            expect(() => UploxFileMetadata.fromJSON(json)).toThrow('[UploxFileMetadata] Invalid file metadata:');
        });

        it('should create instance with invalid date when date string is invalid', () => {
            const json = {
                name: 'test-file.txt',
                size: 1024,
                type: 'text/plain',
                createdAt: 'invalid-date',
                updatedAt: mockDate.toISOString(),
                hashes: mockHashes,
            };

            const metadata = UploxFileMetadata.fromJSON(json);

            expect(metadata).toBeInstanceOf(UploxFileMetadata);
            expect(isNaN(metadata.createdAt.getTime())).toBe(true); // Invalid date
            expect(metadata.updatedAt).toEqual(mockDate); // Valid date
        });

        it('should include original JSON in error message', () => {
            const json = {
                name: '',
                size: 1024,
                type: 'text/plain',
                createdAt: mockDate.toISOString(),
                updatedAt: mockDate.toISOString(),
                hashes: mockHashes,
            };

            expect(() => UploxFileMetadata.fromJSON(json)).toThrow(JSON.stringify(json));
        });
    });

    describe('edge cases', () => {
        it('should handle very large file sizes', () => {
            const largeSize = Number.MAX_SAFE_INTEGER;
            const metadata = new UploxFileMetadata(
                'large-file.bin',
                largeSize,
                'application/octet-stream',
                mockDate,
                mockDate,
                mockHashes,
            );

            expect(metadata.size).toBe(largeSize);
        });

        it('should handle special characters in filename', () => {
            const specialName = 'test-file-with-特殊字符-and-émojis-🎉.txt';
            const metadata = new UploxFileMetadata(specialName, 1024, 'text/plain', mockDate, mockDate, mockHashes);

            expect(metadata.name).toBe(specialName);
        });

        it('should handle empty hashes object', () => {
            const emptyHashes = {};
            const metadata = new UploxFileMetadata(
                'test-file.txt',
                1024,
                'text/plain',
                mockDate,
                mockDate,
                emptyHashes,
            );

            expect(metadata.hashes).toEqual(emptyHashes);
        });

        it('should roundtrip through JSON serialization', () => {
            const original = new UploxFileMetadata('test-file.txt', 1024, 'text/plain', mockDate, mockDate, mockHashes);

            const json = original.toJSON();
            const restored = UploxFileMetadata.fromJSON(json);

            expect(restored.name).toBe(original.name);
            expect(restored.size).toBe(original.size);
            expect(restored.type).toBe(original.type);
            expect(restored.createdAt).toEqual(original.createdAt);
            expect(restored.updatedAt).toEqual(original.updatedAt);
            expect(restored.hashes).toEqual(original.hashes);
        });
    });
});
