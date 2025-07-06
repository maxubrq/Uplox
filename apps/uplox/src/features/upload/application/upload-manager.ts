import { AppStorage, UploxAppLogger, UploxAVScanner, UploxAVScanResult, UploxFileTypeScanner } from '@application';
import { UploxFile } from '@domain';
import { UpbloxReadStream } from '@infrastructure';
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
        private _storage: AppStorage,
    ) {}

    async uploadFile(file: File, sha256: string): Promise<UploadFileResult> {
        try {
            this._logger.info(`[${this.constructor.name}] Uploading file`, {
                file: file.name,
            });
            await Promise.all([this._fileTypeScanner.init(), this._avScanner.init()]);
            const fileStream = file.stream();
            const upbloxReadStream = UpbloxReadStream.fromWeb(fileStream);
            const hashPassThrough = upbloxReadStream.passThrough();
            const fileTypePassThrough = upbloxReadStream.passThrough();
            const clamscanPassThrough = upbloxReadStream.passThrough();
            const fileHash = await hashStream('sha256', hashPassThrough);

            if (fileHash !== sha256) {
                throw new UploadFileErrorHashMismatch('File hash mismatch');
            }

            const [fileType, clamscanResult] = await Promise.all([
                this._fileTypeScanner.scanStream(fileTypePassThrough),
                this._avScanner.scanStream(clamscanPassThrough),
            ]);

            if (clamscanResult.isInfected) {
                throw new UploadFileErrorInfectedFile('File is infected', clamscanResult);
            }

            const uploxf = UploxFile.fromFile(file, fileHash);
            uploxf.setHashes({
                sha256: fileHash,
            });
            uploxf.setMimeType(fileType.mimeType);
            uploxf.setExtension(fileType.extension);

            await this._storage.uploadFile(uploxf);

            return {
                fileId: uploxf.id,
                file: uploxf.toJSON(),
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
