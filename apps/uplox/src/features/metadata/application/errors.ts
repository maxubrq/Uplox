export class MetadataErrorFileNotFound extends Error {
    code: string = 'METADATA_ERROR_FILE_NOT_FOUND';

    constructor(message: string) {
        super(message);
        this.name = 'MetadataErrorFileNotFound';
    }
}
