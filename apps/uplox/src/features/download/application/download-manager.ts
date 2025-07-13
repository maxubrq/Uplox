import { UploxAppLogger, UploxStorage } from '@application';
import { UploxFile } from '@domain';
import { DownloadFileErrorFileNotFound } from './errors';

export class DownloadManager {
    constructor(
        private _logger: UploxAppLogger,
        private _storage: UploxStorage<UploxFile>,
    ) {}

    async getDownloadableUrl(fileId: string): Promise<string> {
        try {
            const isFileExist = await this._storage.fileExist(fileId);
            if (!isFileExist) {
                throw new DownloadFileErrorFileNotFound(`File ${fileId} not found`);
            }

            this._logger.info(`[${this.constructor.name}] Preparing download for file ${fileId}`);
            const url = await this._storage.getDownloadableUrl(fileId);
            this._logger.debug(`[${this.constructor.name}] Download URL: ${url}`);
            return url;
        } catch (e) {
            this._logger.error(`[${this.constructor.name}] Error preparing download for file ${fileId}`, {
                error: e,
            });
            throw e;
        }
    }
}
