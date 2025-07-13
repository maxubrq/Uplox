import { UploxAppLogger, UploxCache } from '@application';
import { UploxFile } from '@domain';
import { createClient, RedisClientType } from 'redis';

export type RedisOptions = {
    url: string;
};

export class RedisCache implements UploxCache {
    private static _instance: RedisCache;

    private _redis: RedisClientType;
    private _isConnected: boolean = false;

    private constructor(
        private _options: RedisOptions,
        private _logger: UploxAppLogger,
    ) {
        this._redis = createClient({
            url: this._options.url,
        });
    }

    public async connect() {
        if (!this._isConnected) {
            await this._redis.connect();
            this._isConnected = true;
            this._logger.info(`[${this.constructor.name}] Redis connected`);
        } else {
            this._logger.info(`[${this.constructor.name}] Redis is already connected`);
        }
    }

    public static getInstance(options: RedisOptions, logger: UploxAppLogger) {
        if (!RedisCache._instance) {
            RedisCache._instance = new RedisCache(options, logger);
        }
        return RedisCache._instance;
    }

    async setFile(file: UploxFile, ttl: number = 5 * 60): Promise<void> {
        await this._redis.set(file.id, JSON.stringify(file.toJSON()), {
            EX: ttl,
        });
        this._logger.info(`[${this.constructor.name}] File ${file.id} set in cache`);
    }

    async getFile(fileId: string): Promise<UploxFile | null> {
        const file = await this._redis.get(fileId);
        if (!file) {
            return null;
        }
        return UploxFile.fromJSON(JSON.parse(file));
    }
}
