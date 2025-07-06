import { UploxFileTypeScanResult, UploxFileTypeScanner } from '@application';
import { UploxAppLogger } from '@application/app-logger';
import { fileTypeFromStream } from 'file-type';
import { Readable } from 'stream';

export class FileTypeScanner implements UploxFileTypeScanner {
    private static _instance: FileTypeScanner | null = null;
    private constructor(private _logger: UploxAppLogger) {}

    public static getInstance(logger: UploxAppLogger): FileTypeScanner {
        if (!FileTypeScanner._instance) {
            FileTypeScanner._instance = new FileTypeScanner(logger);
        }
        return FileTypeScanner._instance;
    }
    async scanFile(file: File): Promise<UploxFileTypeScanResult> {
        const result = await fileTypeFromStream(file.stream());
        if (!result) {
            throw new Error(`[${this.constructor.name}] Failed to detect file type`);
        }
        return {
            mimeType: result.mime,
            extension: result.ext || '',
            version: await this.version(),
        };
    }

    async scanStream(stream: Readable): Promise<UploxFileTypeScanResult> {
        const result = await fileTypeFromStream(Readable.toWeb(stream));
        if (!result) {
            throw new Error(`[${this.constructor.name}] Failed to detect file type`);
        }
        return {
            mimeType: result.mime,
            extension: result.ext || '',
            version: await this.version(),
        };
    }

    async init(): Promise<void> {
        this._logger.info(`[${this.constructor.name}] Initializing file type scanner`);
    }

    async version(): Promise<string> {
        return '1.0.0';
    }
}
