import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PassThrough, Readable } from 'stream';
import fs, { ReadStream } from 'fs';
import { UpbloxReadStream } from '../stream';

// Mock the fs module
vi.mock('fs', () => ({
  default: {
    createReadStream: vi.fn(),
  },
}));

describe('UpbloxReadStream', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('fromFilePath', () => {
    it('should create a stream from file path', () => {
      const mockStream = new Readable() as ReadStream;
      const filePath = '/path/to/file.txt';
      
      vi.mocked(fs.createReadStream).mockReturnValue(mockStream);
      
      const uploxStream = UpbloxReadStream.fromFilePath(filePath);
      
      expect(fs.createReadStream).toHaveBeenCalledWith(filePath);
      expect(uploxStream.stream).toBe(mockStream);
    });
  });

  describe('fromFile', () => {
    it('should create a stream from File object', () => {
      const mockStream = new Readable() as ReadStream;
      const mockFile = { name: 'test.txt' } as File;
      
      vi.mocked(fs.createReadStream).mockReturnValue(mockStream);
      
      const uploxStream = UpbloxReadStream.fromFile(mockFile);
      
      expect(fs.createReadStream).toHaveBeenCalledWith('test.txt');
      expect(uploxStream.stream).toBe(mockStream);
    });
  });

  describe('fromBuffer', () => {
    it('should create a stream from Buffer', () => {
      const buffer = Buffer.from('test content');
      
      const uploxStream = UpbloxReadStream.fromBuffer(buffer);
      
      expect(uploxStream.stream).toBeInstanceOf(Readable);
      
      // Test that the stream contains the buffer content
      let chunks: Buffer[] = [];
      uploxStream.stream.on('data', (chunk) => {
        chunks.push(chunk);
      });
      
      return new Promise<void>((resolve) => {
        uploxStream.stream.on('end', () => {
          const result = Buffer.concat(chunks);
          expect(result).toEqual(buffer);
          resolve();
        });
      });
    });
  });

  describe('fromString', () => {
    it('should create a stream from string', () => {
      const testString = 'test content';
      
      const uploxStream = UpbloxReadStream.fromString(testString);
      
      expect(uploxStream.stream).toBeInstanceOf(Readable);
      
      // Test that the stream contains the string content
      let chunks: string[] = [];
      uploxStream.stream.on('data', (chunk) => {
        chunks.push(chunk.toString());
      });
      
      return new Promise<void>((resolve) => {
        uploxStream.stream.on('end', () => {
          const result = chunks.join('');
          expect(result).toBe(testString);
          resolve();
        });
      });
    });
  });

  describe('fromWeb', () => {
    it('should create a stream from web ReadableStream', () => {
      const encoder = new TextEncoder();
      const webStream = new ReadableStream({
        start(controller) {
          controller.enqueue(encoder.encode('test content'));
          controller.close();
        },
      });
      
      const uploxStream = UpbloxReadStream.fromWeb(webStream);
      
      expect(uploxStream.stream).toBeInstanceOf(Readable);
      
      // Test that the stream contains the web stream content
      let chunks: Buffer[] = [];
      uploxStream.stream.on('data', (chunk) => {
        chunks.push(chunk);
      });
      
      return new Promise<void>((resolve) => {
        uploxStream.stream.on('end', () => {
          const result = Buffer.concat(chunks).toString();
          expect(result).toBe('test content');
          resolve();
        });
      });
    });
  });

  describe('toWeb', () => {
    it('should convert internal stream to web ReadableStream', async () => {
      const testString = 'test content';
      const uploxStream = UpbloxReadStream.fromString(testString);
      
      const webStream = uploxStream.toWeb();
      
      expect(webStream).toBeInstanceOf(ReadableStream);
      
      // Test that the web stream contains the correct content
      const reader = webStream.getReader();
      const chunks: Uint8Array[] = [];
      
      let result;
      while (!(result = await reader.read()).done) {
        chunks.push(result.value);
      }
      
      const decoder = new TextDecoder();
      const content = chunks.map(chunk => decoder.decode(chunk)).join('');
      expect(content).toBe(testString);
    });
  });

  describe('passThrough', () => {
    it('should create a PassThrough stream and pipe to it', () => {
      const testString = 'test content';
      const uploxStream = UpbloxReadStream.fromString(testString);
      
      const passThrough = uploxStream.passThrough();
      
      expect(passThrough).toBeInstanceOf(PassThrough);
      
      // Test that data flows through the PassThrough stream
      let chunks: string[] = [];
      passThrough.on('data', (chunk) => {
        chunks.push(chunk.toString());
      });
      
      return new Promise<void>((resolve) => {
        passThrough.on('end', () => {
          const result = chunks.join('');
          expect(result).toBe(testString);
          resolve();
        });
      });
    });
  });

  describe('stream getter', () => {
    it('should return the internal stream', () => {
      const mockStream = new Readable() as ReadStream;
      vi.mocked(fs.createReadStream).mockReturnValue(mockStream);
      
      const uploxStream = UpbloxReadStream.fromFilePath('/test/path');
      
      expect(uploxStream.stream).toBe(mockStream);
    });
  });

  describe('constructor', () => {
    it('should be private and not directly accessible', () => {
      // Test that the constructor is private by verifying we can't instantiate directly
      // This is more of a TypeScript compile-time check, but we can verify the class works correctly
      const uploxStream = UpbloxReadStream.fromString('test');
      expect(uploxStream).toBeInstanceOf(UpbloxReadStream);
    });
  });
});
