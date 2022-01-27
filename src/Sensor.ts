import SerialPort from "serialport"
import { helper } from "./Helper"

//Package Identifier
export namespace PID {
    export const COMMAND = 0x01
    export const DATA_PACKET = 0x02
    export const ACKNOWLEDGE = 0x07
    export const END_OF_DATA = 0x08
}

// Confirmation Code of Acknowledge Packets
export namespace CC {
    export const OK = 0x00
    export const PACKETRECEIVER_ERROR = 0x01
    export const NO_FINGER = 0x02
    export const ENROLL_FAIL = 0x03
    export const IMAGE_DISORDERED = 0x06
    export const IMAGE_NOCHAR = 0x07
    export const FINGER_NOTMATCH = 0x08
    export const FINGER_NOTFOUND = 0x09
    export const ENROLL_MISMATCH = 0x0a
    export const BADLOCATION = 0x0b
    export const TEMPLATEDB_FAIL = 0x0c
    export const UPLOAD_FAIL = 0x0d
    export const PACKETRESPONSE_FAIL = 0x0e
    export const DELETE_FAIL = 0x10
    export const CLEARDB_FAIL = 0x11
    export const INVALID_IMAGE = 0x15
    export const FLASH_ERROR = 0x18
    export const DEFINITION_ERROR = 0x19
    export const INVALID_REGISTER = 0x1a
    export const INVALID_REGCONFIG = 0x1b
    export const NOTEPADID_NOTFOUND = 0x1c
    export const COMM_FAIL = 0x1d
    export const INVALID_ADDRCODE = 0x20
    export const PASS_NOTVERIFIED = 0x21
}

// Instruction Codes
export namespace IC {
    export const GENIMG = 0x01
    export const IMG2TZ = 0x02
    export const MATCH = 0x03
    export const SEARCH = 0x04
    export const REG_MODEL = 0x05
    export const STORE = 0x06
    export const LOAD_CHAR = 0x07
    export const UP_CHAR = 0x08
    export const DOWN_CHAR = 0x09
    export const SET_PASS = 0x12
    export const VERIFY_PASS = 0x13
    export const GET_RANDOM = 0x14
    export const SET_ADDR = 0x15
    export const HANDSHAKE = 0x17
    export const WRITE_NOTEPAD = 0x18
    export const READ_NOTEPAD = 0x19
    export const UP_IMAGE = 0x0a
    export const DOWN_IMAGE = 0x0b
    export const DELETE_CHAR = 0x0c
    export const EMPTY = 0x0d
    export const SET_SYSPAR = 0x0e
    export const READ_SYSPAR = 0x0f
    export const FASTSEARCH = 0x1b
    export const TEMPLATE_COUNT = 0x1d
    export const TEMPLATE_TABLE = 0x1f
    export const LED_CONTROL = 0x35
    export const LED_ON = 0x50
    export const LED_OFF = 0x51
    export const LED_GRADUAL_ON = 0x05
    export const LED_GRADUAL_OFF = 0x06
    export const LED_RED = 0x01
    export const LED_BLUE = 0x02
    export const LED_PURPLE = 0x03
    export const LED_BREATHING = 0x01
    export const LED_FLASHING = 0x02
}

export const enum SysParaNumber {
    Baudrate = 4,
    SecurityLevel = 5,
    DataPackageLength = 6,
}

//Error Codes
export namespace ERR {
    export const TIMEOUT = 1
    export const RECEIVEDPACKET_CORRUPTED = 2
    export const CHECKSUM = 4
    export const PORT_NOTOPEN = 5
}

export default class Sensor {
    private rx: number[] = []
    private receivedData: number[] = []
    private commands: Command[] = []
    private mode: Mode = "available"
    private dataPacket: DataPacket = new DataPacket()

    private header = [0xef, 0x01]
    private port: SerialPort
    private address: number[]
    private password: number[]
    private validPacketStart: number[]
    private timeout: number
    private timeoutTimer: any = null

