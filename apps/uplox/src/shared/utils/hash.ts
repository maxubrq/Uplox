import { createHash } from 'crypto';
import fs from 'fs';
import { Readable } from 'stream';

export function hash(algorithm: 'sha256', data: string | Buffer): string {
    return createHash(algorithm).update(data).digest('hex');
}

export function hashFile(algorithm: 'sha256', filePath: string): string {
    return createHash(algorithm).update(fs.readFileSync(filePath)).digest('hex');
}

export function hashStream(algorithm: 'sha256', stream: Readable): Promise<string> {
    return new Promise((resolve, reject) => {
        const hash = createHash(algorithm);
        stream.on('data', chunk => {
            hash.update(chunk);
        });
        stream.on('end', () => {
            resolve(hash.digest('hex'));
        });
        stream.on('error', error => {
            reject(error);
        });
    });
}
