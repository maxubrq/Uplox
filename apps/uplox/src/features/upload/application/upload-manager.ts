import {
    AppMetrics,
    UploxAppLogger,
    UploxAVScanner,
    UploxAVScanResult,
    UploxFileTypeScanner,
    UploxFileTypeScanResult,
    UploxStorage,
} from '@application';
import { UploxFile } from '@domain';
import { UpbloxReadStream } from '@infrastructure/stream';
import { hashStream } from '@shared';
import { UploadFileErrorHashMismatch, UploadFileErrorInfectedFile } from './errors';

export type UploadFileResult = {
    fileId: string;
    file: ReturnType<typeof UploxFile.prototype.toJSON>;
    avScan: UploxAVScanResult;
};

export class UploadManager {
    constructor(
        private _logger: UploxAppLogger,
        private _fileTypeScanner: UploxFileTypeScanner,
        private _avScanner: UploxAVScanner,
        private _storage: UploxStorage<UploxFile>,
        private _metrics: AppMetrics,
    ) {}

    private _scannersInitialized = false;

    async init(): Promise<void> {
        try {
            if (!this._scannersInitialized) {
                await Promise.all([this._fileTypeScanner.init(), this._avScanner.init()]);
            }
        } catch (err) {
            this._logger.error(`[${this.constructor.name}] Error when initialize scanners`, {
                error: err,
            });
        }
    }

    private async logWrap<T>(stepName: string, exec: () => Promise<T>): Promise<T> {
        this._logger.debug(`[${this.constructor.name}] Start ${stepName}`);
        const result = await exec();
        this._logger.debug(`[${this.constructor.name}] End ${stepName}`);
        return result;
    }

    private async metricsWrap<T>(
        stepName: 'avScan' | 'storagePut',
        exec: () => Promise<T>,
        ...extra: any[]
    ): Promise<T> {
        const startTime = Date.now();
        const duration = Date.now() - startTime;
        if (stepName === 'avScan') {
            const avName = extra.length > 0 ? extra[0] : 'unknown';
            try {
                const result = await exec();
                const isInfected = (result as any)?.isInfected;
                this._metrics.avScanDurationMillis(avName, duration, isInfected ? 'infected' : 'clean');
                if (isInfected) {
                    const virusType = (result as any)?.viruses as string[];
                    this._metrics.avDetectionTotal(avName, virusType.join(','));
                }
                return result;
            } catch (err) {
                this._metrics.avScanFailureTotal(avName, (err as Error).message || 'unknown');
                throw err;
            }
        } else if (stepName === 'storagePut') {
            try {
                const result = await exec();
                const bucket = extra.length > 0 ? extra[0] : 'unknown';
                this._metrics.storagePutLatencyMillis(duration, bucket, 'success');
                return result;
            } catch (err) {
                this._metrics.uploadErrorsTotal('StoragePut', 'PUT');
                throw err;
            }
        }

        const result = await exec();
        return result;
    }

    async uploadFile(file: File, sha256: string): Promise<UploadFileResult> {
        try {
            this._logger.info(`[${this.constructor.name}] Uploading file`, {
                file: file.name,
            });

            await this.init();

            const fileStream = file.stream();
            const upbloxReadStream = UpbloxReadStream.fromWeb(fileStream);
            const hashPassThrough = upbloxReadStream.passThrough();
            const fileTypePassThrough = upbloxReadStream.passThrough();
            const clamscanPassThrough = upbloxReadStream.passThrough();

            const [fileHash, fileType, clamscanResult] = await Promise.all([
                this.logWrap<string>('hashFile', () => hashStream('sha256', hashPassThrough)),
                this.logWrap<UploxFileTypeScanResult>('fileTypeScanner', () =>
                    this._fileTypeScanner.scanStream(fileTypePassThrough),
                ),
                this.logWrap<UploxAVScanResult>('avScan', () =>
                    this.metricsWrap<UploxAVScanResult>(
                        'avScan',
                        () => this._avScanner.scanStream(clamscanPassThrough),
                        'ClamAV',
                    ),
                ),
            ]);

            if (fileHash !== sha256) {
                this._metrics.sha256MismatchTotal('POST');
                throw new UploadFileErrorHashMismatch('File hash mismatch');
            }

            this._logger.debug(`[${this.constructor.name}] Scanning result`, {
                fileType,
                clamscanResult,
            });

            if (clamscanResult.isInfected) {
                throw new UploadFileErrorInfectedFile('File is infected', clamscanResult);
            }

            const uploxF = UploxFile.fromJSON({
                id: fileHash,
                name: file.name,
                size: file.size,
                mimeType: fileType.mimeType,
                extension: fileType.extension,
                hashes: {
                    sha256: fileHash,
                },
            });

            await this.metricsWrap<void>(
                'storagePut',
                () => this._storage.saveFile(file, uploxF, fileHash),
                this._storage.getBucket(),
            );

            await Promise.all([
                this._metrics.uploadTotal(fileType.mimeType),
                this._metrics.uploadsByMime(fileType.mimeType),
            ]);

            return {
                fileId: uploxF.id,
                file: uploxF.toJSON(),
                avScan: clamscanResult,
            };
        } catch (error) {
            if (error instanceof UploadFileErrorHashMismatch) {
                this._logger.info(`[${this.constructor.name}] File hash mismatch`, {
                    error: error,
                });
                throw error;
            }
            if (error instanceof UploadFileErrorInfectedFile) {
                this._logger.info(`[${this.constructor.name}] File is infected`, {
                    error: error,
                });
                throw error;
            }
            this._logger.error(`[${this.constructor.name}] Failed to upload file`, {
                error: error,
            });
            throw error;
        }
    }
}
