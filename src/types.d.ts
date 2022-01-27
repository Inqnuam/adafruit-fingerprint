type Mode = 'available' | 'command' | 'data-receive' | 'data-send' 

type CallbackFunction = () => any;
type SensorEvents = 'ready' | 'port-close' | 'port-error'

type Baudrate = 9600 | 19200 | 28800 | 38400 | 48000 | 57600 | 67200 | 76800 | 86400 | 96000 | 105600 | 115200 
type SecurityLevel = 'very high' | 'high' | 'medium' | 'low' | 'very low'
type DataPackageLength = '32bytes' | '64bytes' | '128bytes' | '256bytes'

type SysParaContent = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12

type ConfirmationCode = 0x0 | 0x1 | 0x2 | 0x3 | 0x4 | 0x6 | 0x7 | 0x8 | 0x9 | 0xA | 0xB | 0xC | 0xD | 0xE | 0x10 | 0x11 | 0x15 | 0x18 | 0x19 | 0x1A | 0x1B | 0x1C | 0x1D | 0x20 | 0x21

interface Command {
    cmd: number[],
    dataPacket: any,
    resolve: any,
    reject: any,
}

interface SensorOptions {
    serialPort: string,
    baudRate?: Baudrate,
    address?: number,
    password?: number,
    timeout?: number,
}

interface AcknowledgePacket {
    code: ConfirmationCode,
    data: number[],
}

interface ReceiveDataPacketCallbacks {
    onReceiveFinish: (data: number[], hasError: boolean) => void,
    onReceiveProgress?: (progress: Progress) => void,
    onReceiveError?: (error: number) => void,
}


interface SendDataPacketCallbacks {
    onSendFinish?: () => void,
    onSendProgress?: (progress: Progress) => void,
}


interface Progress {
    size: number,
    current: number,
    newData: number[],
    percent: number,
    value: number,
}

interface TemplateCountPacket extends AcknowledgePacket {
    count: number,
}

interface TemplateIndexesPacket extends AcknowledgePacket {
    indexes: number[],
}

interface MatchPacket extends AcknowledgePacket {
    matchingScore: number
}

interface SearchPacket extends AcknowledgePacket {
    pageId: number,
    matchingScore: number,
}

interface RandomCodePacket extends AcknowledgePacket {
    randomCode: number,
}

interface StatusRegister {
    busy: boolean,
    pass: boolean,
    passVerified: boolean,
    imageBuffStat: boolean,
}

interface SystemParameters {
    statusRegister: StatusRegister,
    statusRegisterCode: number,
    capacity: number,
    securityLevel: SecurityLevel,
    securityLevelCode: number,
    address: number,
    dataPackageLength: DataPackageLength,
    dataPackageLengthCode: number,
    baudRate: Baudrate,
}

interface SystemParametersPacket extends AcknowledgePacket, SystemParameters {
}

//Fingerprint class

type FingerprintEvent = 'ready' | 'port-error' | 'port-close'

interface FingerprintOptions {
    attempts?: number
}

interface FingerprintEnrollOptions extends FingerprintOptions {
    pageId?: number,
    delay?: number,
    firstImageAcquired?: () => boolean,
}

interface FingerprintSearchResult {
    pageId: number,
    matchingScore: number,
}