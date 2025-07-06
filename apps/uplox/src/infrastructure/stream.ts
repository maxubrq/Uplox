import { PassThrough, Readable } from 'stream';
import fs from 'fs';

export class UpbloxReadStream {
    private _stream: Readable;

    private constructor(stream: Readable) {
        this._stream = stream;
    }

    public get stream(): Readable {
        return this._stream;
    }

    public static fromFilePath(filePath: string): UpbloxReadStream {
        return new UpbloxReadStream(fs.createReadStream(filePath));
    }

    public static fromFile(file: File): UpbloxReadStream {
        return new UpbloxReadStream(fs.createReadStream(file.name));
    }

    public static fromBuffer(buffer: Buffer): UpbloxReadStream {
        const stream = new Readable();
        stream.push(buffer);
        stream.push(null);
        return new UpbloxReadStream(stream);
    }

    public static fromString(string: string): UpbloxReadStream {
        const stream = new Readable();
        stream.push(string);
        stream.push(null);
        return new UpbloxReadStream(stream);
    }

    public static fromWeb(webStream: ReadableStream): UpbloxReadStream {
        const stream = Readable.fromWeb(webStream);
        return new UpbloxReadStream(stream);
    }

    public toWeb(): ReadableStream {
        return Readable.toWeb(this._stream);
    }

    public passThrough(): PassThrough {
        const passThrough = new PassThrough();
        this._stream.pipe(passThrough);
        return passThrough;
    }
}