    //callbacks
    private onReady: CallbackFunction[] = []
    private onceReady: CallbackFunction[] = []
    private onPortClose: CallbackFunction[] = []
    private oncePortClose: CallbackFunction[] = []
    private onPortError: CallbackFunction[] = []
    private oncePortError: CallbackFunction[] = []

    constructor({ serialPort, baudRate = 57600, address = 0xffffffff, password = 0, timeout = 1000 }: SensorOptions) {
        if (!helper.check4BytesRange(address)) throw Error("Address is out of range")
        this.address = helper.get4BytesArray(address)

        if (!helper.check4BytesRange(password)) throw Error("Password is out of range")
        this.password = helper.get4BytesArray(password)

        this.validPacketStart = [...this.header, ...this.address]

        this.timeout = timeout

        this.port = new SerialPort(
            serialPort,
            {
                baudRate,
            },
            (err) => {
                if (err) {
                    this.emitOnPortError()
                   // throw Error(`Cannot Open the Port ${err}`)
                } else {
                    setTimeout(() => {
                        this.emitOnReady()
                    }, 700)
                }
            }
        )

        this.port.on("data", (data: Buffer) => {
            if (this.mode !== "available") {
                this.processRX(data.toJSON().data)
            }
        })

        this.port.on("close", () => {
            this.emitOnPortClose()
        })
        this.port.on("error", () => {
            this.emitOnPortError()
        })
    }

    private write(commandData: number[], dataPacket: DataPacket = new DataPacket()): Promise<AcknowledgePacket> {
        return new Promise((resolve, reject) => {
            this.commands.push({
                cmd: commandData,
                dataPacket,
                resolve,
                reject,
            })
            this.processTX()
        })
    }

    private processTX() {
        if (this.mode === "available" && this.commands.length >= 1) {
            this.mode = "command"
            this.sendCommandPacket()
        }
    }

    private sendPacket(pid: 1 | 2 | 8, data: number[]) {
        const bytes = [...this.header, ...this.address, pid]
        const length = data.length + 2

        let checkSum = pid

        const len = [(length >> 8) & 0xff, length & 0xff]
        bytes.push(...len)
        checkSum += len[0] + len[1]

        data.forEach((val) => {
            bytes.push(val)
            checkSum += val
        })

        bytes.push((checkSum >> 8) & 0xff, checkSum & 0xff)

        this.port.write(Buffer.from(bytes))
    }

    private sendCommandPacket() {
        const { cmd } = this.commands[0]
        this.sendPacket(PID.COMMAND, cmd)
        this.restartTimer()
    }

    private sendDataPacket() {
        const pk = this.dataPacket as SendDataPacket
        let { data, packetSize } = pk
        const size = data.length

        while (data.length > packetSize) {
            this.sendPacket(PID.DATA_PACKET, data.slice(0, packetSize))
            data = data.slice(packetSize)

            const current = size - data.length
            const value = current / size
            pk.emitSendProgress({
                size,
                current,
                value,
                percent: value * 100,
                newData: [],
            })
        }
        this.sendPacket(PID.END_OF_DATA, data)
        pk.emitSendFinish()

        this.mode = "available"
        this.dataPacket = new DataPacket()
        this.processTX()
    }

