const usb = require('usb');

console.log('=== DMX Protocol Probe ===\n');

const VID = 0x16c0;
const PID = 0x05dc;

const device = usb.findByIds(VID, PID);
if (!device) {
    console.error('uDMX device not found');
    process.exit(1);
}

device.open();
const iface = device.interfaces[0];
if (iface.isKernelDriverActive()) iface.detachKernelDriver();
iface.claim();

// 1. Dump full USB descriptors
console.log('=== Device Descriptor ===');
const desc = device.deviceDescriptor;
console.log('bDeviceClass:      ' + desc.bDeviceClass);
console.log('idVendor:          0x' + desc.idVendor.toString(16));
console.log('idProduct:         0x' + desc.idProduct.toString(16));
console.log('bNumConfigurations: ' + desc.bNumConfigurations);

// String descriptors
try { console.log('iManufacturer:     ' + device.getStringDescriptor(desc.iManufacturer)); } catch(e) {}
try { console.log('iProduct:          ' + device.getStringDescriptor(desc.iProduct)); } catch(e) {}
try { console.log('iSerialNumber:     ' + device.getStringDescriptor(desc.iSerialNumber)); } catch(e) {}

console.log('\n=== Interface & Endpoint Descriptors ===');
const altSetting = iface.altSetting;
console.log('bInterfaceNumber:  ' + altSetting.bInterfaceNumber);
console.log('bInterfaceClass:   ' + altSetting.bInterfaceClass);
console.log('bInterfaceSubClass: ' + altSetting.bInterfaceSubClass);
console.log('bInterfaceProtocol: ' + altSetting.bInterfaceProtocol);
console.log('bNumEndpoints:     ' + altSetting.bNumEndpoints);

const endpoints = iface.endpoints;
for (const ep of endpoints) {
    console.log('\n  Endpoint 0x' + ep.bEndpointAddress.toString(16));
    console.log('    direction:   ' + (ep.bEndpointAddress & 0x80 ? 'IN' : 'OUT'));
    console.log('    type:        ' + ['control', 'isochronous', 'bulk', 'interrupt'][ep.transferType]);
    console.log('    maxPacketSize: ' + ep.maxPacketSize);
}

// 2. Try various control transfer configurations
console.log('\n=== Trying Control Transfers ===');

const testBuf = Buffer.alloc(512, 0);
testBuf[0] = 255; // ch1 = 255

const controlConfigs = [
    { bmRequestType: 0x40, bRequest: 1, wValue: 0, wIndex: 0, label: '0x40 bReq=1 TX_CHANNELS' },
    { bmRequestType: 0x40, bRequest: 2, wValue: 1, wIndex: 255, dataLen: 0, label: '0x40 bReq=2 SET_SINGLE ch1=255' },
    { bmRequestType: 0x21, bRequest: 1, wValue: 0, wIndex: 0, label: '0x21 bReq=1 TX_CHANNELS' },
    { bmRequestType: 0x21, bRequest: 2, wValue: 1, wIndex: 255, dataLen: 0, label: '0x21 bReq=2 SET_SINGLE ch1=255' },
    { bmRequestType: 0x01, bRequest: 1, wValue: 0, wIndex: 0, label: '0x01 bReq=1 TX_CHANNELS' },
    { bmRequestType: 0xC0, bRequest: 3, wValue: 0, wIndex: 0, label: '0xC0 bReq=3 READ (in)' },
];

async function testControlTransfer(cfg) {
    return new Promise((resolve) => {
        const data = cfg.dataLen === 0 ? Buffer.alloc(0) : testBuf;
        const wIndex = cfg.wIndex !== undefined ? cfg.wIndex : 0;
        const wValue = cfg.wValue !== undefined ? cfg.wValue : 0;

        if (cfg.bmRequestType & 0x80) {
            // IN transfer (read)
            device.controlTransfer(cfg.bmRequestType, cfg.bRequest, wValue, wIndex, 512, (err, data) => {
                if (err) {
                    console.log('  ' + cfg.label + ': FAIL (' + err.message + ')');
                } else {
                    console.log('  ' + cfg.label + ': OK (got ' + data.length + ' bytes)');
                    if (data.length <= 32) {
                        console.log('    Data: ' + data.toString('hex'));
                    }
                }
                resolve();
            });
        } else {
            // OUT transfer (write)
            device.controlTransfer(cfg.bmRequestType, cfg.bRequest, wValue, wIndex, data, (err) => {
                if (err) {
                    console.log('  ' + cfg.label + ': FAIL (' + err.message + ')');
                } else {
                    console.log('  ' + cfg.label + ': OK');
                }
                resolve();
            });
        }
    });
}

// 3. Try endpoint transfers if available
async function testEndpointTransfer() {
    for (const ep of endpoints) {
        const dir = ep.bEndpointAddress & 0x80 ? 'IN' : 'OUT';
        if (dir === 'OUT') {
            console.log('\n=== Trying Bulk/Interrupt OUT endpoint 0x' + ep.bEndpointAddress.toString(16) + ' ===');
            return new Promise((resolve) => {
                const buf = Buffer.alloc(512, 0);
                buf[0] = 255; // channel 1 = 255
                ep.transfer(buf, (err) => {
                    if (err) {
                        console.log('  Endpoint OUT: FAIL (' + err.message + ')');
                    } else {
                        console.log('  Endpoint OUT: OK');
                    }
                    resolve();
                });
            });
        }
    }
    console.log('\n  No OUT endpoints found, skipping endpoint test.');
}

async function run() {
    for (const cfg of controlConfigs) {
        await testControlTransfer(cfg);
        await new Promise(r => setTimeout(r, 300));
    }

    await testEndpointTransfer();

    // Reset device to clear STALL conditions
    console.log('\n=== Resetting device ===');
    try {
        device.reset();
        console.log('Device reset OK');
    } catch (e) {
        console.log('Device reset failed:', e.message);
        console.log('Trying to re-open...');
        try {
            device.close();
        } catch(e) {}
        await new Promise(r => setTimeout(r, 1000));
        try {
            device.open();
            const if2 = device.interfaces[0];
            if2.claim();
            console.log('Re-opened and re-claimed OK');
        } catch(e2) {
            console.log('Re-open failed:', e2.message);
        }
    }

    console.log('\n=== Done ===');
    console.log('\nPaste the full output above — it will help identify the correct protocol.');

    try { device.interfaces[0].release(() => { device.close(); process.exit(0); }); }
    catch(e) { process.exit(0); }
}

run().catch(e => { console.error('Error:', e); process.exit(1); });