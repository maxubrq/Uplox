import { MIN_MS } from '@/shared';
import { UploxAVScanner, UploxAVScanResult, UploxAppLogger } from '@application';
import NodeClam from 'clamscan';
import { Readable } from 'stream';

export class ClamAVScanner implements UploxAVScanner {
    private _clamav: NodeClam | null = null;
    private _initialized: boolean = false;
    private static _version: string | undefined = undefined;
    private static _instance: ClamAVScanner | null = null;

    private constructor(private _logger: UploxAppLogger) {}

    public static getInstance(logger: UploxAppLogger): ClamAVScanner {
        if (!ClamAVScanner._instance) {
            ClamAVScanner._instance = new ClamAVScanner(logger);
        }
        return ClamAVScanner._instance;
    }

    async scanFile(file: File): Promise<UploxAVScanResult> {
        if (!this._clamav || !this._initialized) {
            throw new Error('ClamAV not initialized');
        }
        const result = await this._clamav.scanStream(Readable.fromWeb(file.stream()));
        return {
            isInfected: result.isInfected,
            viruses: result.viruses,
            file: result.file,
            resultString: (result as any)?.resultString || '',
            timeout: (result as any)?.timeout || false,
            version: await this.version(),
        };
    }
    async scanStream(stream: Readable): Promise<UploxAVScanResult> {
        if (!this._clamav || !this._initialized) {
            throw new Error('ClamAV not initialized');
        }
        const result = await this._clamav.scanStream(stream);
        return {
            isInfected: result.isInfected,
            viruses: result.viruses,
            file: result.file,
            resultString: (result as any)?.resultString || '',
            timeout: (result as any)?.timeout || false,
            version: await this.version(),
        };
    }

    async init(): Promise<void> {
        if (this._clamav && this._initialized) {
            this._logger.info('[ClamAVScanner] ClamAV already initialized');
            return;
        }
        this._logger.info('[ClamAVScanner] Initializing ClamAV', {
            host: 'scanner',
            port: 3310,
            timeout: MIN_MS * 5,
            tls: false,
            localFallback: false,
        });

        this._clamav = await new NodeClam().init({
            clamdscan: {
                host: 'scanner',
                port: 3310,
                timeout: MIN_MS * 5,
                tls: false,
                localFallback: false,
            },
        });
        this._initialized = true;
        this._logger.info('[ClamAVScanner] ClamAV initialized');
    }

    async version(): Promise<string> {
        if (!this._clamav || !this._initialized) {
            throw new Error('ClamAV not initialized');
        }

        if (ClamAVScanner._version) {
            return ClamAVScanner._version;
        }

        const version = await this._clamav.getVersion();
        ClamAVScanner._version = version;
        return ClamAVScanner._version;
    }
}
