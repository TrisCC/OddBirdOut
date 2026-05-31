export class Reveal extends Phaser.Scene {

    constructor() {
        super('Reveal');
    }

    init(data) {
        this.gameEndData = data;
        this.socketManager = data.socketManager;
    }

    create() {
        const w = this.scale.width;
        const h = this.scale.height;

        this.add.rectangle(w / 2, h / 2, w, h, 0x1A0F0A);

        if (this.socketManager) {
            this.socketManager.on('gameAborted', () => {
                this.scene.start('Boot');
            });
        }

        this.time.delayedCall(800, () => {
            this.showMessage(w / 2, 80, 'The Truth', '28px', '#FFD700');
        });

        if (this.gameEndData) {
            this.time.delayedCall(2000, () => {
                this.showScoresAndDeaths(w, h);
            });

            this.time.delayedCall(4000, () => {
                const egg = this.add.image(w / 2, 460, 'golden_egg');
                egg.setScale(0);
                this.tweens.add({
                    targets: egg,
                    scaleX: 3,
                    scaleY: 3,
                    alpha: 0,
                    duration: 1500,
                    ease: 'Back.easeIn',
                });
            });

            this.time.delayedCall(5500, () => {
                this.add.text(w / 2, 520, 'You were all manipulated.', {
                    fontFamily: '"Press Start 2P"',
                    fontSize: '14px',
                    color: '#FFFFFF',
                }).setOrigin(0.5);

                this.add.text(w / 2, 560, 'Nobody was truly excluded.', {
                    fontFamily: '"Press Start 2P"',
                    fontSize: '14px',
                    color: '#FFFFFF',
                }).setOrigin(0.5);
            });

            this.time.delayedCall(7500, () => {
                this.add.text(w / 2, 660, 'The operator will restart the game shortly.', {
                    fontFamily: '"Press Start 2P"',
                    fontSize: '10px',
                    color: '#888888',
                }).setOrigin(0.5);
            });
        }
    }

    showScoresAndDeaths(w, h) {
        const trueState = this.gameEndData.trueState;
        const revelation = this.gameEndData.revelation;
        let yOffset = 160;

        this.add.text(w / 2, yOffset, 'Final Scores', {
            fontFamily: '"Press Start 2P"',
            fontSize: '14px',
            color: '#FFFFFF',
        }).setOrigin(0.5);

        yOffset += 35;

        if (trueState && trueState.finalScores) {
            const scores = trueState.finalScores;
            const alive = trueState.alive || {};
            const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
            sorted.forEach(([player, score], i) => {
                const isDead = alive[player] === false;
                const isWinner = trueState.winner && trueState.winner.includes(player);
                let color = '#AAAAAA';
                if (isWinner) color = '#FFD700';
                if (isDead) color = '#F44336';

                let label = `Player ${player}: ${score} seeds`;
                if (isDead) label += ' (died)';
                if (isWinner) label += ' *';

                this.add.text(w / 2, yOffset + i * 30, label, {
                    fontFamily: '"Press Start 2P"',
                    fontSize: '12px',
                    color,
                }).setOrigin(0.5);
            });
        }

        yOffset += 100;

        if (revelation && revelation.deaths && revelation.deaths.length > 0) {
            this.add.text(w / 2, yOffset, 'The system hid these deaths:', {
                fontFamily: '"Press Start 2P"',
                fontSize: '10px',
                color: '#F44336',
            }).setOrigin(0.5);

            yOffset += 25;
            for (const death of revelation.deaths) {
                this.add.text(w / 2, yOffset,
                    `Player ${death.player} died in round ${death.round}`,
                    {
                        fontFamily: '"Press Start 2P"',
                        fontSize: '9px',
                        color: '#F44336',
                    }
                ).setOrigin(0.5);
                yOffset += 18;
            }
        }
    }

    showMessage(x, y, text, size, color) {
        const t = this.add.text(x, y, text, {
            fontFamily: '"Press Start 2P"',
            fontSize: size,
            color,
        }).setOrigin(0.5).setAlpha(0);

        this.tweens.add({
            targets: t,
            alpha: 1,
            y: y - 10,
            duration: 600,
            ease: 'Power2',
        });
    }
}
