export class helper {

    public static check4BytesRange(val: number) {
        return ( val >= 0 && val <= 0xFFFFFFFF) 
    }

    public static get4BytesArray(val: number) {
        return  [
            (val >> 24) & 0xFF,
            (val >> 16) & 0xFF,
            (val >> 8) & 0xFF,
            (val) & 0xFF,
        ]
    }

    public static getSecurityLevel(code: number): SecurityLevel {
        switch(code) {
            case 5:
                return 'very high'
            case 4: 
                return 'high'
            case 3:
                return 'medium'
            case 2:
                return 'low'
            case 1:
                return 'very low'
        }

        return 'medium'
    }

    public static getDataPackageLength(code: number): DataPackageLength {
        switch(code) {
            case 3: 
                return '256bytes'
            case 2:
                return '128bytes'
            case 1:
                return '64bytes'
            case 0:
                return '32bytes'
        }

        return '64bytes'
    }

    public static timeout(ms: number) {
        return new Promise((resolve) => setTimeout(resolve, ms))
    }

}