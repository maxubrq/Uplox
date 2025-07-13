export class DownloadFileErrorFileNotFound extends Error {
    code: string = 'DOWNLOAD_FILE_ERROR_FILE_NOT_FOUND';

    constructor(message: string) {
        super(message);
        this.name = 'DownloadFileErrorFileNotFound';

    }
}