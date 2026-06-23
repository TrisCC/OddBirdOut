module.exports = {
    // Port to listen for incoming DMX UDP packets
    PORT: 5120,

    // Backend to use: 'udmx', 'serial', or 'mock'
    BACKEND: 'udmx',

    // uDMX device USB Vendor ID and Product ID
    UDMX_VID: 0x16c0,
    UDMX_PID: 0x05dc,

    // Serial DMX configuration (e.g. for Enttec Open DMX)
    SERIAL_DEVICE: '/dev/ttyUSB0',
    SERIAL_DRIVER: 'enttec-open-usb-dmx',
};
