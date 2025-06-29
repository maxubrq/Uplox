import { UploxAppConfig } from '@application/app-config';
import { UploxFile } from '@domain/file';

export abstract class UploxStorage {
    constructor(protected readonly config: UploxAppConfig) {
        this.config = config;
    }

    abstract uploadFile(file: UploxFile): Promise<UploxFile>;
    abstract getFile(fileId: string): Promise<UploxFile>;
    abstract deleteFile(fileId: string): Promise<void>;
    abstract getDownloadUrl(fileId: string, expiresInSeconds: number): Promise<string>;
}
