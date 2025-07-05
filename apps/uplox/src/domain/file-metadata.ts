export class UploxFileMetadata {
    private _name: string;
    private _size: number;
    private _type: string | null;
    private _createdAt: Date;
    private _updatedAt: Date;
    private _hashes: {
        md5?: string;
        sha1?: string;
        sha256?: string;
    } | null;

    constructor(
        name: string,
        size: number,
        type: string | null,
        createdAt: Date,
        updatedAt: Date,
        hashes: {
            md5?: string;
            sha1?: string;
            sha256?: string;
        } | null,
    ) {
        this._name = name;
        this._size = size;
        this._type = type;
        this._createdAt = createdAt;
        this._updatedAt = updatedAt;
        this._hashes = hashes;
    }

    get name() {
        return this._name;
    }

    get size() {
        return this._size;
    }

    get type() {
        return this._type;
    }

    get createdAt() {
        return this._createdAt;
    }

    get updatedAt() {
        return this._updatedAt;
    }

    get hashes() {
        return this._hashes;
    }

    toJSON() {
        return {
            name: this._name,
            size: this._size,
            type: this._type,
            createdAt: this._createdAt.toISOString(),
            updatedAt: this._updatedAt.toISOString(),
            hashes: this._hashes,
        };
    }

    static fromJSON(json: any) {
        const name = json.name;
        const size = json.size;
        const type = json.type;
        const createdAt = new Date(json.createdAt);
        const updatedAt = new Date(json.updatedAt);
        const hashes = json.hashes;
        if (!name || !size || !createdAt || !updatedAt) {
            throw new Error(`[UploxFileMetadata] Invalid file metadata: ${JSON.stringify(json)}`);
        }

        return new UploxFileMetadata(name, size, type, createdAt, updatedAt, hashes);
    }
}
