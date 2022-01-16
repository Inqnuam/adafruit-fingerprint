import { helper } from './Helper';
import Sensor, { CC } from './Sensor';
import Jimp from 'jimp';

export default class Fingerprint {

    private _sensor: Sensor

    private capacity: number = 0
    private indexes: number[] = []

    // Events Callbacks
    private onReady: CallbackFunction[] = []
    private onceReady: CallbackFunction[] = []

    constructor(sensorOptions: SensorOptions) {
        this._sensor = new Sensor(sensorOptions)

        this._sensor.on('ready', async () => {

            const code = await this._sensor.verifyPass()
            if (code === CC.OK) {
                await this.updateParameters()
                this.emitOnReady()
            } else {
                throw new ConfirmationCodeError(code, `Cannot verify sensor's password`)
            }

        })
    }

    get sensor() {
        return this._sensor
    }

    public on(event: FingerprintEvent, callback: CallbackFunction) {
        switch(event) {
            case 'ready':
                this.onReady.push(callback)
                break
        }
    }

    public once(event: FingerprintEvent, callback: CallbackFunction) {
        switch(event) {
            case 'ready':
                this.onceReady.push(callback)
                break
        }
    }

    public async enroll({pageId, attempts=15, delay=400, firstImageAcquired= () => true}:FingerprintEnrollOptions = {}) {
        await this.readFingerprint(attempts, 1)
        if (firstImageAcquired()) {
            await helper.timeout(delay)
            await this.readFingerprint(attempts, 2)

            if (pageId === undefined) {
                pageId = this.getEmptyIndex()
            }

            let code = await this._sensor.regModel()
            if (code === CC.OK) {
                code = await this._sensor.store(1, pageId)
                if (code === CC.OK) {
                    await this.updateParameters()
                    return pageId
                } else {
                    throw new ConfirmationCodeError(code, 'Cannot save the template.')
                }
            } else {
                throw new ConfirmationCodeError(code, 'Failed to combine char buffers')
            }
        }
    }

    public async search({attempts=15}: FingerprintOptions = {}) {
        await this.readFingerprint(attempts, 1)
        const {code, pageId, matchingScore} = await this._sensor.search(1, 0, this.capacity)
        if (code === CC.OK) {
            return {
                pageId,
                matchingScore,
            }
        } else {
            throw new ConfirmationCodeError(code, 'Search unsuccessful')
        }
    }

    public async scanFingerprint(attempts: number) {

        let code = -1
        for(let i=1; i <= attempts; i++) {
            let code = await this._sensor.genImg()
    
            if (code === CC.OK) {
                return
            } else if(i === attempts) {
                switch(code) {
                    case CC.PACKETRECEIVER_ERROR:
                        throw new ConfirmationCodeError(code, 'Error when receiving packet')
                    case CC.NO_FINGER:
                        throw new ConfirmationCodeError(code, 'No finger was detected')
                    case CC.ENROLL_FAIL:
                        throw new ConfirmationCodeError(code, 'Failed to enroll fingerprint')
                    default:
                        throw new ConfirmationCodeError(code, 'Scaning finger failed')
                }
            }
        }
    }

    public async generateBufferChar(slot: 1 | 2 = 1) {
        const code = await this._sensor.img2Tz(slot)
        if (code === CC.OK) return;
        switch (code) { 
            case CC.PACKETRECEIVER_ERROR:
                throw new ConfirmationCodeError(code, 'Error when receiving packet')
            case CC.IMAGE_DISORDERED:
                throw new ConfirmationCodeError(code, 'Failed to generate buffer char due to over-disorderly fingerprint image')
            case CC.IMAGE_NOCHAR:
                throw new ConfirmationCodeError(code, 'Failed to generate buffer char due to lack of character points in fingerprint image')
            case CC.INVALID_IMAGE:
                throw new ConfirmationCodeError(code, 'Failed to generate buffer char due to lack of valid primary image')
            default:
                throw new ConfirmationCodeError(code, 'Generating buffer char failed.')
        }
    }

    public async readFingerprint(attempts: number, slot: 1 | 2 = 1) {
        await this.scanFingerprint(attempts)
        await this.generateBufferChar(slot)
    }


    public async deleteTemplate(pageId: number) {
        const code = await this._sensor.delete(pageId, 1)
        await this.updateParameters()
        if(code !== CC.OK) {
            throw new ConfirmationCodeError(code, 'Could not delete template')
        }
    }

    public async emptyDatabase() {
        const code = await this._sensor.emptyDatabase()
        await this.updateParameters()
        if (code !== CC.OK) {
            throw new ConfirmationCodeError(code, 'Could not empty database')
        }
    }
    
    public async getTemplateIndexes() {
        const res:number[] = [];
        for(let i=0; i < 4; i++) {
            const {code, indexes} = (await this._sensor.templateIndexes(i as  0 | 1 | 2 | 3))
            if (code !== CC.OK)
                throw new ConfirmationCodeError(code, 'Reading templates failed')
            res.push(...indexes)
        }
        this.indexes = res

        return res
    }

    public async getTemplateCount() {
        const {code, count} = await this._sensor.templateCount()
        if (code === CC.OK)
            return count
        throw new ConfirmationCodeError(code, 'Could not read template counts due to corrupt packet')
    }

    public async getSystemParameters(): Promise<SystemParameters> {
        const para = await this._sensor.readSysPara()
        if (para.code === CC.OK) {
            this.capacity = para.capacity
            return para
        } else {
            throw new ConfirmationCodeError(para.code, `Cannot read the parameters of the sensor.`)
        }
    }

    public previewImage(onReceiveProgress: (progress: Progress) => void = () => {}, attempts = 15): Promise<Jimp> {
        return new Promise(async (resolve, reject) => {
            const code = await this._sensor.upImage({
                onReceiveFinish(data, error) {
                    if (error)
                        reject(new DataReceiveError('Receiving image data failed'))
                    
                    new Jimp(256, 288, (err: any, image: any) => {
                        if (err) reject(err)
    
                        for (let i=0; i < data.length; i++) {
                            const d = data[i]
                            const px1 = (d & 0xF) * 17
                            const px2 = ((d >> 4) & 0xF) * 17
                            
                            const h1 = Jimp.rgbaToInt(px1, px1, px1, 255)
                            const h2 = Jimp.rgbaToInt(px2, px2, px2, 255)

                            image.setPixelColor(h2, (i % 128) * 2, (i / 128))
                            image.setPixelColor(h1, (i % 128) * 2 + 1, (i / 128))
                            
                        }

                        resolve(image)
                    })

                },
                onReceiveProgress,
            })
    
            if (code !== CC.OK)
                reject(new ConfirmationCodeError(code, 'Could not get the fingerprint image'))
        })
    }

    public hasIndex(index: number) {
        return this.indexes.includes(index)
    }

    private async updateParameters() {
        await this.getSystemParameters()
       // await this.getTemplateIndexes()
    }

    private getEmptyIndex() {
        for (let i=0; i<this.capacity; i++) {
            if (!this.indexes.includes(i)) {
                return i
            }
        }
        throw Error('Cannot find an empty template')
    }

    private emitOnReady() {
        this.onReady.forEach((callback) => {
            callback()
        })
        for(let callback of this.onceReady) {
            callback()
        }
        this.onceReady = []
    }
}

export class ConfirmationCodeError extends Error {
    constructor(public code:number, message?: string) {
        super(message)
        Object.setPrototypeOf(this, new.target.prototype)
    }
}

export class DataReceiveError extends Error {
    constructor(message?: string) {
        super(message)
        Object.setPrototypeOf(this, new.target.prototype)
    }
}


