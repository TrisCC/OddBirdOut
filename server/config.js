const path = require('path');

module.exports = {
    PORT: 3000,
    TOTAL_ROUNDS: 12,
    ROUND_DURATION_MS: 10000,
    ROUND_RESOLVE_ANIMATION_MS: 3000,
    PHASE1_ROUNDS: 4,
    STARTING_EGGS: 0,
    RECONNECT_TIMEOUT_MS: 60000,
    AUTO_RESET_TIMEOUT_SECONDS: 120,
    AUTO_START_DELAY_SECONDS: 10,
    STATIC_DIR: path.join(__dirname, '..', 'OddBirdOut'),
    // Set to true to disable the round timer — rounds only advance once all players have acted
    DEBUG_MODE: true,

    // Polling intervals to keep clients and server state in sync
    LOBBY_POLL_INTERVAL_MS: 5000,
    GAME_POLL_INTERVAL_MS: 10000,
    POSTGAME_POLL_INTERVAL_MS: 30000,
    CLIENT_HEARTBEAT_INTERVAL_MS: 10000,

    // DMX lighting
    DMX_DEVICE: '/dev/ttyUSB0',
    DMX_DRIVER: 'enttec-open-usb-dmx',
    DMX_UDMX_VID: 0x16c0,
    DMX_UDMX_PID: 0x05dc,

    // Per-channel assignments (1-based DMX addresses)
    // Common PAR DMX modes:
    //   3-channel: R=1, G=2, B=3
    //   4-channel: DMX_CHANNEL_MODE=1,DMX_MODE_VALUE=varies, R=2, G=3, B=4
    //   6-channel: R=1, G=2, B=3, then strobe/mode/speed on 4-6
    DMX_CHANNEL_R: 1,
    DMX_CHANNEL_G: 2,
    DMX_CHANNEL_B: 3,

    // Static mode channel — sent once on startup to lock fixture into DMX mode
    // Set to 0 to disable. For 4-channel PARs, this is usually channel 1 (set to 255 for full brightness)
    DMX_CHANNEL_MODE: 0,
    DMX_MODE_VALUE: 0,

    // Set to true to ignore game events and cycle through all hues (color test)
    DMX_TEST_MODE: false,
};
