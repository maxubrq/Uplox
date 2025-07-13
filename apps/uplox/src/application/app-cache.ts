import { UploxFile } from '@domain';

export interface UploxCache {
    setFile(file: UploxFile, ttl?: number): Promise<void>;
    getFile(fileId: string): Promise<UploxFile | null>;
    connect(): Promise<void>;
}