    private processRX(data: number[]) {
        this.rx.push(...data)

        const rxLen = this.rx.length

        // the smallest packet length is 12
        if (rxLen >= 12) {
            const pid = this.rx[6]
            const length = this.rx[7] * 256 + this.rx[8]
            let checkSum = pid + this.rx[7] + this.rx[8] //adding length and PID to checksum

            if (rxLen < length + 9) {
                return
            }

            //Calculating the received checksum
            const receivedCheckSum = this.rx[7 + length] * 256 + this.rx[8 + length]

            if (this.mode === "command") {
                const code = this.rx[9] as ConfirmationCode
                checkSum += this.rx[9]

                if (pid !== PID.ACKNOWLEDGE) {
                    this.rejectCommand(ERR.RECEIVEDPACKET_CORRUPTED)
                    return
                }

                for (let i = 0; i < 6; i++) {
                    if (this.rx[i] !== this.validPacketStart[i]) {
                        this.rejectCommand(ERR.RECEIVEDPACKET_CORRUPTED)
                        return
                    }
                }

                const receivedData: number[] = []
                for (let i = 10; i < 7 + length; i++) {
                    receivedData.push(this.rx[i])
                    checkSum += this.rx[i]
                }

                if (checkSum !== receivedCheckSum) {
                    this.rejectCommand(ERR.CHECKSUM)
                    return
                }

                this.dataPacket = this.commands[0].dataPacket as DataPacket

                if (this.dataPacket instanceof ReceiveDataPacket) {
                    this.rx = this.rx.slice(9 + length)
                    this.receivedData = []
                    this.resolveCommand(
                        {
                            code,
                            data,
                        },
                        "data-receive"
                    )
                } else if (this.dataPacket instanceof SendDataPacket) {
                    this.rx = []
                    this.resolveCommand(
                        {
                            code,
                            data: receivedData,
                        },
                        "data-send"
                    )
                    this.sendDataPacket()
                } else {
                    this.rx = []
                    this.resolveCommand({
                        code,
                        data: receivedData,
                    })
                }
                return
            }

            if (this.mode === "data-receive" && this.dataPacket instanceof ReceiveDataPacket) {
                this.restartTimer()

                if (![PID.DATA_PACKET, PID.END_OF_DATA].includes(pid)) {
                    this.dataPacket.emitReceiveError(ERR.RECEIVEDPACKET_CORRUPTED)
                    return
                }

                for (let i = 0; i < 6; i++) {
                    if (this.rx[i] !== this.validPacketStart[i]) {
                        this.dataPacket.emitReceiveError(ERR.RECEIVEDPACKET_CORRUPTED)
                        return
                    }
                }

                const receivedData: number[] = []
                for (let i = 9; i < 7 + length; i++) {
                    receivedData.push(this.rx[i])
                    checkSum += this.rx[i]
                }

                if (checkSum !== receivedCheckSum) {
                    this.dataPacket.emitReceiveError(ERR.CHECKSUM)
                    return
                }

                this.receivedData.push(...receivedData)

                const size = this.dataPacket.dataSize
                const current = this.receivedData.length
                const value = current / size
                const percent = value * 100
                this.dataPacket.emitReceiveProgress({
                    current,
                    size,
                    value,
                    percent,
                    newData: receivedData,
                })

                if (pid === PID.DATA_PACKET) {
                    this.rx = this.rx.slice(9 + length)
                } else if (PID.END_OF_DATA) {
                    this.rx = []
                    this.stopTimer()

                    this.dataPacket.emitReceiveFinish(this.receivedData)
                    this.dataPacket = new DataPacket()

                    this.mode = "available"
                    this.processTX()
                }

                return
            }
        }
    }

    private resolveCommand(ackPacket: AcknowledgePacket, mode: Mode = "available") {
        if (mode === "data-receive") this.restartTimer()
        else this.stopTimer()

        const { resolve } = this.commands.shift() as Command
        resolve(ackPacket)
        this.mode = mode
        this.processTX()
    }

    private rejectCommand(errorCode: number) {
        this.stopTimer()

        const { reject } = this.commands.shift() as Command
        reject(new CommunicationError(errorCode, "Communication with sensor failed."))
        this.mode = "available"
        this.processTX()
    }

