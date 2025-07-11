export class UploxFile {
    private _metadata: UploxFileMetadata | null = null;
    constructor(private readonly _id: string) {}

    get id() {
        return this._id;
    }

    constructor(id: string, name: string, size: number) {
        this.id = id;
        this.name = name;
        this.size = size;
    }

    public getExtension() {
        return this._extension;
    }

    public getCreatedAt() {
        return this._createdAt;
    }

    public getUpdatedAt() {
        return this._updatedAt;
    }

    public getHashes() {
        return this._hashes;
    }

    public getSize() {
        return this.size;
    }

    public getMimeType() {
        return this._mimeType;
    }

    public setMimeType(mimeType: string) {
        this._mimeType = mimeType;
    }

    public setExtension(extension: string) {
        this._extension = extension;
    }

    public setCreatedAt(createdAt: Date) {
        this._createdAt = createdAt;
    }

    public setUpdatedAt(updatedAt: Date) {
        this._updatedAt = updatedAt;
    }

    public setHashes(hashes: { md5?: string; sha1?: string; sha256?: string }) {
        this._hashes = hashes;
    }

    public toJSON() {
        return {
            id: this._id,
            metadata: this._metadata?.toJSON(),
        };
    }

    public static fromJSON(json: any) {
        const file = new UploxFile(json.id, json.name, json.size);
        file.setMimeType(json.mimeType);
        file.setExtension(json.extension);
        file.setCreatedAt(json.createdAt);
        file.setUpdatedAt(json.updatedAt);
        file.setHashes(json.hashes);
        return file;
    }

    public setFile(file: File) {
        this._file = file;
    }

    public getFile() {
        return this._file;
    }

    static fromFile(file: File, id: string) {
        const uploxf = new UploxFile(id, file.name, file.size);
        uploxf.setFile(file);
        return uploxf;
    }
}
