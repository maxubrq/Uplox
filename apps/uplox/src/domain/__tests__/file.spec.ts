import { describe, it, expect, beforeEach, vi } from 'vitest';
import { UploxFile } from '../file';
import { UploxFileMetadata } from '../file-metadata';

// Mock the UploxFileMetadata class
vi.mock('../file-metadata', () => ({
    UploxFileMetadata: vi.fn().mockImplementation(() => ({
        toJSON: vi.fn().mockReturnValue({
            name: 'test-file.txt',
            size: 1024,
            type: 'text/plain',
            createdAt: '2023-01-01T00:00:00.000Z',
            updatedAt: '2023-01-01T00:00:00.000Z',
            hashes: { md5: 'abc123' },
        }),
    })),
}));

describe('UploxFile', () => {
    let mockMetadata: UploxFileMetadata;
    let mockMetadataJSON: any;

    beforeEach(() => {
        vi.clearAllMocks();

        // Create mock metadata instance
        mockMetadata = new UploxFileMetadata('test', 1024, 'text/plain', new Date(), new Date(), null);

        // Mock the toJSON method
        mockMetadataJSON = {
            name: 'test-file.txt',
            size: 1024,
            type: 'text/plain',
            createdAt: '2023-01-01T00:00:00.000Z',
            updatedAt: '2023-01-01T00:00:00.000Z',
            hashes: { md5: 'abc123' },
        };

        vi.mocked(mockMetadata.toJSON).mockReturnValue(mockMetadataJSON);
    });

    describe('constructor', () => {
        it('should create an instance with the provided id', () => {
            const file = new UploxFile('test-file-id');

            expect(file).toBeInstanceOf(UploxFile);
            expect(file.toJSON().id).toBe('test-file-id');
        });

        it('should initialize with null metadata', () => {
            const file = new UploxFile('test-file-id');

            expect(file.toJSON().metadata).toBeUndefined();
        });

        it('should handle empty string id', () => {
            const file = new UploxFile('');

            expect(file.toJSON().id).toBe('');
        });

        it('should handle special characters in id', () => {
            const specialId = 'test-file-with-特殊字符-and-émojis-🎉';
            const file = new UploxFile(specialId);

            expect(file.toJSON().id).toBe(specialId);
        });

        it('should handle very long id', () => {
            const longId = 'a'.repeat(1000);
            const file = new UploxFile(longId);

            expect(file.toJSON().id).toBe(longId);
        });
    });

    describe('withMetadata', () => {
        it('should set metadata and return the same instance', () => {
            const file = new UploxFile('test-file-id');

            const result = file.withMetadata(mockMetadata);

            expect(result).toBe(file); // Should return the same instance
            expect(file.toJSON().metadata).toEqual(mockMetadataJSON);
        });

        it('should allow method chaining', () => {
            const file = new UploxFile('test-file-id');

            const result = file.withMetadata(mockMetadata).withMetadata(mockMetadata);

            expect(result).toBe(file);
            expect(file.toJSON().metadata).toEqual(mockMetadataJSON);
        });

        it('should overwrite previous metadata', () => {
            const file = new UploxFile('test-file-id');
            const firstMetadata = new UploxFileMetadata('first', 100, 'text/plain', new Date(), new Date(), null);
            const secondMetadata = new UploxFileMetadata('second', 200, 'text/html', new Date(), new Date(), null);

            const firstMetadataJSON = {
                name: 'first-file.txt',
                size: 100,
                type: 'text/plain',
                createdAt: '2023-01-01T00:00:00.000Z',
                updatedAt: '2023-01-01T00:00:00.000Z',
                hashes: null,
            };

            const secondMetadataJSON = {
                name: 'second-file.txt',
                size: 200,
                type: 'text/html',
                createdAt: '2023-01-01T00:00:00.000Z',
                updatedAt: '2023-01-01T00:00:00.000Z',
                hashes: null,
            };

            vi.mocked(firstMetadata.toJSON).mockReturnValue(firstMetadataJSON);
            vi.mocked(secondMetadata.toJSON).mockReturnValue(secondMetadataJSON);

            file.withMetadata(firstMetadata);
            expect(file.toJSON().metadata).toEqual(firstMetadataJSON);

            file.withMetadata(secondMetadata);
            expect(file.toJSON().metadata).toEqual(secondMetadataJSON);
        });

        it('should handle null metadata by setting it', () => {
            const file = new UploxFile('test-file-id');
            const nullMetadata = null as any;

            const result = file.withMetadata(nullMetadata);

            expect(result).toBe(file);
            expect(file.toJSON().metadata).toBeUndefined(); // null metadata should result in undefined in JSON
        });
    });

    describe('toJSON', () => {
        it('should serialize file with id and no metadata', () => {
            const file = new UploxFile('test-file-id');

            const json = file.toJSON();

            expect(json).toEqual({
                id: 'test-file-id',
                metadata: undefined,
            });
        });

        it('should serialize file with id and metadata', () => {
            const file = new UploxFile('test-file-id');
            file.withMetadata(mockMetadata);

            const json = file.toJSON();

            expect(json).toEqual({
                id: 'test-file-id',
                metadata: mockMetadataJSON,
            });
            expect(mockMetadata.toJSON).toHaveBeenCalledOnce();
        });

        it('should call metadata.toJSON when metadata exists', () => {
            const file = new UploxFile('test-file-id');
            file.withMetadata(mockMetadata);

            file.toJSON();

            expect(mockMetadata.toJSON).toHaveBeenCalledOnce();
        });

        it('should not call metadata.toJSON when metadata is null', () => {
            const file = new UploxFile('test-file-id');

            file.toJSON();

            expect(mockMetadata.toJSON).not.toHaveBeenCalled();
        });
    });

    describe('fromJSON', () => {
        it('should create instance from JSON with id only', () => {
            const json = {
                id: 'test-file-id',
            };

            const file = UploxFile.fromJSON(json);

            expect(file).toBeInstanceOf(UploxFile);
            expect(file.toJSON().id).toBe('test-file-id');
            expect(file.toJSON().metadata).toBeUndefined();
        });

        it('should create instance from JSON with id and metadata', () => {
            const json = {
                id: 'test-file-id',
                metadata: mockMetadataJSON,
            };

            // Mock the static fromJSON method
            const mockFromJSON = vi.fn().mockReturnValue(mockMetadata);
            vi.mocked(UploxFileMetadata).fromJSON = mockFromJSON;

            const file = UploxFile.fromJSON(json);

            expect(file).toBeInstanceOf(UploxFile);
            expect(file.toJSON().id).toBe('test-file-id');
            expect(file.toJSON().metadata).toEqual(mockMetadataJSON);
            expect(mockFromJSON).toHaveBeenCalledWith(mockMetadataJSON);
        });

        it('should create instance from JSON with null metadata', () => {
            const json = {
                id: 'test-file-id',
                metadata: null,
            };

            const file = UploxFile.fromJSON(json);

            expect(file).toBeInstanceOf(UploxFile);
            expect(file.toJSON().id).toBe('test-file-id');
            expect(file.toJSON().metadata).toBeUndefined();
        });

        it('should create instance from JSON with undefined metadata', () => {
            const json = {
                id: 'test-file-id',
                metadata: undefined,
            };

            const file = UploxFile.fromJSON(json);

            expect(file).toBeInstanceOf(UploxFile);
            expect(file.toJSON().id).toBe('test-file-id');
            expect(file.toJSON().metadata).toBeUndefined();
        });

        it('should handle empty JSON object', () => {
            const json = {};

            const file = UploxFile.fromJSON(json);

            expect(file).toBeInstanceOf(UploxFile);
            expect(file.toJSON().id).toBeUndefined();
            expect(file.toJSON().metadata).toBeUndefined();
        });

        it('should call UploxFileMetadata.fromJSON when metadata exists', () => {
            const json = {
                id: 'test-file-id',
                metadata: mockMetadataJSON,
            };

            const mockFromJSON = vi.fn().mockReturnValue(mockMetadata);
            vi.mocked(UploxFileMetadata).fromJSON = mockFromJSON;

            UploxFile.fromJSON(json);

            expect(mockFromJSON).toHaveBeenCalledWith(mockMetadataJSON);
        });

        it('should not call UploxFileMetadata.fromJSON when metadata is falsy', () => {
            const json = {
                id: 'test-file-id',
                metadata: null,
            };

            const mockFromJSON = vi.fn().mockReturnValue(mockMetadata);
            vi.mocked(UploxFileMetadata).fromJSON = mockFromJSON;

            UploxFile.fromJSON(json);

            expect(mockFromJSON).not.toHaveBeenCalled();
        });
    });

    describe('edge cases', () => {
        it('should handle roundtrip serialization without metadata', () => {
            const original = new UploxFile('test-file-id');

            const json = original.toJSON();
            const restored = UploxFile.fromJSON(json);

            expect(restored.toJSON()).toEqual(original.toJSON());
        });

        it('should handle roundtrip serialization with metadata', () => {
            const original = new UploxFile('test-file-id');
            original.withMetadata(mockMetadata);

            const mockFromJSON = vi.fn().mockReturnValue(mockMetadata);
            vi.mocked(UploxFileMetadata).fromJSON = mockFromJSON;

            const json = original.toJSON();
            const restored = UploxFile.fromJSON(json);

            expect(restored.toJSON()).toEqual(original.toJSON());
            expect(mockFromJSON).toHaveBeenCalledWith(mockMetadataJSON);
        });

        it('should handle multiple metadata changes', () => {
            const file = new UploxFile('test-file-id');
            const metadata1 = new UploxFileMetadata('file1', 100, 'text/plain', new Date(), new Date(), null);
            const metadata2 = new UploxFileMetadata('file2', 200, 'text/html', new Date(), new Date(), null);

            const json1 = {
                name: 'file1.txt',
                size: 100,
                type: 'text/plain',
                createdAt: '2023-01-01T00:00:00.000Z',
                updatedAt: '2023-01-01T00:00:00.000Z',
                hashes: null,
            };
            const json2 = {
                name: 'file2.txt',
                size: 200,
                type: 'text/html',
                createdAt: '2023-01-01T00:00:00.000Z',
                updatedAt: '2023-01-01T00:00:00.000Z',
                hashes: null,
            };

            vi.mocked(metadata1.toJSON).mockReturnValue(json1);
            vi.mocked(metadata2.toJSON).mockReturnValue(json2);

            file.withMetadata(metadata1);
            expect(file.toJSON().metadata).toEqual(json1);

            file.withMetadata(metadata2);
            expect(file.toJSON().metadata).toEqual(json2);
        });

        it('should preserve id when withMetadata is called', () => {
            const file = new UploxFile('original-id');
            const result = file.withMetadata(mockMetadata);

            expect(result.toJSON().id).toBe('original-id');
            expect(result).toBe(file); // Same instance
        });

        it('should handle complex JSON structures', () => {
            const complexJson = {
                id: 'complex-file-id',
                metadata: {
                    name: 'complex-file.txt',
                    size: 2048,
                    type: 'application/json',
                    createdAt: '2023-12-25T15:30:45.123Z',
                    updatedAt: '2023-12-25T15:30:45.123Z',
                    hashes: {
                        md5: 'complex-md5',
                        sha1: 'complex-sha1',
                        sha256: 'complex-sha256',
                    },
                },
                extraProperty: 'should-be-ignored',
            };

            const mockFromJSON = vi.fn().mockReturnValue(mockMetadata);
            vi.mocked(UploxFileMetadata).fromJSON = mockFromJSON;

            const file = UploxFile.fromJSON(complexJson);

            expect(file.toJSON().id).toBe('complex-file-id');
            expect(mockFromJSON).toHaveBeenCalledWith(complexJson.metadata);
        });
    });
});
