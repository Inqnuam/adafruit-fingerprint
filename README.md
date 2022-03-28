# Introduction

Control Adafruit fingerprint sensor through serial port.  
Works with both NodeJS ABI and ElectronJS ABI.  
Linux, macOS and Windows supported.

## Install

```bash
npm i https://github.com/Inqnuam/adafruit-fingerprint
```

# Hardware Requirements

-   FT232 USB to TTL UART converter
-   Adafruit Fingerprint Sensor

## Hardware Wiring

Sensor > USB Converter  
red - 3V3  
yellow - RXD  
white - TXD  
black - GND

# Usage

## Hardware used in this example

-   [DSD TECH USB to TTL Adaptator](https://www.amazon.fr/dp/B07BBPX8B8/ref=cm_sw_em_r_mt_dp_CNJT32V60SDS3QKBAQK0?_encoding=UTF8&psc=1)
-   [DollaTek Adafruit Fingerprint Sensor](https://www.amazon.fr/dp/B07PRMXXXN/ref=cm_sw_em_r_mt_dp_P8WWEHGRS0TMMRWNSJA4?_encoding=UTF8&psc=1)

```js
//import { Fingerprint } from "adafruit-fingerprint"
const Fingerprint = require("adafruit-fingerprint").Fingerprint

// change devicePath with a real device path or use serialNumber option
const devicePath = "/dev/tty.usbserial-B60M4YN" // or something like "COM3" on Windows

const sensorOptions = {
    // init with sensor serial port path
    serialPort: devicePath,
    // serialNumber: "xxxxxx",
    baudRate: 57600,
    // ...
}

const finger = new Fingerprint(sensorOptions)
finger.on("ready", async (s) => {
    console.log("✅ Fingerprint Sensor is ready")

    // get count of registered fingerprints
    const totalTemplates = await finger.getTemplateCount()
    console.log("Total fingerprints:", totalTemplates)
})

finger.on("port-error", (err) => {
    console.log(err)
})
finger.on("port-close", (err) => {
    console.log(err)
})
```
