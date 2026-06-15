const config = require('./config');
config.DMX_TEST_MODE = true;

const { DmxLighting } = require('./lighting/DmxLighting');

const lighting = new DmxLighting();

if (!lighting.available) {
    console.error('No DMX device found. Check connections and udev rules.');
    console.error('Expected uDMX device at VID 0x' + config.DMX_UDMX_VID.toString(16)
        + ' PID 0x' + config.DMX_UDMX_PID.toString(16));
    process.exit(1);
}

console.log('Cycling through all hues (10s per full cycle). Press Ctrl+C to stop.');
console.log('Channels: R=' + config.DMX_CHANNEL_R
    + ' G=' + config.DMX_CHANNEL_G
    + ' B=' + config.DMX_CHANNEL_B
    + (config.DMX_CHANNEL_MODE > 0 ? ' Mode=' + config.DMX_CHANNEL_MODE + '=' + config.DMX_MODE_VALUE : ''));

process.on('SIGINT', () => {
    console.log('\nShutting down...');
    lighting.shutdown();
    process.exit();
});

process.on('SIGTERM', () => {
    lighting.shutdown();
    process.exit();
});
