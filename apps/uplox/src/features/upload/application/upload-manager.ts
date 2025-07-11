import { UploxAppLogger, UploxAVScanner, UploxAVScanResult, UploxFileTypeScanner, UploxFileTypeScanResult, UploxStorage } from '@application';
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
    ) {
    }

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
                this.logWrap<UploxFileTypeScanResult>('fileTypeScanner', () => this._fileTypeScanner.scanStream(fileTypePassThrough)),
                this.logWrap<UploxAVScanResult>('avScanner', () => this._avScanner.scanStream(clamscanPassThrough)),
            ]);

            if (fileHash !== sha256) {
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

            await this._storage.saveFile(file, uploxF, fileHash);

            return {
                fileId: uploxF.id,
                file: uploxF.toJSON(),
                avScan: clamscanResult
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
