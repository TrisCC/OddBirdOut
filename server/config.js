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
};
