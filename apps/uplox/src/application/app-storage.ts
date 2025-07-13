import { Readable } from 'stream';

export interface UploxStorage<T> {
    saveFile(file: File, metadata: T, id: string): Promise<void>;
    saveFileStream(stream: Readable, metadata: T, id: string): Promise<void>;
    metadataFileName(originalFileName: string): Promise<string>;
    getBucket(): string;
    getDownloadableUrl(id: string, ttl?: number): Promise<string>;
    fileExist(id: string): Promise<boolean>;
    getFileMetadata(id: string): Promise<T>;
}
