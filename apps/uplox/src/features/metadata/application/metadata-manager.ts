import { UploxAppLogger, UploxCache, UploxStorage } from '@application';
import { UploxFile } from '@domain';
import { MetadataErrorFileNotFound } from './errors';

export class MetadataManager {
    constructor(
        private _logger: UploxAppLogger,
        private _storage: UploxStorage<UploxFile>,
        private _cache: UploxCache,
    ) {}

    async saveBackMetadata(file: UploxFile): Promise<void> {
        try{
            await this._cache.setFile(file);
        }catch(err){
            this._logger.error(`[${this.constructor.name}] Error saving metadata for file ${file.id}`, {
                error: err,
            });
        }
    }

    async getMetadataFromCache(id: string): Promise<UploxFile | null> {
        try{
            return await this._cache.getFile(id);
        }catch(err){
            this._logger.error(`[${this.constructor.name}] Error getting metadata for file ${id}`, {
                error: err,
            });
            return null;
        }
    }

    async getMetadata(id: string): Promise<UploxFile> {
        try {
            const isFileExist = await this._storage.fileExist(id);
            if (!isFileExist) {
                throw new MetadataErrorFileNotFound(`${id} not found`);
            }

            const cachedResult = await this.getMetadataFromCache(id);
            if (cachedResult) {
                return cachedResult;
            }

            const metadata = await this._storage.getFileMetadata(id);
            await this.saveBackMetadata(metadata);

            return metadata;
        } catch (err) {
            this._logger.error(`[${this.constructor.name}] Error getting metadata for file ${id}`, {
                error: err,
            });
            throw err;
        }
    }
}
