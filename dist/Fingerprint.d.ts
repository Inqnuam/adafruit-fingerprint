import Sensor from './Sensor';
import Jimp from 'jimp';
export default class Fingerprint {
    private _sensor;
    private capacity;
    private indexes;
    private onReady;
    private onceReady;
    constructor(sensorOptions: SensorOptions);
    get sensor(): Sensor;
    on(event: FingerprintEvent, callback: CallbackFunction): void;
    once(event: FingerprintEvent, callback: CallbackFunction): void;
    enroll({ pageId, attempts, delay, firstImageAcquired }?: FingerprintEnrollOptions): Promise<number | undefined>;
    search({ attempts }?: FingerprintOptions): Promise<{
        pageId: number;
        matchingScore: number;
    }>;
    scanFingerprint(attempts: number): Promise<void>;
    generateBufferChar(slot?: 1 | 2): Promise<void>;
    readFingerprint(attempts: number, slot?: 1 | 2): Promise<void>;
    deleteTemplate(pageId: number): Promise<void>;
    emptyDatabase(): Promise<void>;
    getTemplateIndexes(): Promise<number[]>;
    getTemplateCount(): Promise<number>;
    getSystemParameters(): Promise<SystemParameters>;
    previewImage(onReceiveProgress?: (progress: Progress) => void, attempts?: number): Promise<Jimp>;
    hasIndex(index: number): boolean;
    private updateParameters;
    private getEmptyIndex;
    private emitOnReady;
}
export declare class ConfirmationCodeError extends Error {
    code: number;
    constructor(code: number, message?: string);
}
export declare class DataReceiveError extends Error {
    constructor(message?: string);
}
//# sourceMappingURL=Fingerprint.d.ts.map