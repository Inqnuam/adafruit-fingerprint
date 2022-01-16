"use strict";
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
exports.CommunicationError = exports.ERR = exports.IC = exports.CC = exports.PID = void 0;
const serialport_1 = __importDefault(require("serialport"));
const Helper_1 = require("./Helper");
//Package Identifier
var PID;
(function (PID) {
    PID.COMMAND = 0x01;
    PID.DATA_PACKET = 0x02;
    PID.ACKNOWLEDGE = 0x07;
    PID.END_OF_DATA = 0x08;
})(PID = exports.PID || (exports.PID = {}));
// Confirmation Code of Acknowledge Packets
var CC;
(function (CC) {
    CC.OK = 0x00;
    CC.PACKETRECEIVER_ERROR = 0x01;
    CC.NO_FINGER = 0x02;
    CC.ENROLL_FAIL = 0x03;
    CC.IMAGE_DISORDERED = 0x06;
    CC.IMAGE_NOCHAR = 0x07;
    CC.FINGER_NOTMATCH = 0x08;
    CC.FINGER_NOTFOUND = 0x09;
    CC.ENROLL_MISMATCH = 0x0A;
    CC.BADLOCATION = 0x0B;
    CC.TEMPLATEDB_FAIL = 0x0C;
    CC.UPLOAD_FAIL = 0x0D;
    CC.PACKETRESPONSE_FAIL = 0x0E;
    CC.DELETE_FAIL = 0x10;
    CC.CLEARDB_FAIL = 0x11;
    CC.INVALID_IMAGE = 0x15;
    CC.FLASH_ERROR = 0x18;
    CC.DEFINITION_ERROR = 0x19;
    CC.INVALID_REGISTER = 0x1A;
    CC.INVALID_REGCONFIG = 0x1B;
    CC.NOTEPADID_NOTFOUND = 0x1C;
    CC.COMM_FAIL = 0x1D;
    CC.INVALID_ADDRCODE = 0x20;
    CC.PASS_NOTVERIFIED = 0x21;
})(CC = exports.CC || (exports.CC = {}));
// Instruction Codes
var IC;
(function (IC) {
    IC.GENIMG = 0x01;
    IC.IMG2TZ = 0x02;
    IC.MATCH = 0x03;
    IC.SEARCH = 0x04;
    IC.REG_MODEL = 0x05;
    IC.STORE = 0x06;
    IC.LOAD_CHAR = 0x07;
    IC.UP_CHAR = 0x08;
    IC.DOWN_CHAR = 0x09;
    IC.SET_PASS = 0x12;
    IC.VERIFY_PASS = 0x13;
    IC.GET_RANDOM = 0x14;
    IC.SET_ADDR = 0x15;
    IC.HANDSHAKE = 0x17;
    IC.WRITE_NOTEPAD = 0x18;
    IC.READ_NOTEPAD = 0x19;
    IC.UP_IMAGE = 0x0A;
    IC.DOWN_IMAGE = 0x0B;
    IC.DELETE_CHAR = 0x0C;
    IC.EMPTY = 0x0D;
    IC.SET_SYSPAR = 0x0E;
    IC.READ_SYSPAR = 0x0F;
    IC.FASTSEARCH = 0x1B;
    IC.TEMPLATE_COUNT = 0x1D;
    IC.TEMPLATE_TABLE = 0x1F;
    IC.LED_CONTROL = 0x35;
    IC.LED_ON = 0x50;
    IC.LED_OFF = 0x51;
    IC.LED_GRADUAL_ON = 0x05;
    IC.LED_GRADUAL_OFF = 0x06;
    IC.LED_RED = 0x01;
    IC.LED_BLUE = 0x02;
    IC.LED_PURPLE = 0x03;
    IC.LED_BREATHING = 0x01;
    IC.LED_FLASHING = 0x02;
})(IC = exports.IC || (exports.IC = {}));
//Error Codes 
var ERR;
(function (ERR) {
    ERR.TIMEOUT = 1;
    ERR.RECEIVEDPACKET_CORRUPTED = 2;
    ERR.CHECKSUM = 4;
    ERR.PORT_NOTOPEN = 5;
})(ERR = exports.ERR || (exports.ERR = {}));
class Sensor {
    constructor({ serialPort, baudRate = 57600, address = 0xFFFFFFFF, password = 0, timeout = 1000 }) {
        this.rx = [];
        this.receivedData = [];
        this.commands = [];
        this.mode = 'available';
        this.dataPacket = new DataPacket();
        this.header = [0xEF, 0x01];
        this.timeoutTimer = null;
        //callbacks
        this.onReady = [];
        this.onceReady = [];
        this.onPortClose = [];
        this.oncePortClose = [];
        this.onPortError = [];
        this.oncePortError = [];
        if (!Helper_1.helper.check4BytesRange(address))
            throw Error('Address is out of range');
        this.address = Helper_1.helper.get4BytesArray(address);
        if (!Helper_1.helper.check4BytesRange(password))
            throw Error('Password is out of range');
        this.password = Helper_1.helper.get4BytesArray(password);
        this.validPacketStart = [...this.header, ...this.address];
        this.timeout = timeout;
        this.port = new serialport_1.default(serialPort, {
            baudRate,
        }, (err) => {
            if (err) {
                this.emitOnPortError();
                throw Error(`Cannot Open the Port ${err}`);
            }
            else {
                setTimeout(() => {
                    this.emitOnReady();
                }, 700);
            }
        });
        this.port.on('data', (data) => {
            if (this.mode !== 'available') {
                this.processRX(data.toJSON().data);
            }
        });
        this.port.on('close', () => { this.emitOnPortClose(); });
        this.port.on('error', () => { this.emitOnPortError(); });
    }
    write(commandData, dataPacket = new DataPacket()) {
        return new Promise((resolve, reject) => {
            this.commands.push({
                cmd: commandData,
                dataPacket,
                resolve,
                reject,
            });
            this.processTX();
        });
    }
    processTX() {
        if (this.mode === 'available' && this.commands.length >= 1) {
            this.mode = 'command';
            this.sendCommandPacket();
        }
    }
    sendPacket(pid, data) {
        const bytes = [...this.header, ...this.address, pid];
        const length = data.length + 2;
        let checkSum = pid;
        const len = [(length >> 8) & 0xFF, length & 0xFF];
        bytes.push(...len);
        checkSum += len[0] + len[1];
        data.forEach((val) => {
            bytes.push(val);
            checkSum += val;
        });
        bytes.push((checkSum >> 8) & 0xFF, checkSum & 0xFF);
        this.port.write(Buffer.from(bytes));
    }
    sendCommandPacket() {
        const { cmd } = this.commands[0];
        this.sendPacket(PID.COMMAND, cmd);
        this.restartTimer();
    }
    sendDataPacket() {
        const pk = this.dataPacket;
        let { data, packetSize } = pk;
        const size = data.length;
        while (data.length > packetSize) {
            this.sendPacket(PID.DATA_PACKET, data.slice(0, packetSize));
            data = data.slice(packetSize);
            const current = size - data.length;
            const value = current / size;
            pk.emitSendProgress({
                size,
                current,
                value,
                percent: value * 100,
                newData: [],
            });
        }
        this.sendPacket(PID.END_OF_DATA, data);
        pk.emitSendFinish();
        this.mode = 'available';
        this.dataPacket = new DataPacket();
        this.processTX();
    }
    processRX(data) {
        this.rx.push(...data);
        const rxLen = this.rx.length;
        // the smallest packet length is 12
        if (rxLen >= 12) {
            const pid = this.rx[6];
            const length = this.rx[7] * 256 + this.rx[8];
            let checkSum = pid + this.rx[7] + this.rx[8]; //adding length and PID to checksum
            if (rxLen < length + 9) {
                return;
            }
            //Calculating the received checksum
            const receivedCheckSum = this.rx[7 + length] * 256 + this.rx[8 + length];
            if (this.mode === 'command') {
                const code = this.rx[9];
                checkSum += this.rx[9];
                if (pid !== PID.ACKNOWLEDGE) {
                    this.rejectCommand(ERR.RECEIVEDPACKET_CORRUPTED);
                    return;
                }
                for (let i = 0; i < 6; i++) {
                    if (this.rx[i] !== this.validPacketStart[i]) {
                        this.rejectCommand(ERR.RECEIVEDPACKET_CORRUPTED);
                        return;
                    }
                }
                const receivedData = [];
                for (let i = 10; i < 7 + length; i++) {
                    receivedData.push(this.rx[i]);
                    checkSum += this.rx[i];
                }
                if (checkSum !== receivedCheckSum) {
                    this.rejectCommand(ERR.CHECKSUM);
                    return;
                }
                this.dataPacket = this.commands[0].dataPacket;
                if (this.dataPacket instanceof ReceiveDataPacket) {
                    this.rx = this.rx.slice(9 + length);
                    this.receivedData = [];
                    this.resolveCommand({
                        code,
                        data
                    }, 'data-receive');
                }
                else if (this.dataPacket instanceof SendDataPacket) {
                    this.rx = [];
                    this.resolveCommand({
                        code,
                        data: receivedData
                    }, 'data-send');
                    this.sendDataPacket();
                }
                else {
                    this.rx = [];
                    this.resolveCommand({
                        code,
                        data: receivedData,
                    });
                }
                return;
            }
            if (this.mode === 'data-receive' && this.dataPacket instanceof ReceiveDataPacket) {
                this.restartTimer();
                if (![PID.DATA_PACKET, PID.END_OF_DATA].includes(pid)) {
                    this.dataPacket.emitReceiveError(ERR.RECEIVEDPACKET_CORRUPTED);
                    return;
                }
                for (let i = 0; i < 6; i++) {
                    if (this.rx[i] !== this.validPacketStart[i]) {
                        this.dataPacket.emitReceiveError(ERR.RECEIVEDPACKET_CORRUPTED);
                        return;
                    }
                }
                const receivedData = [];
                for (let i = 9; i < 7 + length; i++) {
                    receivedData.push(this.rx[i]);
                    checkSum += this.rx[i];
                }
                if (checkSum !== receivedCheckSum) {
                    this.dataPacket.emitReceiveError(ERR.CHECKSUM);
                    return;
                }
                this.receivedData.push(...receivedData);
                const size = this.dataPacket.dataSize;
                const current = this.receivedData.length;
                const value = current / size;
                const percent = value * 100;
                this.dataPacket.emitReceiveProgress({
                    current, size, value, percent,
                    newData: receivedData,
                });
                if (pid === PID.DATA_PACKET) {
                    this.rx = this.rx.slice(9 + length);
                }
                else if (PID.END_OF_DATA) {
                    this.rx = [];
                    this.stopTimer();
                    this.dataPacket.emitReceiveFinish(this.receivedData);
                    this.dataPacket = new DataPacket();
                    this.mode = 'available';
                    this.processTX();
                }
                return;
            }
        }
    }
    resolveCommand(ackPacket, mode = 'available') {
        if (mode === 'data-receive')
            this.restartTimer();
        else
            this.stopTimer();
        const { resolve } = this.commands.shift();
        resolve(ackPacket);
        this.mode = mode;
        this.processTX();
    }
    rejectCommand(errorCode) {
        this.stopTimer();
        const { reject } = this.commands.shift();
        reject(new CommunicationError(errorCode, 'Communication with sensor failed.'));
        this.mode = 'available';
        this.processTX();
    }
    restartTimer() {
        this.stopTimer();
        this.timeoutTimer = setTimeout(() => {
            if (this.port.isOpen) {
                if (this.mode === 'command')
                    this.rejectCommand(ERR.TIMEOUT);
                else if (this.mode === 'data-receive') {
                    this.dataPacket.emitReceiveError(ERR.TIMEOUT);
                    this.mode = 'available';
                }
            }
            else {
                if (this.mode === 'command')
                    this.rejectCommand(ERR.PORT_NOTOPEN);
                else if (this.mode === 'data-receive')
                    this.dataPacket.emitReceiveError(ERR.PORT_NOTOPEN);
            }
        }, this.timeout);
    }
    stopTimer() {
        if (this.timeoutTimer !== null) {
            clearTimeout(this.timeoutTimer);
            this.timeoutTimer = null;
        }
    }
    on(event, callback) {
        switch (event) {
            case 'ready':
                this.onReady.push(callback);
                break;
            case 'port-close':
                this.onPortClose.push(callback);
                break;
            case 'port-error':
                this.onPortError.push(callback);
                break;
        }
    }
    once(event, callback) {
        switch (event) {
            case 'ready':
                this.onceReady.push(callback);
                break;
            case 'port-close':
                this.oncePortClose.push(callback);
                break;
            case 'port-error':
                this.oncePortError.push(callback);
                break;
        }
    }
    //there has to be a small amount of time between handshake/verifyPass and the next command
    //otherwise it will timeout
    handshake() {
        return __awaiter(this, void 0, void 0, function* () {
            return (yield this.write([IC.HANDSHAKE, 0x00])).code;
        });
    }
    verifyPass() {
        return __awaiter(this, void 0, void 0, function* () {
            return (yield this.write([IC.VERIFY_PASS, ...this.password])).code;
        });
    }
    setPass(password) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!Helper_1.helper.check4BytesRange(password))
                throw Error('Password is out of range');
            const pass = Helper_1.helper.get4BytesArray(password);
            return (yield this.write([IC.SET_PASS, ...pass])).code;
        });
    }
    setAddr(address) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!Helper_1.helper.check4BytesRange(address))
                throw Error('Address is out of range');
            const addr = Helper_1.helper.get4BytesArray(address);
            this.validPacketStart = this.header.concat(addr);
            const code = (yield this.write([IC.SET_ADDR, ...addr])).code;
            this.address = addr;
            return code;
        });
    }
    setSysPara(paraNumber, content) {
        return __awaiter(this, void 0, void 0, function* () {
            return (yield this.write([IC.SET_SYSPAR, paraNumber, content])).code;
        });
    }
    setSysBaudrate(baudRate) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield this.setSysPara(4 /* Baudrate */, baudRate / 9600);
        });
    }
    setSysSecurityLevel(level) {
        return __awaiter(this, void 0, void 0, function* () {
            let lv = 3;
            switch (level) {
                case 'very high':
                    lv = 5;
                    break;
                case 'high':
                    lv = 4;
                    break;
                case 'medium':
                    lv = 3;
                    break;
                case 'low':
                    lv = 2;
                    break;
                case 'very low':
                    lv = 1;
                    break;
                default:
                    lv = 3;
            }
            return yield this.setSysPara(5 /* SecurityLevel */, lv);
        });
    }
    setSysDataPackageLength(length) {
        return __awaiter(this, void 0, void 0, function* () {
            let len = 1;
            switch (length) {
                case '32bytes':
                    len = 0;
                    break;
                case '64bytes':
                    len = 1;
                    break;
                case '128bytes':
                    len = 2;
                    break;
                case '256bytes':
                    len = 3;
                    break;
                default:
                    len = 1;
            }
            return yield this.setSysPara(6 /* DataPackageLength */, len);
        });
    }
    readSysPara() {
        return __awaiter(this, void 0, void 0, function* () {
            const packet = yield this.write([IC.READ_SYSPAR]);
            let data = packet.data;
            if (packet.code !== CC.OK)
                data = new Array(16).fill(0);
            const statusRegisterCode = data[0] * 256 + data[1];
            const statusRegister = {
                busy: (data[1] & 0b1) === 1,
                pass: (data[1] & 0b10) === 1,
                passVerified: (data[1] & 0b100) === 1,
                imageBuffStat: (data[1] & 0b1000) === 1,
            };
            const capacity = data[4] * 256 + data[5];
            const securityLevelCode = data[6] * 256 + data[7];
            const address = data[8] * 0x1000000 + data[9] * 0x10000 + data[10] * 0x100 + data[11];
            const dataPackageLengthCode = data[12] * 256 + data[13];
            const baudRate = (data[14] * 256 + data[15]) * 9600;
            return {
                code: packet.code,
                data,
                statusRegister,
                statusRegisterCode,
                capacity,
                securityLevel: Helper_1.helper.getSecurityLevel(securityLevelCode),
                securityLevelCode,
                address,
                dataPackageLength: Helper_1.helper.getDataPackageLength(dataPackageLengthCode),
                dataPackageLengthCode,
                baudRate
            };
        });
    }
    templateCount() {
        return __awaiter(this, void 0, void 0, function* () {
            const { code, data } = yield this.write([IC.TEMPLATE_COUNT]);
            const count = data[0] * 256 + data[1];
            return { code, data, count };
        });
    }
    templateIndexes(indexPage) {
        return __awaiter(this, void 0, void 0, function* () {
            const { code, data } = yield this.write([IC.TEMPLATE_TABLE, indexPage]);
            const indexes = [];
            data.forEach((val, i) => {
                if (val !== 0) {
                    for (let j = 0; j < 8; j++) {
                        if (((val >> j) & 1) === 1) {
                            indexes.push(indexPage * 256 + i * 8 + j);
                        }
                    }
                }
            });
            return { code, data, indexes };
        });
    }
    genImg() {
        return __awaiter(this, void 0, void 0, function* () {
            return (yield this.write([IC.GENIMG])).code;
        });
    }
    upImage(callbacks) {
        return __awaiter(this, void 0, void 0, function* () {
            return (yield this.write([IC.UP_IMAGE], new ReceiveDataPacket(36864, callbacks))).code;
        });
    }
    downImage(data, callbacks) {
        return __awaiter(this, void 0, void 0, function* () {
            return (yield this.write([IC.DOWN_IMAGE], new SendDataPacket(data, 128, callbacks))).code;
        });
    }
    img2Tz(slot) {
        return __awaiter(this, void 0, void 0, function* () {
            return (yield this.write([IC.IMG2TZ, slot])).code;
        });
    }
    regModel() {
        return __awaiter(this, void 0, void 0, function* () {
            return (yield this.write([IC.REG_MODEL])).code;
        });
    }
    upChar(slot, callbacks) {
        return __awaiter(this, void 0, void 0, function* () {
            return (yield this.write([IC.UP_CHAR, slot], new ReceiveDataPacket(512, callbacks))).code;
        });
    }
    downChar(slot, data, callbacks) {
        return __awaiter(this, void 0, void 0, function* () {
            return (yield this.write([IC.DOWN_CHAR, slot], new SendDataPacket(data, 128, callbacks))).code;
        });
    }
    store(slot, pageId) {
        return __awaiter(this, void 0, void 0, function* () {
            const page = Helper_1.helper.get4BytesArray(pageId);
            return (yield this.write([IC.STORE, slot, page[2], page[3]])).code;
        });
    }
    loadChar(slot, pageId) {
        return __awaiter(this, void 0, void 0, function* () {
            const page = Helper_1.helper.get4BytesArray(pageId);
            return (yield this.write([IC.LOAD_CHAR, slot, page[2], page[3]])).code;
        });
    }
    delete(pageId, numberOfTemplates) {
        return __awaiter(this, void 0, void 0, function* () {
            const page = Helper_1.helper.get4BytesArray(pageId);
            const temp = Helper_1.helper.get4BytesArray(numberOfTemplates);
            return (yield this.write([IC.DELETE_CHAR, page[2], page[3], temp[2], temp[3]])).code;
        });
    }
    emptyDatabase() {
        return __awaiter(this, void 0, void 0, function* () {
            return (yield this.write([IC.EMPTY])).code;
        });
    }
    ledOn(ledOn = true) {
        return __awaiter(this, void 0, void 0, function* () {
            return (yield this.write([ledOn ? IC.LED_ON : IC.LED_OFF])).code;
        });
    }
    ledColor() {
        return __awaiter(this, void 0, void 0, function* () {
            const speed = 3;
            const count = 9;
            return (yield this.write([IC.LED_CONTROL, IC.LED_FLASHING, speed, IC.LED_RED, count])).code;
        });
    }
    match() {
        return __awaiter(this, void 0, void 0, function* () {
            const { code, data } = yield this.write([IC.MATCH]);
            const matchingScore = data[0] * 256 + data[1];
            return { code, data, matchingScore };
        });
    }
    search(slot, startPage, pageNumber) {
        return __awaiter(this, void 0, void 0, function* () {
            const start = Helper_1.helper.get4BytesArray(startPage);
            const num = Helper_1.helper.get4BytesArray(pageNumber);
            const { code, data } = yield this.write([IC.SEARCH, slot, start[2], start[3], num[2], num[3]]);
            return {
                code,
                data,
                pageId: data[0] * 256 + data[1],
                matchingScore: data[2] * 256 + data[3],
            };
        });
    }
    fastSearch(slot, startPage, pageNumber) {
        return __awaiter(this, void 0, void 0, function* () {
            const start = Helper_1.helper.get4BytesArray(startPage);
            const num = Helper_1.helper.get4BytesArray(pageNumber);
            const { code, data } = yield this.write([IC.FASTSEARCH, slot, start[2], start[3], num[2], num[3]]);
            return {
                code,
                data,
                pageId: data[0] * 256 + data[1],
                matchingScore: data[2] * 256 + data[3],
            };
        });
    }
    getRandomCode() {
        return __awaiter(this, void 0, void 0, function* () {
            const { code, data } = yield this.write([IC.GET_RANDOM]);
            const randomCode = data[0] * 0x1000000 + data[1] * 0x10000 + data[2] * 0x100 + data[3];
            return { code, data, randomCode };
        });
    }
    writeNotepad(pageNumber, content) {
        return __awaiter(this, void 0, void 0, function* () {
            const page = pageNumber && 0xFF;
            const len = Math.min(content.length, 32);
            let data = new Array(32).fill(0);
            for (let i = 0; i < len; i++) {
                data[i] = content && 0xFF;
            }
            return (yield this.write([IC.WRITE_NOTEPAD, page, ...data])).code;
        });
    }
    readNotepad(pageNumber) {
        return __awaiter(this, void 0, void 0, function* () {
            const page = pageNumber && 0xFF;
            return yield this.write([IC.READ_NOTEPAD, page]);
        });
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
    emitOnPortClose() {
        this.onPortClose.forEach((callback) => {
            callback();
        });
        for (let callback of this.oncePortClose) {
            callback();
        }
        this.oncePortClose = [];
    }
    emitOnPortError() {
        this.onPortError.forEach((callback) => {
            callback();
        });
        for (let callback of this.oncePortError) {
            callback();
        }
        this.oncePortError = [];
    }
}
exports.default = Sensor;
class DataPacket {
    constructor() {
        this.type = 'none';
    }
}
class ReceiveDataPacket extends DataPacket {
    constructor(dataSize = 1, callbacks) {
        super();
        this.dataSize = dataSize;
        this.callbacks = callbacks;
        this.hasError = false;
        this.type = 'receive';
    }
    emitReceiveFinish(data) {
        this.callbacks.onReceiveFinish(data, this.hasError);
    }
    emitReceiveError(error) {
        if (this.callbacks.onReceiveError !== undefined) {
            this.hasError = true;
            this.callbacks.onReceiveError(error);
        }
    }
    emitReceiveProgress(progress) {
        if (this.callbacks.onReceiveProgress !== undefined) {
            this.callbacks.onReceiveProgress(progress);
        }
    }
}
class SendDataPacket extends DataPacket {
    constructor(data, packetSize, callbacks = {}) {
        super();
        this.data = data;
        this.packetSize = packetSize;
        this.callbacks = callbacks;
    }
    emitSendFinish() {
        if (this.callbacks !== undefined) {
            if (this.callbacks.onSendFinish !== undefined) {
                this.callbacks.onSendFinish();
            }
        }
    }
    emitSendProgress(progress) {
        if (this.callbacks !== undefined) {
            if (this.callbacks.onSendProgress !== undefined) {
                this.callbacks.onSendProgress(progress);
            }
        }
    }
}
class CommunicationError extends Error {
    constructor(code, message) {
        super(message);
        this.code = code;
        Object.setPrototypeOf(this, new.target.prototype);
    }
}
exports.CommunicationError = CommunicationError;
//# sourceMappingURL=Sensor.js.map