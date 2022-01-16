"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.helper = void 0;
class helper {
    static check4BytesRange(val) {
        return (val >= 0 && val <= 0xFFFFFFFF);
    }
    static get4BytesArray(val) {
        return [
            (val >> 24) & 0xFF,
            (val >> 16) & 0xFF,
            (val >> 8) & 0xFF,
            (val) & 0xFF,
        ];
    }
    static getSecurityLevel(code) {
        switch (code) {
            case 5:
                return 'very high';
            case 4:
                return 'high';
            case 3:
                return 'medium';
            case 2:
                return 'low';
            case 1:
                return 'very low';
        }
        return 'medium';
    }
    static getDataPackageLength(code) {
        switch (code) {
            case 3:
                return '256bytes';
            case 2:
                return '128bytes';
            case 1:
                return '64bytes';
            case 0:
                return '32bytes';
        }
        return '64bytes';
    }
    static timeout(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
}
exports.helper = helper;
//# sourceMappingURL=Helper.js.map