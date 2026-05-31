export class Reveal extends Phaser.Scene {

    constructor() {
        super('Reveal');
    }

    init(data) {
        this.gameEndData = data;
    }

    create() {
        const w = this.scale.width;
        const h = this.scale.height;

        this.add.rectangle(w / 2, h / 2, w, h, 0x1A0F0A);

        this.time.delayedCall(800, () => {
            this.showMessage(w / 2, 120, 'The Truth', '28px', '#FFD700');
        });

        if (this.gameEndData && this.gameEndData.trueState) {
            const scores = this.gameEndData.trueState.finalScores;
            const winner = this.gameEndData.trueState.winner;

            this.time.delayedCall(2000, () => {
                this.add.text(w / 2, 200, 'Final Scores', {
                    fontFamily: '"Press Start 2P"',
                    fontSize: '16px',
                    color: '#FFFFFF',
                }).setOrigin(0.5);

                const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
                sorted.forEach(([player, score], i) => {
                    const color = winner && winner.includes(player) ? '#FFD700' : '#AAAAAA';
                    this.add.text(w / 2, 250 + i * 40, `Player ${player}: ${score} seeds`, {
                        fontFamily: '"Press Start 2P"',
                        fontSize: '14px',
                        color,
                    }).setOrigin(0.5);
                });
            });
        }

        this.time.delayedCall(3200, () => {
            const egg = this.add.image(w / 2, 480, 'golden_egg');
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

        this.time.delayedCall(4500, () => {
            this.add.text(w / 2, 540, 'You were all manipulated.', {
                fontFamily: '"Press Start 2P"',
                fontSize: '16px',
                color: '#FFFFFF',
            }).setOrigin(0.5);

            this.add.text(w / 2, 590, 'Nobody was truly excluded.', {
                fontFamily: '"Press Start 2P"',
                fontSize: '16px',
                color: '#FFFFFF',
            }).setOrigin(0.5);
        });

        this.time.delayedCall(7000, () => {
            this.add.text(w / 2, 660, 'The operator will restart the game shortly.', {
                fontFamily: '"Press Start 2P"',
                fontSize: '10px',
                color: '#888888',
            }).setOrigin(0.5);
        });
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
