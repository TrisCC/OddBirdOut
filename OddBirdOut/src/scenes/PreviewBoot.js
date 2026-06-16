import { generateAllTextures } from '../PlaceholderAssets.js';

function createMockSocket(playerId) {
    const callbacks = {};

    return {
        playerId,

        on(event, cb) {
            if (!callbacks[event]) callbacks[event] = [];
            callbacks[event].push(cb);
        },

        off(event, cb) {
            if (!callbacks[event]) return;
            callbacks[event] = callbacks[event].filter(c => c !== cb);
        },

        emitPlayerReady() {},

        emitPlayerAction() {},

        requestLobbyState() {},

        _fire(event, data) {
            if (!callbacks[event]) return;
            for (const cb of callbacks[event]) cb(data);
        },
    };
}

const OTHER_PLAYERS = {
    A: ['B', 'C'],
    B: ['A', 'C'],
    C: ['A', 'B'],
};

function getMockTrueActions() {
    const rounds = [];
    for (let i = 1; i <= 12; i++) {
        const actions = i % 3 === 0
            ? [
                { player: 'A', action: 'share', target: 'B' },
                { player: 'B', action: 'share', target: 'C' },
                { player: 'C', action: 'share', target: 'A' },
            ]
            : [
                { player: 'A', action: 'share', target: 'B' },
                { player: 'B', action: 'share', target: 'A' },
                { player: 'C', action: 'share', target: 'A' },
            ];
        rounds.push({ round: i, actions });
    }
    return rounds;
}

function getMockWhatYouWereShown(playerId) {
    const others = OTHER_PLAYERS[playerId];
    const rounds = [];
    for (let i = 5; i <= 12; i++) {
        rounds.push({
            round: i,
            actions: [
                { player: others[0], action: 'share', target: others[1] },
                { player: others[1], action: 'share', target: others[0] },
                { player: 'You', action: 'share', target: others[0] },
            ],
            scores: { You: 0, [others[0]]: i - 4, [others[1]]: i - 5 },
            illusionScoreAfter: 0,
        });
    }
    return rounds;
}

function getMockGameEndData(playerId) {
    return {
        trueState: {
            finalScores: { A: 5, B: 8, C: 3 },
            alive: { A: true, B: true, C: true },
        },
        revelation: {
            message: 'The system manipulated what every player saw.',
            trueFinalScores: { A: 5, B: 8, C: 3 },
            trueAlive: { A: true, B: true, C: true },
            deaths: [],
            trueActions: getMockTrueActions(),
        },
        whatYouWereShown: getMockWhatYouWereShown(playerId),
    };
}

export class PreviewBoot extends Phaser.Scene {

    constructor() {
        super('PreviewBoot');
    }

    preload() {
        this.load.image('bg_night', 'assets/bg_night.png');
        this.load.image('bg_day2night', 'assets/bg_day2night.png');
        this.load.image('bg_day', 'assets/bg_day.png');

        const FRAME = { frameWidth: 640, frameHeight: 640 };
        this.load.spritesheet('ostrich_blue',   'assets/ostrich blue.png',   FRAME);
        this.load.spritesheet('ostrich_cyan',   'assets/ostrich cyan.png',   FRAME);
        this.load.spritesheet('ostrich_green',  'assets/ostrich green.png',  FRAME);
        this.load.spritesheet('ostrich_orange', 'assets/ostrich orange.png', FRAME);
        this.load.spritesheet('ostrich_pink',   'assets/ostrich pink.png',   FRAME);
        this.load.spritesheet('ostrich_purple', 'assets/ostrich purple.png', FRAME);
        this.load.spritesheet('ostrich_red',    'assets/ostrich red.png',    FRAME);
        this.load.spritesheet('ostrich_yellow', 'assets/ostrich yellow.png', FRAME);

        const centerX = this.scale.width / 2;
        const centerY = this.scale.height / 2;

        this.add.text(centerX, centerY - 40, 'Loading Preview...', {
            fontFamily: '"Press Start 2P"',
            fontSize: '16px',
            color: '#FFD700',
        }).setOrigin(0.5);

        const progressBar = this.add.graphics();
        const BAR_W = 400;
        const BAR_H = 24;
        const barX = centerX - BAR_W / 2;
        const barY = centerY + 10;

        this.load.on('progress', (value) => {
            progressBar.clear();
            progressBar.fillStyle(0x333333);
            progressBar.fillRect(barX, barY, BAR_W, BAR_H);
            progressBar.fillStyle(0xFFD700);
            progressBar.fillRect(barX + 2, barY + 2, (BAR_W - 4) * value, BAR_H - 4);
        });

        this.load.on('complete', () => {
            progressBar.destroy();
        });
    }

    create() {
        generateAllTextures(this);

        for (const color of ['blue', 'cyan', 'green', 'orange', 'pink', 'purple', 'red', 'yellow']) {
            if (!this.anims.exists(`idle_${color}`)) {
                this.anims.create({
                    key: `idle_${color}`,
                    frames: this.anims.generateFrameNumbers(`ostrich_${color}`, { start: 0, end: 2 }),
                    frameRate: 4,
                    repeat: -1,
                });
            }
        }

        const params = new URLSearchParams(window.location.search);
        const preview = params.get('preview');
        const playerId = (params.get('player') || 'A').toUpperCase();

        const mock = createMockSocket(playerId);

        switch (preview) {
            case 'lobby': {
                this.scene.start('Lobby', { socketManager: mock });
                this.time.delayedCall(100, () => {
                    mock._fire('lobbyUpdate', {
                        connected: ['A', 'B', 'C'],
                        ready: 3,
                        total: 3,
                    });
                });
                break;
            }

            case 'game': {
                this.scene.start('Game', {
                    socketManager: mock,
                    playerId,
                    totalRounds: 12,
                    startingEggs: 0,
                });

                this.time.delayedCall(600, () => {
                    mock._fire('roundStart', {
                        round: 5,
                        phase: 'ostracism',
                        roundDurationMs: 0,
                        debugMode: true,
                    });
                });

                this.time.delayedCall(2200, () => {
                    const others = playerId === 'A' ? ['B', 'C']
                        : playerId === 'B' ? ['A', 'C'] : ['A', 'B'];

                    mock._fire('roundResult', {
                        round: 5,
                        phase: 'ostracism',
                        actions: [
                            { player: others[0], action: 'share', target: others[1] },
                            { player: others[1], action: 'share', target: others[0] },
                            { player: 'You', action: 'share', target: others[0] },
                        ],
                        scores: { You: 2, [others[0]]: 4, [others[1]]: 2 },
                        yourScoreDelta: 0,
                        exclusionEvents: 1,
                    });
                });
                break;
            }

            case 'reveal': {
                this.scene.start('Reveal', {
                    ...getMockGameEndData(playerId),
                    socketManager: mock,
                });
                break;
            }

            case 'gameover': {
                this.scene.start('GameOver', {
                    ...getMockGameEndData(playerId),
                    socketManager: mock,
                });
                break;
            }

            default: {
                this.scene.start('Lobby', { socketManager: mock });
                break;
            }
        }
    }
}
