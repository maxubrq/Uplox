import { UploxAVScanResult } from '@application';

export class UploadFileErrorHashMismatch extends Error {
    code: string = 'UPLOAD_FILE_ERROR_HASH_MISMATCH';
    constructor(message: string) {
        super(message);
        this.name = 'UploadFileErrorHashMismatch';
    }
}

export class UploadFileErrorInfectedFile extends Error {
    code: string = 'UPLOAD_FILE_ERROR_INFECTED_FILE';
    result: UploxAVScanResult;
    constructor(message: string, result: UploxAVScanResult) {
        super(message);
        this.name = 'UploadFileErrorInfectedFile';
        this.result = result;
    }
}
