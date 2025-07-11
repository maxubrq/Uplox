export class UploxFile {
    constructor(
        public id: string,
        public name: string,
        public size: number,
        public mimeType?: string,
        public extension?: string,
        public createdAt?: Date,
        public updatedAt?: Date,
        public hashes?: { md5?: string; sha1?: string; sha256?: string },
    ) {}

    public static fromJSON(json: any) {
        const _id = json.id;
        const _name = json.name;
        const _size = json.size;
        if (!_id || !_name || !_size) {
            throw new Error('Invalid file JSON');
        }

        return new UploxFile(
            json.id,
            json.name,
            json.size,
            json.mimeType,
            json.extension,
            json.createdAt,
            json.updatedAt,
            json.hashes,
        );
    }

    public toJSON() {
        return {
            id: this.id,
            name: this.name,
            size: this.size,
            mimeType: this.mimeType,
            extension: this.extension,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt,
            hashes: this.hashes,
        };
    }

    public static fromFile(file: File, id: string) {
        return new UploxFile(id, file.name, file.size);
    }
}
