import { UploxFile } from "@domain/file";
import { ScannerResult, UploxScanner } from "@presign/application/scanner";
import { UploxLogger } from "@shared/logger";
import fs from 'fs';        
import os from 'os';
import path from 'path';
import { exec } from 'child_process';

export class ClamavClient {
    constructor(private readonly logger: UploxLogger) {}

    private parseClamavSummary(result: string): ScannerResult {
        const lines = result.split('\n');
        const isMalware = lines.some(line => line.includes('FOUND'));
        
        // Parse the infected files count from "Infected files: X" line
        const infectedFilesLine = lines.find(line => line.includes('Infected files:'));
        let isInfected = false;
        if (infectedFilesLine) {
            const match = infectedFilesLine.match(/Infected files:\s*(\d+)/);
            if (match) {
                const infectedCount = parseInt(match[1], 10);
                isInfected = infectedCount > 0;
            }
        }
        
        const isError = lines.some(line => line.includes('ERROR') || line.includes('No such file or directory'));
        const version = lines.find(line => line.includes('clamscan'))?.split(' ')[1] ?? null;
        return { isMalware, isInfected, isError, error: null, version, name: 'clamav' };
    }

    private async getClamavVersion(): Promise<string> {
        const command = `clamscan --version`;
        const result = await this.exec(command);
        return result.split(' ')[1];
    }

    private async exec(command: string): Promise<string> {
        return new Promise((resolve, reject) => {
            exec(command, (error, stdout, stderr) => {
                if (error) reject(error);
                resolve(stdout);
            });
        });
    }

    public async scanFile(filePath: string): Promise<ScannerResult> {
        try{
            this.logger.info(`[ClamavClient] Scanning file`, { filePath });

            const version = await this.getClamavVersion();
            this.logger.info(`[ClamavClient] Clamav version`, { version });

            const command = `clamscan ${filePath}`;
            const rawResult = await this.exec(command);
            this.logger.debug(`[ClamavClient] Scan raw result`, { rawResult });

            const result = this.parseClamavSummary(rawResult);
            this.logger.info(`[ClamavClient] Scan result`, { result });

            return {
                ...result,
                version,
            };
        }catch(error){
            this.logger.error(`[ClamavClient] Failed to scan file`, { error });
            throw error;
        }
    }
}

export class ClamavScanner extends UploxScanner {
    private readonly clamavClient: ClamavClient;

    constructor(logger: UploxLogger) {
        super(logger);
        this.clamavClient = new ClamavClient(logger);
    }

    private async createTempFile(file: UploxFile): Promise<string> {
        const tempFile = fs.mkdtempSync(path.join(os.tmpdir(), 'uplox-clamav-'));
        const buffer = await file.file.arrayBuffer();
        const tempFilePath = path.join(tempFile, file.id);
        fs.writeFileSync(tempFilePath, Buffer.from(new Uint8Array(buffer)));
        return tempFilePath;
    }

    public async scan(file: UploxFile): Promise<ScannerResult> {
        try {
            const tempFilePath = await this.createTempFile(file);
            const result = await this.clamavClient.scanFile(tempFilePath);
            fs.unlinkSync(tempFilePath);
            return result;
        } catch (error) {
            this.logger.error(`[ClamavScanner] Failed to scan file`, { error });
            return {
                isMalware: false,
                isInfected: false,
                isError: true,
                error: error instanceof Error ? error.message : 'Unknown error',
                version: null,
                name: 'clamav',
            };
        }
    }
}