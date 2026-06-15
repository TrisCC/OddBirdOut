const usb = require('usb');

console.log('=== DMX Protocol Probe v2 ===\n');

const VID = 0x16c0;
const PID = 0x05dc;

const device = usb.findByIds(VID, PID);
if (!device) { console.error('uDMX device not found'); process.exit(1); }

device.open();
const iface = device.interfaces[0];
if (iface.isKernelDriverActive()) iface.detachKernelDriver();
iface.claim();
console.log('Device opened and claimed.\n');

// Read current DMX state with bReq=3
async function readState(label, bmReqType, bReq, wValue, wIndex, bufLen) {
    return new Promise((resolve) => {
        device.controlTransfer(bmReqType, bReq, wValue, wIndex, bufLen, (err, data) => {
            if (err) {
                console.log('  READ ' + label + ': ' + err.message);
            } else {
                let hex = '';
                if (data && data.length > 0) {
                    hex = data.slice(0, 16).toString('hex').match(/../g).join(' ');
                    if (data.length > 16) hex += ' ...';
                }
                console.log('  READ ' + label + ': OK (' + (data ? data.length : 0) + ' bytes) ' + hex);
            }
            resolve();
        });
    });
}

// Write with various params
async function writeTest(label, bmReqType, bReq, wValue, wIndex, data) {
    return new Promise((resolve) => {
        device.controlTransfer(bmReqType, bReq, wValue, wIndex, data, (err) => {
            if (err) {
                console.log('  WRITE ' + label + ': ' + err.message);
            } else {
                console.log('  WRITE ' + label + ': OK');
            }
            resolve();
        });
    });
}

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function run() {
    // 1. Read DMX state with various params
    console.log('=== Reading DMX state ===');
    await readState('0xC0 bReq=3 wV=0 wI=0 len=512', 0xC0, 3, 0, 0, 512);
    await sleep(200);
    await readState('0xC0 bReq=3 wV=0 wI=0 len=32', 0xC0, 3, 0, 0, 32);
    await sleep(200);
    await readState('0xC0 bReq=3 wV=0 wI=0 len=8', 0xC0, 3, 0, 0, 8);
    await sleep(200);
    await readState('0xC0 bReq=3 wV=1 wI=0 len=512', 0xC0, 3, 1, 0, 512);
    await sleep(200);

    // 2. Try SET_SINGLE with swapped wValue/wIndex
    console.log('\n=== Writing - single channel (bReq=2) ===');

    // Standard: wValue=channel, wIndex=value, no data
    await writeTest('0x40 bReq=2 wV=1 wI=255 len=0', 0x40, 2, 1, 255, Buffer.alloc(0));
    await sleep(200);

    // Swapped: wValue=value, wIndex=channel
    await writeTest('0x40 bReq=2 wV=255 wI=1 len=0 (swapped)', 0x40, 2, 255, 1, Buffer.alloc(0));
    await sleep(200);

    // With small response buffer (wLength=1)
    await writeTest('0x40 bReq=2 wV=1 wI=255 len=1', 0x40, 2, 1, 255, Buffer.alloc(1));
    await sleep(200);

    // Interface recipient
    await writeTest('0x41 bReq=2 wV=1 wI=255 len=0', 0x41, 2, 1, 255, Buffer.alloc(0));
    await sleep(200);
    await writeTest('0x41 bReq=2 wV=255 wI=1 len=0', 0x41, 2, 255, 1, Buffer.alloc(0));
    await sleep(200);

    // 3. Try TX_CHANNELS with data payload (bReq=1)
    console.log('\n=== Writing - channel data (bReq=1) ===');
    const buf3 = Buffer.alloc(3, 0);
    buf3[0] = 255; // ch1=255 (red)

    await writeTest('0x40 bReq=1 wV=1 wI=0 len=3', 0x40, 1, 1, 0, buf3);
    await sleep(200);
    await writeTest('0x40 bReq=1 wV=0 wI=3 len=3', 0x40, 1, 0, 3, buf3);
    await sleep(200);

    const bufFull = Buffer.alloc(512, 0);
    bufFull[0] = 255;
    await writeTest('0x40 bReq=1 wV=0 wI=0 len=512', 0x40, 1, 0, 0, bufFull);
    await sleep(200);
    await writeTest('0x41 bReq=1 wV=0 wI=0 len=512', 0x41, 1, 0, 0, bufFull);
    await sleep(200);

    // 4. Try bReq=0 (some clones use this)
    console.log('\n=== Writing - bReq=0 ===');
    await writeTest('0x40 bReq=0 wV=1 wI=255 len=0', 0x40, 0, 1, 255, Buffer.alloc(0));
    await sleep(200);
    await writeTest('0x40 bReq=0 wV=0 wI=0 len=512', 0x40, 0, 0, 0, bufFull);
    await sleep(200);

    // 5. Read back after writes to see if anything stuck
    console.log('\n=== Reading back DMX state ===');
    await readState('0xC0 bReq=3 wV=0 wI=0 len=512 (after writes)', 0xC0, 3, 0, 0, 512);

    console.log('\n=== Done ===');
    console.log('\nIf any WRITE returned OK, that command works. Note which one.');
    console.log('If a READ returned data, the first few bytes show the current DMX state.');

    try { iface.release(() => { device.close(); process.exit(0); }); }
    catch(e) { process.exit(0); }
}

run().catch(e => { console.error('Error:', e); process.exit(1); });