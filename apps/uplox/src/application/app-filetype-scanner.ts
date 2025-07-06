import { Readable } from 'stream';

export type UploxFileTypeScanResult = {
    mimeType: string;
    extension: string;
    version?: string;
};

export interface UploxFileTypeScanner {
    scanFile(file: File): Promise<UploxFileTypeScanResult>;
    scanStream(stream: Readable): Promise<UploxFileTypeScanResult>;
    init(): Promise<void>;
    version(): Promise<string>;
}
