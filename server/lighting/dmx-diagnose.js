const config = require('../config');

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
    console.error('   FAIL: uDMX device not found.');
    process.exit(1);
}
console.log('   OK: device found');

// 3. Open the device
console.log('\n3. Opening device...');
try {
    device.open();
    console.log('   OK: device opened');
} catch (e) {
    console.error('   FAIL: cannot open device:', e.message);
    process.exit(1);
}

// 4. Claim interface
console.log('\n4. Claiming interface 0...');
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

function sendFrame(buffer) {
    return new Promise((resolve, reject) => {
        device.controlTransfer(0x40, 1, 0, 0, buffer, (err) => {
            if (err) reject(err);
            else resolve();
        });
    });
}

function makeBuffer() {
    return Buffer.alloc(512, 0);
}

async function testConfig(label, channels) {
    const buf = makeBuffer();
    for (const [ch, val] of Object.entries(channels)) {
        buf[ch - 1] = val;
    }
    process.stdout.write('   ' + label + '... ');
    try {
        await sendFrame(buf);
        console.log('sent OK');
        return true;
    } catch (e) {
        console.log('FAIL: ' + e.message);
        return false;
    }
}

async function runTest() {
    const chR = config.DMX_CHANNEL_R;
    const chG = config.DMX_CHANNEL_G;
    const chB = config.DMX_CHANNEL_B;
    const chMode = config.DMX_CHANNEL_MODE;

    console.log('\n5. Testing DMX output (current config: R=ch' + chR + ' G=ch' + chG + ' B=ch' + chB + ' mode=ch' + (chMode || 'none') + ')');
    console.log('   Sending full 512-byte DMX frames. Watch your PAR for color changes.\n');

    // Blackout
    await testConfig('Blackout (all 0)', {});
    await new Promise(r => setTimeout(r, 1000));

    // Test 1: Red on current config
    const channels1 = {};
    if (chMode > 0) channels1[chMode] = config.DMX_MODE_VALUE;
    channels1[chR] = 255;
    await testConfig('RED (config channels)', channels1);
    await new Promise(r => setTimeout(r, 2000));

    // Blackout
    await testConfig('Blackout', {});
    await new Promise(r => setTimeout(r, 1000));

    // Test 2: Try common 4-channel mode (dimmer on ch1, RGB on ch2-4)
    if (chMode === 0) {
        console.log('\n   Trying 4-channel mode (ch1=255/dimmer, ch2=R, ch3=G, ch4=B)...');
        await testConfig('4ch: Dimmer=255, RED', { 1: 255, 2: 255, 3: 0, 4: 0 });
        await new Promise(r => setTimeout(r, 2000));

        await testConfig('4ch: Dimmer=255, GREEN', { 1: 255, 2: 0, 3: 255, 4: 0 });
        await new Promise(r => setTimeout(r, 2000));

        await testConfig('4ch: Dimmer=255, BLUE', { 1: 255, 2: 0, 3: 0, 4: 255 });
        await new Promise(r => setTimeout(r, 2000));

        await testConfig('4ch: Blackout', {});
    }

    // Test 3: Try all channels 1-6 to see what responds
    console.log('\n   Sweeping ch1-6 with value 255 one at a time...');
    for (let ch = 1; ch <= 6; ch++) {
        const channels = {};
        channels[ch] = 255;
        await testConfig('ch' + ch + '=255, rest=0', channels);
        await new Promise(r => setTimeout(r, 1000));
        await testConfig('  clear', {});
        await new Promise(r => setTimeout(r, 300));
    }

    // Final blackout
    await testConfig('Final blackout', {});

    console.log('\n=== Diagnostic complete ===');
    console.log('\nIf the PAR responded during the 4-channel or sweep tests:');
    console.log('  - Note which channels caused color changes');
    console.log('  - Update config.js accordingly:');
    console.log('    * If ch1=255 was needed first: DMX_CHANNEL_MODE=1, DMX_MODE_VALUE=255');
    console.log('    * If RGB was on ch2/3/4: DMX_CHANNEL_R=2, DMX_CHANNEL_G=3, DMX_CHANNEL_B=4');
    console.log('    * If RGB was on ch1/2/3: DMX_CHANNEL_R=1, DMX_CHANNEL_G=2, DMX_CHANNEL_B=3');
    console.log('\nIf nothing caused any change:');
    console.log('  - Check the DMX cable connection (XLR)');
    console.log('  - Check the PAR DMX address/starting channel (usually DIP switches)');
    console.log('  - Check the PAR is in DMX mode (not auto or sound mode)');

    try {
        device.interfaces[0].release(() => {
            device.close();
            process.exit(0);
        });
    } catch (e) {
        process.exit(0);
    }
}

runTest().catch(e => {
    console.error('Unexpected error:', e);
    process.exit(1);
});