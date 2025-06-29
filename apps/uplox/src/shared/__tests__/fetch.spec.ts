import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchFile } from '../fetch';

// Mock global fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock setTimeout and clearTimeout
vi.stubGlobal('setTimeout', vi.fn());
vi.stubGlobal('clearTimeout', vi.fn());
const mockSetTimeout = global.setTimeout as any;
const mockClearTimeout = global.clearTimeout as any;

describe('fetchFile', () => {
    let mockAbortController: {
        signal: AbortSignal;
        abort: ReturnType<typeof vi.fn>;
    };

    beforeEach(() => {
        vi.clearAllMocks();

        // Mock AbortController
        mockAbortController = {
            signal: { aborted: false } as AbortSignal,
            abort: vi.fn(),
        };
        global.AbortController = vi.fn(() => mockAbortController) as any;

        // Reset and setup setTimeout mock to return a timeout ID
        mockSetTimeout.mockReset();
        mockClearTimeout.mockReset();
        mockSetTimeout.mockReturnValue(123 as any);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('successful fetch', () => {
        it('should fetch a file successfully with default timeout', async () => {
            const mockBlob = new Blob(['test content'], { type: 'text/plain' });
            const mockResponse = {
                blob: vi.fn().mockResolvedValue(mockBlob),
            };
            mockFetch.mockResolvedValue(mockResponse);

            const url = 'https://example.com/test-file.txt';
            const result = await fetchFile(url);

            expect(mockFetch).toHaveBeenCalledWith(url, { signal: mockAbortController.signal });
            expect(mockSetTimeout).toHaveBeenCalledWith(expect.any(Function), 10000);
            expect(mockClearTimeout).toHaveBeenCalledWith(123);
            expect(result).toBeInstanceOf(File);
            expect(result.name).toBe('test-file.txt');
            expect(result.type).toBe('text/plain');
        });

        it('should fetch a file successfully with custom timeout', async () => {
            const mockBlob = new Blob(['test content'], { type: 'image/jpeg' });
            const mockResponse = {
                blob: vi.fn().mockResolvedValue(mockBlob),
            };
            mockFetch.mockResolvedValue(mockResponse);

            const url = 'https://example.com/image.jpg';
            const customTimeout = 5000;
            const result = await fetchFile(url, customTimeout);

            expect(mockSetTimeout).toHaveBeenCalledWith(expect.any(Function), customTimeout);
            expect(result.name).toBe('image.jpg');
            expect(result.type).toBe('image/jpeg');
        });

        it('should handle URLs without file extension', async () => {
            const mockBlob = new Blob(['test content'], { type: 'application/octet-stream' });
            const mockResponse = {
                blob: vi.fn().mockResolvedValue(mockBlob),
            };
            mockFetch.mockResolvedValue(mockResponse);

            const url = 'https://example.com/somefile';
            const result = await fetchFile(url);

            expect(result.name).toBe('somefile');
        });

        it('should handle URLs ending with slash', async () => {
            const mockBlob = new Blob(['test content'], { type: 'text/html' });
            const mockResponse = {
                blob: vi.fn().mockResolvedValue(mockBlob),
            };
            mockFetch.mockResolvedValue(mockResponse);

            const url = 'https://example.com/path/';
            const result = await fetchFile(url);

            expect(result.name).toBe(''); // url.split('/').pop() returns empty string, ?? doesn't activate
        });

        it('should handle complex URLs with query parameters', async () => {
            const mockBlob = new Blob(['test content'], { type: 'application/pdf' });
            const mockResponse = {
                blob: vi.fn().mockResolvedValue(mockBlob),
            };
            mockFetch.mockResolvedValue(mockResponse);

            const url = 'https://example.com/documents/report.pdf?version=1&token=abc123';
            const result = await fetchFile(url);

            expect(result.name).toBe('report.pdf?version=1&token=abc123');
        });
    });

    describe('timeout handling', () => {
        it('should set up timeout correctly and call abort when timeout occurs', async () => {
            const mockBlob = new Blob(['test content'], { type: 'text/plain' });
            const mockResponse = {
                blob: vi.fn().mockResolvedValue(mockBlob),
            };
            mockFetch.mockResolvedValue(mockResponse);

            // Simulate timeout by calling the timeout callback
            mockSetTimeout.mockImplementation((callback: Function) => {
                // Don't actually call the callback, but verify it would call abort
                const timeoutCallback = callback;
                expect(typeof timeoutCallback).toBe('function');

                // Simulate what happens when timeout occurs
                timeoutCallback();
                expect(mockAbortController.abort).toHaveBeenCalled();

                return 123 as any;
            });

            const url = 'https://example.com/test.txt';
            await fetchFile(url, 5000);

            expect(mockSetTimeout).toHaveBeenCalledWith(expect.any(Function), 5000);
        });

        it('should clear timeout after successful fetch', async () => {
            const mockBlob = new Blob(['test content'], { type: 'text/plain' });
            const mockResponse = {
                blob: vi.fn().mockResolvedValue(mockBlob),
            };
            mockFetch.mockResolvedValue(mockResponse);

            const url = 'https://example.com/test.txt';
            await fetchFile(url);

            expect(mockClearTimeout).toHaveBeenCalledWith(123);
        });
    });

    describe('error handling', () => {
        it('should throw error with cause when fetch fails', async () => {
            const originalError = new Error('Network error');
            mockFetch.mockRejectedValue(originalError);

            const url = 'https://example.com/test.txt';

            await expect(fetchFile(url)).rejects.toThrow('Failed to fetch file');

            try {
                await fetchFile(url);
            } catch (error) {
                expect(error).toBeInstanceOf(Error);
                expect((error as Error).cause).toBe(originalError);
            }
        });

        it('should throw error when blob conversion fails', async () => {
            const blobError = new Error('Blob conversion failed');
            const mockResponse = {
                blob: vi.fn().mockRejectedValue(blobError),
            };
            mockFetch.mockResolvedValue(mockResponse);

            const url = 'https://example.com/test.txt';

            await expect(fetchFile(url)).rejects.toThrow('Failed to fetch file');

            try {
                await fetchFile(url);
            } catch (error) {
                expect((error as Error).cause).toBe(blobError);
            }
        });

        it('should throw error when AbortController.abort() is called (timeout)', async () => {
            const abortError = new Error('The operation was aborted');
            abortError.name = 'AbortError';
            mockFetch.mockRejectedValue(abortError);

            const url = 'https://example.com/test.txt';

            await expect(fetchFile(url)).rejects.toThrow('Failed to fetch file');

            try {
                await fetchFile(url);
            } catch (error) {
                expect((error as Error).cause).toBe(abortError);
            }
        });
    });

    describe('File object creation', () => {
        it('should create File with correct properties', async () => {
            const mockBlob = new Blob(['test content'], { type: 'application/json' });
            const mockResponse = {
                blob: vi.fn().mockResolvedValue(mockBlob),
            };
            mockFetch.mockResolvedValue(mockResponse);

            const url = 'https://api.example.com/data.json';
            const result = await fetchFile(url);

            expect(result).toBeInstanceOf(File);
            expect(result.name).toBe('data.json');
            expect(result.type).toBe('application/json');
            expect(result.size).toBe(mockBlob.size);
        });

        it('should handle blob without type', async () => {
            const mockBlob = new Blob(['test content']); // no type specified
            const mockResponse = {
                blob: vi.fn().mockResolvedValue(mockBlob),
            };
            mockFetch.mockResolvedValue(mockResponse);

            const url = 'https://example.com/unknown-file';
            const result = await fetchFile(url);

            expect(result.type).toBe(''); // empty string when no type
            expect(result.name).toBe('unknown-file');
        });
    });
});
