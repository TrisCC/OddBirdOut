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
    console.error('   Hint: check udev rules and permissions on /dev/bus/usb/001/');
    process.exit(1);
}

// 5. Get interface info
console.log('\n5. Interface info:');
const interfaces = device.interfaces;
console.log('   Number of interfaces: ' + interfaces.length);
for (let i = 0; i < interfaces.length; i++) {
    const iface = interfaces[i];
    console.log('   Interface ' + i + ':');
    console.log('     interfaceNumber: ' + iface.interfaceNumber);
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

// 7. Try sending DMX values
console.log('\n7. Sending test DMX values to channels R=' + config.DMX_CHANNEL_R + ' G=' + config.DMX_CHANNEL_G + ' B=' + config.DMX_CHANNEL_B + '...');

function setChannel(channel, value) {
    return new Promise((resolve, reject) => {
        device.controlTransfer(0x40, 2, channel, value, Buffer.alloc(0), (err) => {
            if (err) reject(err);
            else resolve();
        });
    });
}

async function runTest() {
    // Test: set all channels to 0 (blackout)
    try {
        await setChannel(config.DMX_CHANNEL_R, 0);
        await setChannel(config.DMX_CHANNEL_G, 0);
        await setChannel(config.DMX_CHANNEL_B, 0);
        console.log('   Blackout sent');
    } catch (e) {
        console.error('   FAIL: blackout controlTransfer error:', e.message);
    }

    await sleep(500);

    // Test: set R channel to 255 (should turn red if PAR is on correct DMX address)
    try {
        await setChannel(config.DMX_CHANNEL_R, 255);
        await setChannel(config.DMX_CHANNEL_G, 0);
        await setChannel(config.DMX_CHANNEL_B, 0);
        console.log('   RED sent (R=255, G=0, B=0) — is your PAR showing red?');
    } catch (e) {
        console.error('   FAIL: red controlTransfer error:', e.message);
    }

    await sleep(2000);

    // Test: set all to 255 (white if RGBW or bright if RGB)
    try {
        await setChannel(config.DMX_CHANNEL_R, 255);
        await setChannel(config.DMX_CHANNEL_G, 255);
        await setChannel(config.DMX_CHANNEL_B, 255);
        console.log('   WHITE sent (R=255, G=255, B=255)');
    } catch (e) {
        console.error('   FAIL: white controlTransfer error:', e.message);
    }

    await sleep(2000);

    // Test: mode channel (if configured)
    if (config.DMX_CHANNEL_MODE > 0) {
        try {
            await setChannel(config.DMX_CHANNEL_MODE, config.DMX_MODE_VALUE);
            console.log('   Mode channel ' + config.DMX_CHANNEL_MODE + ' set to ' + config.DMX_MODE_VALUE);
        } catch (e) {
            console.error('   FAIL: mode channel controlTransfer error:', e.message);
        }
    } else {
        console.log('   Mode channel not configured (DMX_CHANNEL_MODE=0)');
    }

    // Blackout
    await sleep(1000);
    try {
        await setChannel(config.DMX_CHANNEL_R, 0);
        await setChannel(config.DMX_CHANNEL_G, 0);
        await setChannel(config.DMX_CHANNEL_B, 0);
        console.log('   Blackout sent');
    } catch (e) {}

    console.log('\n=== Diagnostic complete ===');
    console.log('\nTips if PAR did not respond:');
    console.log('  - Check PAR DMX address matches channels ' + config.DMX_CHANNEL_R + '/' + config.DMX_CHANNEL_G + '/' + config.DMX_CHANNEL_B);
    console.log('  - Check DMX cable is connected from uDMX adapter to PAR');
    console.log('  - Try setting DMX_CHANNEL_MODE to the mode channel and DMX_MODE_VALUE to the RGB mode value');
    console.log('  - Some PARs need channel 1 set to a specific value (e.g. 0 or 255) for DMX control');

    // Release
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