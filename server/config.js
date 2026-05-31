const path = require('path');

module.exports = {
    PORT: 3000,
    TOTAL_ROUNDS: 12,
    ROUND_DURATION_MS: 10000,
    ROUND_RESOLVE_ANIMATION_MS: 3000,
    PHASE1_ROUNDS: 4,
    STARTING_SEEDS: 10,
    RECONNECT_TIMEOUT_MS: 60000,
    STATIC_DIR: path.join(__dirname, '..', 'OddBirdOut'),
    // Set to true to disable the round timer — rounds only advance once all players have acted
    DEBUG_MODE: true,
};