    private restartTimer() {
        this.stopTimer()

        this.timeoutTimer = setTimeout(() => {
            if (this.port.isOpen) {
                if (this.mode === "command") this.rejectCommand(ERR.TIMEOUT)
                else if (this.mode === "data-receive") {
                    ;(this.dataPacket as ReceiveDataPacket).emitReceiveError(ERR.TIMEOUT)
                    this.mode = "available"
                }
            } else {
                if (this.mode === "command") this.rejectCommand(ERR.PORT_NOTOPEN)
                else if (this.mode === "data-receive") (this.dataPacket as ReceiveDataPacket).emitReceiveError(ERR.PORT_NOTOPEN)
            }
        }, this.timeout)
    }

    private stopTimer() {
        if (this.timeoutTimer !== null) {
            clearTimeout(this.timeoutTimer)
            this.timeoutTimer = null
        }
    }

    public on(event: SensorEvents, callback: CallbackFunction) {
        switch (event) {
            case "ready":
                this.onReady.push(callback)
                break
            case "port-close":
                this.onPortClose.push(callback)
                break
            case "port-error":
                this.onPortError.push(callback)
                break
        }
    }

    public once(event: SensorEvents, callback: CallbackFunction) {
        switch (event) {
            case "ready":
                this.onceReady.push(callback)
                break
            case "port-close":
                this.oncePortClose.push(callback)
                break
            case "port-error":
                this.oncePortError.push(callback)
                break
        }
    }

    public close(callback: any) {
        this.port.close((error) => {
            callback(error)
        })
    }
    //there has to be a small amount of time between handshake/verifyPass and the next command
    //otherwise it will timeout
    public async handshake() {
        return (await this.write([IC.HANDSHAKE, 0x00])).code
    }

    public async verifyPass() {
        return (await this.write([IC.VERIFY_PASS, ...this.password])).code
    }

    public async setPass(password: number) {
        if (!helper.check4BytesRange(password)) throw Error("Password is out of range")

        const pass = helper.get4BytesArray(password)
        return (await this.write([IC.SET_PASS, ...pass])).code
    }

    public async setAddr(address: number) {
        if (!helper.check4BytesRange(address)) throw Error("Address is out of range")

        const addr = helper.get4BytesArray(address)
        this.validPacketStart = this.header.concat(addr)

        const code = (await this.write([IC.SET_ADDR, ...addr])).code
        this.address = addr

        return code
    }

    public async setSysPara(paraNumber: SysParaNumber, content: SysParaContent) {
        return (await this.write([IC.SET_SYSPAR, paraNumber, content])).code
    }

    public async setSysBaudrate(baudRate: Baudrate) {
        return await this.setSysPara(SysParaNumber.Baudrate, (baudRate / 9600) as SysParaContent)
    }

    public async setSysSecurityLevel(level: SecurityLevel) {
        let lv: SysParaContent = 3
        switch (level) {
            case "very high":
                lv = 5
                break
            case "high":
                lv = 4
                break
            case "medium":
                lv = 3
                break
            case "low":
                lv = 2
                break
            case "very low":
                lv = 1
                break
            default:
                lv = 3
        }

        return await this.setSysPara(SysParaNumber.SecurityLevel, lv)
    }

    public async setSysDataPackageLength(length: DataPackageLength) {
        let len: SysParaContent = 1
        switch (length) {
            case "32bytes":
                len = 0
                break
            case "64bytes":
                len = 1
                break
            case "128bytes":
                len = 2
                break
            case "256bytes":
                len = 3
                break
            default:
                len = 1
        }

        return await this.setSysPara(SysParaNumber.DataPackageLength, len)
    }

