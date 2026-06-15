const config = require('./config');

console.log('=== DMX USB Diagnostic ===\n');

// 1. Can the usb module load?
console.log('1. Loading usb module...');
let usb;
try {
    usb = require('usb');
    console.log('   OK: usb module loaded');
} catch (e) {
    console.error('   FAIL: cannot load usb module:', e.message);
    process.exit(1);
}

// 2. Can we find the device?
console.log('\n2. Searching for uDMX device (VID=0x' + config.DMX_UDMX_VID.toString(16) + ', PID=0x' + config.DMX_UDMX_PID.toString(16) + ')...');
const device = usb.findByIds(config.DMX_UDMX_VID, config.DMX_UDMX_PID);
if (!device) {
    console.error('   FAIL: uDMX device not found. Listing all USB devices:');
    usb.getDeviceList().forEach(d => {
        const desc = d.deviceDescriptor;
        console.error('   - VID=0x' + desc.idVendor.toString(16) + ' PID=0x' + desc.idProduct.toString(16));
    });
    process.exit(1);
}
console.log('   OK: device found');

// 3. Print device info
const desc = device.deviceDescriptor;
console.log('\n3. Device descriptor:');
console.log('   bDeviceClass:   ' + desc.bDeviceClass);
console.log('   idVendor:      0x' + desc.idVendor.toString(16));
console.log('   idProduct:     0x' + desc.idProduct.toString(16));
console.log('   iManufacturer:  ' + desc.iManufacturer);
console.log('   iProduct:       ' + desc.iProduct);
console.log('   bNumConfigurations: ' + desc.bNumConfigurations);

// 4. Open the device
console.log('\n4. Opening device...');
try {
    device.open();
    console.log('   OK: device opened');
} catch (e) {
    console.error('   FAIL: cannot open device:', e.message);
    console.error('   Hint: check udev rules and permissions on /dev/bus/usb/');
    process.exit(1);
}

// 5. Get interface info
console.log('\n5. Interface info:');
const interfaces = device.interfaces;
console.log('   Number of interfaces: ' + interfaces.length);
for (let i = 0; i < interfaces.length; i++) {
    const iface = interfaces[i];
    console.log('   Interface ' + i + ':');
    console.log('     isKernelDriverActive: ' + iface.isKernelDriverActive());
}

// 6. Claim interface
console.log('\n6. Claiming interface 0...');
try {
    const iface = device.interfaces[0];
    if (iface.isKernelDriverActive()) {
        console.log('   Detaching kernel driver...');
        iface.detachKernelDriver();
    }
    iface.claim();
    console.log('   OK: interface claimed');
} catch (e) {
    console.error('   FAIL: cannot claim interface:', e.message);
    process.exit(1);
}

// 7. Send DMX values using bRequest=1 (TX_CHANNELS) with full frame buffer
console.log('\n7. Sending test DMX values (bRequest=1, TX_CHANNELS)...');
console.log('   Channels: R=' + config.DMX_CHANNEL_R + ' G=' + config.DMX_CHANNEL_G + ' B=' + config.DMX_CHANNEL_B);

const chR = config.DMX_CHANNEL_R;
const chG = config.DMX_CHANNEL_G;
const chB = config.DMX_CHANNEL_B;
const chMode = config.DMX_CHANNEL_MODE;
const maxCh = Math.max(chR, chG, chB, chMode > 0 ? chMode : 0);

function sendFrame(buffer) {
    return new Promise((resolve, reject) => {
        device.controlTransfer(0x40, 1, 0, buffer.length, buffer, (err) => {
            if (err) reject(err);
            else resolve();
        });
    });
}

function makeFrame(maxChannel) {
    const buf = Buffer.alloc(maxChannel, 0);
    return buf;
}

async function runTest() {
    // Blackout
    try {
        const buf = makeFrame(maxCh);
        if (chMode > 0) buf[chMode - 1] = config.DMX_MODE_VALUE;
        await sendFrame(buf);
        console.log('   Blackout sent — lamp should be OFF');
    } catch (e) {
        console.error('   FAIL: blackout error:', e.message);
    }

    await sleep(1500);

    // Red
    try {
        const buf = makeFrame(maxCh);
        if (chMode > 0) buf[chMode - 1] = config.DMX_MODE_VALUE;
        buf[chR - 1] = 255;
        buf[chG - 1] = 0;
        buf[chB - 1] = 0;
        await sendFrame(buf);
        console.log('   RED sent (R=255) — lamp should show RED');
    } catch (e) {
        console.error('   FAIL: red error:', e.message);
    }

    await sleep(2000);

    // Green
    try {
        const buf = makeFrame(maxCh);
        if (chMode > 0) buf[chMode - 1] = config.DMX_MODE_VALUE;
        buf[chR - 1] = 0;
        buf[chG - 1] = 255;
        buf[chB - 1] = 0;
        await sendFrame(buf);
        console.log('   GREEN sent (G=255) — lamp should show GREEN');
    } catch (e) {
        console.error('   FAIL: green error:', e.message);
    }

    await sleep(2000);

    // Blue
    try {
        const buf = makeFrame(maxCh);
        if (chMode > 0) buf[chMode - 1] = config.DMX_MODE_VALUE;
        buf[chR - 1] = 0;
        buf[chG - 1] = 0;
        buf[chB - 1] = 255;
        await sendFrame(buf);
        console.log('   BLUE sent (B=255) — lamp should show BLUE');
    } catch (e) {
        console.error('   FAIL: blue error:', e.message);
    }

    await sleep(2000);

    // White (full RGB)
    try {
        const buf = makeFrame(maxCh);
        if (chMode > 0) buf[chMode - 1] = config.DMX_MODE_VALUE;
        buf[chR - 1] = 255;
        buf[chG - 1] = 255;
        buf[chB - 1] = 255;
        await sendFrame(buf);
        console.log('   WHITE sent (R=255, G=255, B=255) — lamp should show WHITE');
    } catch (e) {
        console.error('   FAIL: white error:', e.message);
    }

    await sleep(2000);

    // Blackout
    try {
        const buf = makeFrame(maxCh);
        if (chMode > 0) buf[chMode - 1] = config.DMX_MODE_VALUE;
        await sendFrame(buf);
        console.log('   Blackout sent — lamp should be OFF');
    } catch (e) {}

    console.log('\n=== Diagnostic complete ===');
    console.log('\nTips if PAR did not respond:');
    console.log('  - Check DMX cable is connected (XLR 3-pin or 5-pin)');
    console.log('  - Check PAR DMX start address matches channel config');
    console.log('  - Many PARs need a mode channel — set DMX_CHANNEL_MODE and DMX_MODE_VALUE');
    console.log('  - Try DMX_CHANNEL_MODE=1 DMX_MODE_VALUE=0 (common for RGB mode on channel 2/3/4)');

    try {
        device.interfaces[0].release(() => {
            device.close();
            process.exit(0);
        });
    } catch (e) {
        process.exit(0);
    }
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

runTest().catch(e => {
    console.error('Unexpected error:', e);
    process.exit(1);
});