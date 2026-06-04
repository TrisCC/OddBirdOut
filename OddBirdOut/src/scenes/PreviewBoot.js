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

        _fire(event, data) {
            if (!callbacks[event]) return;
            for (const cb of callbacks[event]) cb(data);
        },
    };
}

function getMockGameEndData(playerId) {
    return {
        trueState: {
            finalScores: { A: 5, B: 8, C: 3 },
            alive: { A: true, B: true, C: false },
        },
        revelation: {
            message: 'The system manipulated what every player saw.',
            trueFinalScores: { A: 5, B: 8, C: 3 },
            trueAlive: { A: true, B: true, C: false },
            deaths: [
                { player: 'C', round: 10 },
            ],
        },
    };
}

export class PreviewBoot extends Phaser.Scene {

    constructor() {
        super('PreviewBoot');
    }

    preload() {
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
                    startingSeeds: 10,
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
                            { player: 'You', action: 'share', target: others[0], blocked: true },
                        ],
                        scores: { You: 5, [others[0]]: 8, [others[1]]: 3 },
                        yourScoreDelta: -2,
                        exclusionEvents: 3,
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