    public async readSysPara(): Promise<SystemParametersPacket> {
        const packet = await this.write([IC.READ_SYSPAR])
        let data = packet.data

        if (packet.code !== CC.OK) data = new Array(16).fill(0)

        const statusRegisterCode = data[0] * 256 + data[1]
        const statusRegister: StatusRegister = {
            busy: (data[1] & 0b1) === 1,
            pass: (data[1] & 0b10) === 1,
            passVerified: (data[1] & 0b100) === 1,
            imageBuffStat: (data[1] & 0b1000) === 1,
        }
        const capacity = data[4] * 256 + data[5]
        const securityLevelCode = data[6] * 256 + data[7]
        const address = data[8] * 0x1000000 + data[9] * 0x10000 + data[10] * 0x100 + data[11]
        const dataPackageLengthCode = data[12] * 256 + data[13]
        const baudRate = ((data[14] * 256 + data[15]) * 9600) as Baudrate

        return {
            code: packet.code,
            data,
            statusRegister,
            statusRegisterCode,
            capacity,
            securityLevel: helper.getSecurityLevel(securityLevelCode),
            securityLevelCode,
            address,
            dataPackageLength: helper.getDataPackageLength(dataPackageLengthCode),
            dataPackageLengthCode,
            baudRate,
        }
    }

    public async templateCount(): Promise<TemplateCountPacket> {
        const { code, data } = await this.write([IC.TEMPLATE_COUNT])
        const count = data[0] * 256 + data[1]

        return { code, data, count }
    }

    public async templateIndexes(indexPage: 0 | 1 | 2 | 3): Promise<TemplateIndexesPacket> {
        const { code, data } = await this.write([IC.TEMPLATE_TABLE, indexPage])
        const indexes: number[] = []
        data.forEach((val, i) => {
            if (val !== 0) {
                for (let j = 0; j < 8; j++) {
                    if (((val >> j) & 1) === 1) {
                        indexes.push(indexPage * 256 + i * 8 + j)
                    }
                }
            }
        })
        return { code, data, indexes }
    }

    public async genImg() {
        return (await this.write([IC.GENIMG])).code
    }

    public async upImage(callbacks: ReceiveDataPacketCallbacks) {
        return (await this.write([IC.UP_IMAGE], new ReceiveDataPacket(36864, callbacks))).code
    }

    public async downImage(data: number[], callbacks?: SendDataPacketCallbacks) {
        return (await this.write([IC.DOWN_IMAGE], new SendDataPacket(data, 128, callbacks))).code
    }

    public async img2Tz(slot: 1 | 2) {
        return (await this.write([IC.IMG2TZ, slot])).code
    }

    public async regModel() {
        return (await this.write([IC.REG_MODEL])).code
    }

    public async upChar(slot: 1 | 2, callbacks: ReceiveDataPacketCallbacks) {
        return (await this.write([IC.UP_CHAR, slot], new ReceiveDataPacket(512, callbacks))).code
    }

    public async downChar(slot: 1 | 2, data: number[], callbacks?: SendDataPacketCallbacks) {
        return (await this.write([IC.DOWN_CHAR, slot], new SendDataPacket(data, 128, callbacks))).code
    }

    public async store(slot: 1 | 2, pageId: number) {
        const page = helper.get4BytesArray(pageId)
        return (await this.write([IC.STORE, slot, page[2], page[3]])).code
    }

    public async loadChar(slot: 1 | 2, pageId: number) {
        const page = helper.get4BytesArray(pageId)
        return (await this.write([IC.LOAD_CHAR, slot, page[2], page[3]])).code
    }

    public async delete(pageId: number, numberOfTemplates: number) {
        const page = helper.get4BytesArray(pageId)
        const temp = helper.get4BytesArray(numberOfTemplates)
        return (await this.write([IC.DELETE_CHAR, page[2], page[3], temp[2], temp[3]])).code
    }

    public async emptyDatabase() {
        return (await this.write([IC.EMPTY])).code
    }

    public async ledOn(ledOn: boolean = true) {
        return (await this.write([ledOn ? IC.LED_ON : IC.LED_OFF])).code
    }

    public async ledColor(speed: number = 0, count: number = 0) {
        return (await this.write([IC.LED_CONTROL, IC.LED_FLASHING, speed, IC.LED_RED, count])).code
    }
    public async match(): Promise<MatchPacket> {
        const { code, data } = await this.write([IC.MATCH])
        const matchingScore = data[0] * 256 + data[1]
        return { code, data, matchingScore }
    }

