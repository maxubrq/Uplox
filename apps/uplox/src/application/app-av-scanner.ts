import { Readable } from 'stream';

export type UploxAVScanResult = {
    isInfected: boolean;
    viruses: string[];
    file: string | null;
    resultString: string;
    timeout: boolean;
    version: string;
};

export interface UploxAVScanner {
    scanFile(file: File): Promise<UploxAVScanResult>;
    scanStream(stream: Readable): Promise<UploxAVScanResult>;
    init(): Promise<void>;
    version(): Promise<string>;
}
