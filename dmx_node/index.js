const dgram = require('dgram');
const config = require('./config');

let backend = null;

// Initialize the requested DMX backend
if (config.BACKEND === 'udmx') {
    try {
        const usb = require('usb');
        const device = usb.findByIds(config.UDMX_VID, config.UDMX_PID);
        if (!device) {
            console.error(`Error: uDMX device not found (VID=0x${config.UDMX_VID.toString(16)}, PID=0x${config.UDMX_PID.toString(16)})`);
            process.exit(1);
        }
        device.open();
        const iface = device.interfaces[0];
        if (iface.isKernelDriverActive()) iface.detachKernelDriver();
        iface.claim();

        backend = {
            write: (buffer) => {
                device.controlTransfer(0x40, 1, 1, 0, buffer, (err) => {
                    if (err) console.error('uDMX write error:', err.message);
                });
            },
            close: () => {
                try { iface.release(() => device.close()); } catch (e) {}
            }
        };
        console.log('uDMX backend initialized successfully');
    } catch (e) {
        console.error('Failed to initialize uDMX backend:', e.message);
        process.exit(1);
    }
} else if (config.BACKEND === 'serial') {
    try {
        const DMX = require('dmx');
        const dmx = new DMX();
        dmx.on('error', (err) => console.error('DMX universe error:', err));
        const universe = dmx.addUniverse('oddbirdout', config.SERIAL_DRIVER, config.SERIAL_DEVICE);
        universe.on('error', (err) => console.error('Serial DMX driver error:', err));

        backend = {
            write: (buffer) => {
                const updateObj = {};
                for (let i = 0; i < buffer.length; i++) {
                    updateObj[i + 1] = buffer[i];
                }
                universe.update(updateObj);
            },
            close: () => {}
        };
        console.log(`Serial DMX backend initialized on ${config.SERIAL_DEVICE} (${config.SERIAL_DRIVER})`);
    } catch (e) {
        console.error('Failed to initialize Serial DMX backend:', e.message);
        process.exit(1);
    }
} else if (config.BACKEND === 'mock') {
    let lastLogTime = 0;
    backend = {
        write: (buffer) => {
            const now = Date.now();
            if (now - lastLogTime > 2000) { // Rate limit logs to every 2 seconds
                console.log(`[MOCK DMX] Received ${buffer.length} bytes. Ch1-6: [${Array.from(buffer.slice(0, 6)).join(', ')}]`);
                lastLogTime = now;
            }
        },
        close: () => {
            console.log('[MOCK DMX] Closed');
        }
    };
    console.log('Mock DMX backend initialized (dry run mode)');
} else {
    console.error(`Error: Unknown backend "${config.BACKEND}" in config.js`);
    process.exit(1);
}

// Start UDP Server
const server = dgram.createSocket('udp4');

server.on('message', (msg) => {
    let buf = msg;
    if (msg.length !== 512) {
        if (msg.length < 512) {
            buf = Buffer.alloc(512, 0);
            msg.copy(buf);
        } else {
            buf = msg.slice(0, 512);
        }
    }
    backend.write(buf);
});

server.on('listening', () => {
    const address = server.address();
    console.log(`DMX Network Receiver listening on UDP port ${address.port}`);
});

server.on('error', (err) => {
    console.error(`UDP Server error:\n${err.stack}`);
    server.close();
});

server.bind(config.PORT);

// Handle clean shutdown
function shutdown() {
    console.log('\nShutting down DMX Network Receiver...');
    server.close();
    if (backend && backend.close) {
        backend.close();
    }
    process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
