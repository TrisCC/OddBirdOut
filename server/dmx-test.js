const usb = require('usb');

const VID = 0x16c0;
const PID = 0x05dc;

console.log('=== DMX Continuous Output Test ===\n');

const device = usb.findByIds(VID, PID);
if (!device) { console.error('uDMX device not found'); process.exit(1); }
device.open();
const iface = device.interfaces[0];
if (iface.isKernelDriverActive()) iface.detachKernelDriver();
iface.claim();
console.log('Device ready.\n');

function setChannelBuf(channel, value) {
    return new Promise((resolve) => {
        device.controlTransfer(0x40, 2, channel, 0, Buffer.from([value]), (err) => {
            resolve(!err);
        });
    });
}

function sendChannelsBuf(startChannel, values) {
    return new Promise((resolve) => {
        const buf = Buffer.from(values);
        device.controlTransfer(0x40, 1, startChannel, 0, buf, (err) => {
            resolve(!err);
        });
    });
}

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function sendRapidly(label, sendFn, durationMs) {
    const interval = 23; // ~44Hz = DMX512 refresh rate
    const iterations = Math.floor(durationMs / interval);
    let successes = 0;
    process.stdout.write('  ' + label + ' (' + iterations + ' frames)... ');
    for (let i = 0; i < iterations; i++) {
        const ok = await sendFn();
        if (ok) successes++;
        await sleep(interval);
    }
    console.log(successes + '/' + iterations + ' OK');
}

async function run() {
    console.log('This test sends DMX data at ~44Hz (DMX512 rate).');
    console.log('Watch your PAR for color changes.\n');

    // Test 1: Rapid RED using bReq=2 single-channel (channel 1 = 255)
    console.log('Test 1: RED on ch1 (bReq=2, single channel, rapid send)');
    await sendRapidly('RED ch1=255', async () => {
        return setChannelBuf(1, 255) && await setChannelBuf(2, 0) && await setChannelBuf(3, 0);
    }, 5000);

    // Blackout
    await sendRapidly('Blackout', async () => {
        return setChannelBuf(1, 0) && await setChannelBuf(2, 0) && await setChannelBuf(3, 0);
    }, 2000);

    // Test 2: Rapid RED using bReq=1 multi-channel (3 bytes starting at ch1)
    console.log('\nTest 2: RED on ch1 (bReq=1, 3-byte frame, rapid send)');
    await sendRapidly('RED ch1=255 (3-byte)', async () => {
        return sendChannelsBuf(1, [255, 0, 0]);
    }, 5000);

    // Blackout
    await sendRapidly('Blackout', async () => {
        return sendChannelsBuf(1, [0, 0, 0]);
    }, 2000);

    // Test 3: GREEN
    console.log('\nTest 3: GREEN');
    await sendRapidly('GREEN ch2=255', async () => {
        return sendChannelsBuf(1, [0, 255, 0]);
    }, 5000);

    // Test 4: BLUE
    console.log('\nTest 4: BLUE');
    await sendRapidly('BLUE ch3=255', async () => {
        return sendChannelsBuf(1, [0, 0, 255]);
    }, 5000);

    // Test 5: WHITE
    console.log('\nTest 5: WHITE (RGB all 255)');
    await sendRapidly('WHITE', async () => {
        return sendChannelsBuf(1, [255, 255, 255]);
    }, 5000);

    // Test 6: 4-channel mode (dimmer on ch1, RGB on ch2-4)
    console.log('\nTest 6: 4-channel mode (ch1=255 dimmer, ch2=R, ch3=G, ch4=B)');
    await sendRapidly('4ch RED', async () => {
        return sendChannelsBuf(1, [255, 255, 0, 0]);
    }, 4000);

    await sendRapidly('4ch GREEN', async () => {
        return sendChannelsBuf(1, [255, 0, 255, 0]);
    }, 4000);

    await sendRapidly('4ch BLUE', async () => {
        return sendChannelsBuf(1, [255, 0, 0, 255]);
    }, 4000);

    await sendRapidly('4ch WHITE', async () => {
        return sendChannelsBuf(1, [255, 255, 255, 255]);
    }, 4000);

    // Blackout
    await sendRapidly('Blackout', async () => {
        return sendChannelsBuf(1, [0, 0, 0]);
    }, 2000);

    console.log('\n=== Test complete ===');
    console.log('\nIf the PAR responded:');
    console.log('  - Note which test (3ch or 4ch) made it change color');
    console.log('  - If 4ch worked: set DMX_CHANNEL_MODE=1, DMX_MODE_VALUE=255, R=2, G=3, B=4');
    console.log('  - If 3ch worked: current config (R=1, G=2, B=3) is correct');
    console.log('\nIf nothing changed:');
    console.log('  - Check DMX cable (3-pin or 5-pin XLR)');
    console.log('  - Check PAR DMX start address');
    console.log('  - Check PAR mode (must be DMX, not auto/sound)');

    try { iface.release(() => { device.close(); process.exit(0); }); }
    catch(e) { process.exit(0); }
}

run().catch(e => { console.error(e); process.exit(1); });