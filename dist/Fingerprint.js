"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DataReceiveError = exports.ConfirmationCodeError = void 0;
const Helper_1 = require("./Helper");
const Sensor_1 = __importStar(require("./Sensor"));
const jimp_1 = __importDefault(require("jimp"));
class Fingerprint {
    constructor(sensorOptions) {
        this.capacity = 0;
        this.indexes = [];
        // Events Callbacks
        this.onReady = [];
        this.onceReady = [];
        this._sensor = new Sensor_1.default(sensorOptions);
        this._sensor.on('ready', () => __awaiter(this, void 0, void 0, function* () {
            const code = yield this._sensor.verifyPass();
            if (code === Sensor_1.CC.OK) {
                yield this.updateParameters();
                this.emitOnReady();
            }
            else {
                throw new ConfirmationCodeError(code, `Cannot verify sensor's password`);
            }
        }));
    }
    get sensor() {
        return this._sensor;
    }
    on(event, callback) {
        switch (event) {
            case 'ready':
                this.onReady.push(callback);
                break;
        }
    }
    once(event, callback) {
        switch (event) {
            case 'ready':
                this.onceReady.push(callback);
                break;
        }
    }
    enroll({ pageId, attempts = 15, delay = 400, firstImageAcquired = () => true } = {}) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.readFingerprint(attempts, 1);
            if (firstImageAcquired()) {
                yield Helper_1.helper.timeout(delay);
                yield this.readFingerprint(attempts, 2);
                if (pageId === undefined) {
                    pageId = this.getEmptyIndex();
                }
                let code = yield this._sensor.regModel();
                if (code === Sensor_1.CC.OK) {
                    code = yield this._sensor.store(1, pageId);
                    if (code === Sensor_1.CC.OK) {
                        yield this.updateParameters();
                        return pageId;
                    }
                    else {
                        throw new ConfirmationCodeError(code, 'Cannot save the template.');
                    }
                }
                else {
                    throw new ConfirmationCodeError(code, 'Failed to combine char buffers');
                }
            }
        });
    }
    search({ attempts = 15 } = {}) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.readFingerprint(attempts, 1);
            const { code, pageId, matchingScore } = yield this._sensor.search(1, 0, this.capacity);
            if (code === Sensor_1.CC.OK) {
                return {
                    pageId,
                    matchingScore,
                };
            }
            else {
                throw new ConfirmationCodeError(code, 'Search unsuccessful');
            }
        });
    }
    scanFingerprint(attempts) {
        return __awaiter(this, void 0, void 0, function* () {
            let code = -1;
            for (let i = 1; i <= attempts; i++) {
                let code = yield this._sensor.genImg();
                if (code === Sensor_1.CC.OK) {
                    return;
                }
                else if (i === attempts) {
                    switch (code) {
                        case Sensor_1.CC.PACKETRECEIVER_ERROR:
                            throw new ConfirmationCodeError(code, 'Error when receiving packet');
                        case Sensor_1.CC.NO_FINGER:
                            throw new ConfirmationCodeError(code, 'No finger was detected');
                        case Sensor_1.CC.ENROLL_FAIL:
                            throw new ConfirmationCodeError(code, 'Failed to enroll fingerprint');
                        default:
                            throw new ConfirmationCodeError(code, 'Scaning finger failed');
                    }
                }
            }
        });
    }
    generateBufferChar(slot = 1) {
        return __awaiter(this, void 0, void 0, function* () {
            const code = yield this._sensor.img2Tz(slot);
            if (code === Sensor_1.CC.OK)
                return;
            switch (code) {
                case Sensor_1.CC.PACKETRECEIVER_ERROR:
                    throw new ConfirmationCodeError(code, 'Error when receiving packet');
                case Sensor_1.CC.IMAGE_DISORDERED:
                    throw new ConfirmationCodeError(code, 'Failed to generate buffer char due to over-disorderly fingerprint image');
                case Sensor_1.CC.IMAGE_NOCHAR:
                    throw new ConfirmationCodeError(code, 'Failed to generate buffer char due to lack of character points in fingerprint image');
                case Sensor_1.CC.INVALID_IMAGE:
                    throw new ConfirmationCodeError(code, 'Failed to generate buffer char due to lack of valid primary image');
                default:
                    throw new ConfirmationCodeError(code, 'Generating buffer char failed.');
            }
        });
    }
    readFingerprint(attempts, slot = 1) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.scanFingerprint(attempts);
            yield this.generateBufferChar(slot);
        });
    }
    deleteTemplate(pageId) {
        return __awaiter(this, void 0, void 0, function* () {
            const code = yield this._sensor.delete(pageId, 1);
            yield this.updateParameters();
            if (code !== Sensor_1.CC.OK) {
                throw new ConfirmationCodeError(code, 'Could not delete template');
            }
        });
    }
    emptyDatabase() {
        return __awaiter(this, void 0, void 0, function* () {
            const code = yield this._sensor.emptyDatabase();
            yield this.updateParameters();
            if (code !== Sensor_1.CC.OK) {
                throw new ConfirmationCodeError(code, 'Could not empty database');
            }
        });
    }
    getTemplateIndexes() {
        return __awaiter(this, void 0, void 0, function* () {
            const res = [];
            for (let i = 0; i < 4; i++) {
                const { code, indexes } = (yield this._sensor.templateIndexes(i));
                if (code !== Sensor_1.CC.OK)
                    throw new ConfirmationCodeError(code, 'Reading templates failed');
                res.push(...indexes);
            }
            this.indexes = res;
            return res;
        });
    }
    getTemplateCount() {
        return __awaiter(this, void 0, void 0, function* () {
            const { code, count } = yield this._sensor.templateCount();
            if (code === Sensor_1.CC.OK)
                return count;
            throw new ConfirmationCodeError(code, 'Could not read template counts due to corrupt packet');
        });
    }
    getSystemParameters() {
        return __awaiter(this, void 0, void 0, function* () {
            const para = yield this._sensor.readSysPara();
            if (para.code === Sensor_1.CC.OK) {
                this.capacity = para.capacity;
                return para;
            }
            else {
                throw new ConfirmationCodeError(para.code, `Cannot read the parameters of the sensor.`);
            }
        });
    }
    previewImage(onReceiveProgress = () => { }, attempts = 15) {
        return new Promise((resolve, reject) => __awaiter(this, void 0, void 0, function* () {
            const code = yield this._sensor.upImage({
                onReceiveFinish(data, error) {
                    if (error)
                        reject(new DataReceiveError('Receiving image data failed'));
                    new jimp_1.default(256, 288, (err, image) => {
                        if (err)
                            reject(err);
                        for (let i = 0; i < data.length; i++) {
                            const d = data[i];
                            const px1 = (d & 0xF) * 17;
                            const px2 = ((d >> 4) & 0xF) * 17;
                            const h1 = jimp_1.default.rgbaToInt(px1, px1, px1, 255);
                            const h2 = jimp_1.default.rgbaToInt(px2, px2, px2, 255);
                            image.setPixelColor(h2, (i % 128) * 2, (i / 128));
                            image.setPixelColor(h1, (i % 128) * 2 + 1, (i / 128));
                        }
                        resolve(image);
                    });
                },
                onReceiveProgress,
            });
            if (code !== Sensor_1.CC.OK)
                reject(new ConfirmationCodeError(code, 'Could not get the fingerprint image'));
        }));
    }
    hasIndex(index) {
        return this.indexes.includes(index);
    }
    updateParameters() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.getSystemParameters();
            // await this.getTemplateIndexes()
        });
    }
    getEmptyIndex() {
        for (let i = 0; i < this.capacity; i++) {
            if (!this.indexes.includes(i)) {
                return i;
            }
        }
        throw Error('Cannot find an empty template');
    }
    emitOnReady() {
        this.onReady.forEach((callback) => {
            callback();
        });
        for (let callback of this.onceReady) {
            callback();
        }
        this.onceReady = [];
    }
}
exports.default = Fingerprint;
class ConfirmationCodeError extends Error {
    constructor(code, message) {
        super(message);
        this.code = code;
        Object.setPrototypeOf(this, new.target.prototype);
    }
}
exports.ConfirmationCodeError = ConfirmationCodeError;
class DataReceiveError extends Error {
    constructor(message) {
        super(message);
        Object.setPrototypeOf(this, new.target.prototype);
    }
}
exports.DataReceiveError = DataReceiveError;
//# sourceMappingURL=Fingerprint.js.map