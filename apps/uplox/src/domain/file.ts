export type FileHashes = {
    md5?: string;
    sha1?: string;
    sha256?: string;
    blake3: string;
};

export class UploxFile {
    constructor(
        public readonly id: string,
        public readonly name: string,
        public readonly size: number,
        public readonly type: string,
        public readonly hashes: FileHashes | null,
    ) {}

    static fromFileWithHashes(id: string, file: File, hashes: FileHashes): UploxFile {
        const size = file.size;
        const type = file.type;
        const name = file.name;
        return new UploxFile(id, name, size, type, hashes);
    }

    static fromFile(id: string, file: File): UploxFile {
        const size = file.size;
        const type = file.type;
        const name = file.name;

        return new UploxFile(id, name, size, type, null);
    }

    toJSON() {
        return {
            id: this.id,
            name: this.name,
            size: this.size,
            type: this.type,
            hashes: this.hashes,
        };
    }
}
