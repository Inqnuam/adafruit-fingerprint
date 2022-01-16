export declare namespace PID {
    const COMMAND = 1;
    const DATA_PACKET = 2;
    const ACKNOWLEDGE = 7;
    const END_OF_DATA = 8;
}
export declare namespace CC {
    const OK = 0;
    const PACKETRECEIVER_ERROR = 1;
    const NO_FINGER = 2;
    const ENROLL_FAIL = 3;
    const IMAGE_DISORDERED = 6;
    const IMAGE_NOCHAR = 7;
    const FINGER_NOTMATCH = 8;
    const FINGER_NOTFOUND = 9;
    const ENROLL_MISMATCH = 10;
    const BADLOCATION = 11;
    const TEMPLATEDB_FAIL = 12;
    const UPLOAD_FAIL = 13;
    const PACKETRESPONSE_FAIL = 14;
    const DELETE_FAIL = 16;
    const CLEARDB_FAIL = 17;
    const INVALID_IMAGE = 21;
    const FLASH_ERROR = 24;
    const DEFINITION_ERROR = 25;
    const INVALID_REGISTER = 26;
    const INVALID_REGCONFIG = 27;
    const NOTEPADID_NOTFOUND = 28;
    const COMM_FAIL = 29;
    const INVALID_ADDRCODE = 32;
    const PASS_NOTVERIFIED = 33;
}
export declare namespace IC {
    const GENIMG = 1;
    const IMG2TZ = 2;
    const MATCH = 3;
    const SEARCH = 4;
    const REG_MODEL = 5;
    const STORE = 6;
    const LOAD_CHAR = 7;
    const UP_CHAR = 8;
    const DOWN_CHAR = 9;
    const SET_PASS = 18;
    const VERIFY_PASS = 19;
    const GET_RANDOM = 20;
    const SET_ADDR = 21;
    const HANDSHAKE = 23;
    const WRITE_NOTEPAD = 24;
    const READ_NOTEPAD = 25;
    const UP_IMAGE = 10;
    const DOWN_IMAGE = 11;
    const DELETE_CHAR = 12;
    const EMPTY = 13;
    const SET_SYSPAR = 14;
    const READ_SYSPAR = 15;
    const FASTSEARCH = 27;
    const TEMPLATE_COUNT = 29;
    const TEMPLATE_TABLE = 31;
    const LED_CONTROL = 53;
    const LED_ON = 80;
    const LED_OFF = 81;
    const LED_GRADUAL_ON = 5;
    const LED_GRADUAL_OFF = 6;
    const LED_RED = 1;
    const LED_BLUE = 2;
    const LED_PURPLE = 3;
    const LED_BREATHING = 1;
    const LED_FLASHING = 2;
}
export declare const enum SysParaNumber {
    Baudrate = 4,
    SecurityLevel = 5,
    DataPackageLength = 6
}
export declare namespace ERR {
    const TIMEOUT = 1;
    const RECEIVEDPACKET_CORRUPTED = 2;
    const CHECKSUM = 4;
    const PORT_NOTOPEN = 5;
}
export default class Sensor {
    private rx;
    private receivedData;
    private commands;
    private mode;
    private dataPacket;
    private header;
    private port;
    private address;
    private password;
    private validPacketStart;
    private timeout;
    private timeoutTimer;
    private onReady;
    private onceReady;
    private onPortClose;
    private oncePortClose;
    private onPortError;
    private oncePortError;
    constructor({ serialPort, baudRate, address, password, timeout }: SensorOptions);
    private write;
    private processTX;
    private sendPacket;
    private sendCommandPacket;
    private sendDataPacket;
    private processRX;
    private resolveCommand;
    private rejectCommand;
    private restartTimer;
    private stopTimer;
    on(event: SensorEvents, callback: CallbackFunction): void;
    once(event: SensorEvents, callback: CallbackFunction): void;
    handshake(): Promise<ConfirmationCode>;
    verifyPass(): Promise<ConfirmationCode>;
    setPass(password: number): Promise<ConfirmationCode>;
    setAddr(address: number): Promise<ConfirmationCode>;
    setSysPara(paraNumber: SysParaNumber, content: SysParaContent): Promise<ConfirmationCode>;
    setSysBaudrate(baudRate: Baudrate): Promise<ConfirmationCode>;
    setSysSecurityLevel(level: SecurityLevel): Promise<ConfirmationCode>;
    setSysDataPackageLength(length: DataPackageLength): Promise<ConfirmationCode>;
    readSysPara(): Promise<SystemParametersPacket>;
    templateCount(): Promise<TemplateCountPacket>;
    templateIndexes(indexPage: 0 | 1 | 2 | 3): Promise<TemplateIndexesPacket>;
    genImg(): Promise<ConfirmationCode>;
    upImage(callbacks: ReceiveDataPacketCallbacks): Promise<ConfirmationCode>;
    downImage(data: number[], callbacks?: SendDataPacketCallbacks): Promise<ConfirmationCode>;
    img2Tz(slot: 1 | 2): Promise<ConfirmationCode>;
    regModel(): Promise<ConfirmationCode>;
    upChar(slot: 1 | 2, callbacks: ReceiveDataPacketCallbacks): Promise<ConfirmationCode>;
    downChar(slot: 1 | 2, data: number[], callbacks?: SendDataPacketCallbacks): Promise<ConfirmationCode>;
    store(slot: 1 | 2, pageId: number): Promise<ConfirmationCode>;
    loadChar(slot: 1 | 2, pageId: number): Promise<ConfirmationCode>;
    delete(pageId: number, numberOfTemplates: number): Promise<ConfirmationCode>;
    emptyDatabase(): Promise<ConfirmationCode>;
    ledOn(ledOn?: boolean): Promise<ConfirmationCode>;
    ledColor(): Promise<ConfirmationCode>;
    match(): Promise<MatchPacket>;
    search(slot: 1 | 2, startPage: number, pageNumber: number): Promise<SearchPacket>;
    fastSearch(slot: 1 | 2, startPage: number, pageNumber: number): Promise<SearchPacket>;
    getRandomCode(): Promise<RandomCodePacket>;
    writeNotepad(pageNumber: number, content: number[]): Promise<ConfirmationCode>;
    readNotepad(pageNumber: number): Promise<AcknowledgePacket>;
    private emitOnReady;
    private emitOnPortClose;
    private emitOnPortError;
}
export declare class CommunicationError extends Error {
    code: number;
    constructor(code: number, message?: string);
}
//# sourceMappingURL=Sensor.d.ts.map