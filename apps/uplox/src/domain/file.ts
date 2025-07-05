import { UploxFileMetadata } from '@domain/file-metadata';

export class UploxFile {
    private _metadata: UploxFileMetadata | null = null;
    constructor(private readonly id: string) {}

    withMetadata(metadata: UploxFileMetadata) {
        this._metadata = metadata;
        return this;
    }

    toJSON() {
        return {
            id: this.id,
            metadata: this._metadata?.toJSON(),
        };
    }

    static fromJSON(json: any) {
        const file = new UploxFile(json.id);
        if (json.metadata) {
            file.withMetadata(UploxFileMetadata.fromJSON(json.metadata));
        }
        return file;
    }
}
