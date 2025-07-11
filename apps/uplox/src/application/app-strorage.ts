import { Readable } from 'stream';

export interface UploxStorage<T> {
    saveFile(file: File, metadata: T, id: string): Promise<void>;
    saveFileStream(stream: Readable, metadata: T, id: string): Promise<void>;
    metadataFileName(originalFileName: string): Promise<string>;
}
