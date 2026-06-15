const path = require('path');

module.exports = {
    PORT: 3000,
    TOTAL_ROUNDS: 12,
    ROUND_DURATION_MS: 10000,
    ROUND_RESOLVE_ANIMATION_MS: 3000,
    PHASE1_ROUNDS: 4,
    STARTING_SEEDS: 10,
    SEEDS_PER_ROUND_DRAIN: 1,
    RECONNECT_TIMEOUT_MS: 60000,
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
    DMX_START_CHANNEL: 1,
    DMX_UDMX_VID: 0x16c0,
    DMX_UDMX_PID: 0x05dc,

    // Per-channel assignments (1-based DMX addresses)
    DMX_CHANNEL_R: 1,
    DMX_CHANNEL_G: 2,
    DMX_CHANNEL_B: 3,

    // Static mode channel — sent once on startup to lock fixture into DMX mode
    // Set to 0 to disable (no mode channel)
    DMX_CHANNEL_MODE: 0,
    DMX_MODE_VALUE: 0,

    // Set to true to ignore game events and cycle through all hues (color test)
    DMX_TEST_MODE: false,
};
