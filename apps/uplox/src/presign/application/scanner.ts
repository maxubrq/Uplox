import { UploxLogger } from "@shared/logger";
import { UploxFile } from "@domain/file";

export type ScannerResult = {
    isMalware: boolean;
    isInfected: boolean;
    isError: boolean;
    error: string | null;
    version: string | null;
    name: string;
}

export abstract class UploxScanner {
    constructor(protected readonly logger: UploxLogger) {}

    abstract scan(file: UploxFile): Promise<ScannerResult>;
}