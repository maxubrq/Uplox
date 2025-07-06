import { UploxFile } from "@domain";

export interface AppStorage {
    init(): Promise<void>;
    uploadFile(file: UploxFile): Promise<void>;
    getDownloadableUrl(fileId: string): Promise<string>;
    getFileMetadata(fileId: string): Promise<UploxFile>;
}