    public async search(slot: 1 | 2, startPage: number, pageNumber: number): Promise<SearchPacket> {
        const start = helper.get4BytesArray(startPage)
        const num = helper.get4BytesArray(pageNumber)

        const { code, data } = await this.write([IC.SEARCH, slot, start[2], start[3], num[2], num[3]])
        return {
            code,
            data,
            pageId: data[0] * 256 + data[1],
            matchingScore: data[2] * 256 + data[3],
        }
    }

    public async fastSearch(slot: 1 | 2, startPage: number, pageNumber: number): Promise<SearchPacket> {
        const start = helper.get4BytesArray(startPage)
        const num = helper.get4BytesArray(pageNumber)

        const { code, data } = await this.write([IC.FASTSEARCH, slot, start[2], start[3], num[2], num[3]])
        return {
            code,
            data,
            pageId: data[0] * 256 + data[1],
            matchingScore: data[2] * 256 + data[3],
        }
    }

    public async getRandomCode(): Promise<RandomCodePacket> {
        const { code, data } = await this.write([IC.GET_RANDOM])
        const randomCode = data[0] * 0x1000000 + data[1] * 0x10000 + data[2] * 0x100 + data[3]

        return { code, data, randomCode }
    }

    public async writeNotepad(pageNumber: number, content: number[]) {
        const page = pageNumber && 0xff
        const len = Math.min(content.length, 32)
        let data = new Array<number>(32).fill(0)

        for (let i = 0; i < len; i++) {
            data[i] = content && 0xff
        }
        return (await this.write([IC.WRITE_NOTEPAD, page, ...data])).code
    }

    public async readNotepad(pageNumber: number) {
        const page = pageNumber && 0xff
        return await this.write([IC.READ_NOTEPAD, page])
    }

    private emitOnReady() {
        this.onReady.forEach((callback) => {
            callback()
        })
        for (let callback of this.onceReady) {
            callback()
        }
        this.onceReady = []
    }

    private emitOnPortClose() {
        this.onPortClose.forEach((callback) => {
            callback()
        })
        for (let callback of this.oncePortClose) {
            callback()
        }
        this.oncePortClose = []
    }

    private emitOnPortError() {
        this.onPortError.forEach((callback) => {
            callback()
        })
        for (let callback of this.oncePortError) {
            callback()
        }
        this.oncePortError = []
    }
}

class DataPacket {
    protected type: "none" | "receive" | "send" = "none"
}

class ReceiveDataPacket extends DataPacket {
    private hasError = false
    constructor(public dataSize: number = 1, public callbacks: ReceiveDataPacketCallbacks) {
        super()
        this.type = "receive"
    }

    public emitReceiveFinish(data: number[]) {
        this.callbacks.onReceiveFinish(data, this.hasError)
    }

    public emitReceiveError(error: number) {
        if (this.callbacks.onReceiveError !== undefined) {
            this.hasError = true
            this.callbacks.onReceiveError(error)
        }
    }

    public emitReceiveProgress(progress: Progress) {
        if (this.callbacks.onReceiveProgress !== undefined) {
            this.callbacks.onReceiveProgress(progress)
        }
    }
}

class SendDataPacket extends DataPacket {
    constructor(public data: number[], public packetSize: 64 | 128 | 256, public callbacks: SendDataPacketCallbacks = {}) {
        super()
    }

    public emitSendFinish() {
        if (this.callbacks !== undefined) {
            if (this.callbacks.onSendFinish !== undefined) {
                this.callbacks.onSendFinish()
            }
        }
    }

    public emitSendProgress(progress: Progress) {
        if (this.callbacks !== undefined) {
            if (this.callbacks.onSendProgress !== undefined) {
                this.callbacks.onSendProgress(progress)
            }
        }
    }
}

export class CommunicationError extends Error {
    constructor(public code: number, message?: string) {
        super(message)
        Object.setPrototypeOf(this, new.target.prototype)
    }
}
