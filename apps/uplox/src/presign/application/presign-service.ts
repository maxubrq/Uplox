import { UploxAppConfig } from '@application/app-config';
import { FileHashes, UploxFile } from '@domain/file';
import { fetchFile } from '@shared/fetch';
import { hash } from '@shared/hash';
import { UploxLogger } from '@shared/logger';
import { isUrl } from '@shared/utils';
import { z } from 'zod';

export type PresignResult = {
    presign: string;
    error: Error | null;
    requestId: string;
    fileId: string;
    file: UploxFile | null;
};

export const PresignConfigSchema = z
    .object({
        timeoutMs: z.number().optional().default(10000),
        algorithm: z.enum(['blake3', 'sha256', 'all']).optional().default('all'),
    })
    .strict();

export type PresignConfig = z.infer<typeof PresignConfigSchema>;

/**
 * The service for the presign feature
 * @param logger - The logger
 */
export class PresignService {
    constructor(
        private readonly logger: UploxLogger,
        private readonly config: UploxAppConfig,
    ) {
        this.config = config;
    }

    public async createPresignForString(
        fileId: string,
        file: string,
        config: PresignConfig,
    ): Promise<{ presign: string; error: Error | null; file: UploxFile | null }> {
        this.logger.info(`[Presign] Try to download file`, { from: file, timeoutMs: config.timeoutMs });
        const fileToUpload = await fetchFile(file, config.timeoutMs);
        this.logger.info(`[Presign] File downloaded`, { file: fileToUpload.name });

        const result = await this.uploadAndPresign(fileId, fileToUpload, config);
        return { presign: result.presign, error: result.error, file: result.file };
    }

    protected async uploadAndPresign(
        fileId: string,
        file: File,
        config: PresignConfig,
    ): Promise<{ presign: string; error: Error | null; file: UploxFile }> {
        const hashAlgorithm = config.algorithm;
        let uploxFile: UploxFile;
        if (hashAlgorithm === 'all') {
            const hashes = await Promise.all([hash(file, 'blake3'), hash(file, 'sha256')]);
            uploxFile = UploxFile.fromFileWithHashes(fileId, file, {
                blake3: hashes[0],
                sha256: hashes[1],
            });
        } else {
            const hashResult = await hash(file, hashAlgorithm);
            uploxFile = UploxFile.fromFileWithHashes(fileId, file, {
                [hashAlgorithm as keyof FileHashes as string]: hashResult,
            } as unknown as FileHashes);
        }

        this.logger.debug(`[Presign] Hashes`, { uploxFile });
        return { presign: 'presign', error: null, file: uploxFile };
    }

    public async createPresign(
        requestId: string,
        fileId: string,
        file: File | string,
        config: PresignConfig,
    ): Promise<PresignResult> {
        const isString = typeof file === 'string';
        if (isString && !isUrl(file)) {
            return { presign: 'presign', error: new Error('Invalid file url'), requestId, fileId, file: null };
        }

        const createPresign = async (file: File | string) => {
            if (isString) {
                return this.createPresignForString(fileId, file as string, config);
            }
            return this.uploadAndPresign(fileId, file as File, config);
        };

        try {
            const result = await createPresign(file);
            return {
                presign: result.presign,
                error: result.error,
                requestId,
                fileId,
                file: result.file,
            };
        } catch (e) {
            this.logger.error('[Presign] Failed to create presign', { requestId, fileId, error: e });
            return {
                presign: 'presign',
                error: new Error('Failed to create presign', { cause: e }),
                requestId,
                fileId,
                file: null,
            };
        }
    }
}
