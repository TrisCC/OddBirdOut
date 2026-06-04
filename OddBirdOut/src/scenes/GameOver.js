export class GameOver extends Phaser.Scene {

    constructor() {
        super('GameOver');
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

        const playerId = this.socketManager.playerId;
        const trueState = this.gameEndData.trueState;
        const score = trueState && trueState.finalScores
            ? trueState.finalScores[playerId]
            : '?';
        const isDead = trueState && trueState.alive
            ? trueState.alive[playerId] === false
            : true;

        const title = this.add.text(w / 2, 80, 'Game Over', {
            fontFamily: '"Press Start 2P"',
            fontSize: '40px',
            color: '#FFD700',
        }).setOrigin(0.5).setAlpha(0);

        this.tweens.add({
            targets: title,
            alpha: 1,
            duration: 1000,
            ease: 'Power2',
        });

        this.time.delayedCall(800, () => {
            const subtitle = this.add.text(w / 2, 140, 'You died', {
                fontFamily: '"Press Start 2P"',
                fontSize: '24px',
                color: '#F44336',
            }).setOrigin(0.5).setAlpha(0);

            this.tweens.add({
                targets: subtitle,
                alpha: 1,
                duration: 800,
                ease: 'Power2',
            });
        });

        this.time.delayedCall(1600, () => {
            const seedIcon = this.add.image(w / 2 - 30, 190, 'seed').setScale(1.2).setAlpha(0);
            const seedText = this.add.text(w / 2 + 10, 190, `${score} seeds`, {
                fontFamily: '"Press Start 2P"',
                fontSize: '16px',
                color: '#FFD700',
            }).setOrigin(0, 0.5).setAlpha(0);

            this.tweens.add({
                targets: [seedIcon, seedText],
                alpha: 1,
                duration: 600,
                ease: 'Power2',
            });
        });

        this.time.delayedCall(2200, () => {
            const ostrich = this.add.image(w / 2, 340, 'ostrich_dead').setScale(2.5).setAlpha(0);

            this.tweens.add({
                targets: ostrich,
                alpha: 1,
                scaleX: 2.2,
                scaleY: 2.2,
                duration: 800,
                ease: 'Back.easeOut',
            });
        });

        this.time.delayedCall(3200, () => {
            const hint = this.add.text(w / 2, 490, 'But were you really excluded by the others?', {
                fontFamily: '"Press Start 2P"',
                fontSize: '11px',
                color: '#CCCCCC',
                align: 'center',
                wordWrap: { width: w - 80 },
            }).setOrigin(0.5).setAlpha(0);

            this.tweens.add({
                targets: hint,
                alpha: 1,
                duration: 800,
                ease: 'Power2',
            });
        });

        this.time.delayedCall(4200, () => {
            this.createRevealButton(w);
        });
    }

    createRevealButton(w) {
        const btnY = 600;
        const btnW = 320;
        const btnH = 64;

        const bg = this.add.graphics();
        bg.fillStyle(0x6A1B9A);
        bg.fillRoundedRect(w / 2 - btnW / 2, btnY - btnH / 2, btnW, btnH, 16);
        bg.fillStyle(0x000000, 0.15);
        bg.fillRoundedRect(w / 2 - btnW / 2 + 4, btnY - btnH / 2 + 4,
            btnW - 8, btnH / 2 - 4, { tl: 12, tr: 12, bl: 0, br: 0 });

        const btnText = this.add.text(w / 2, btnY, 'Reveal the Truth', {
            fontFamily: '"Press Start 2P"',
            fontSize: '14px',
            color: '#FFFFFF',
        }).setOrigin(0.5).setAlpha(0);

        const hitZone = this.add.zone(w / 2, btnY, btnW, btnH)
            .setInteractive({ useHandCursor: true });

        hitZone.on('pointerover', () => {
            btnText.setScale(1.05);
            hitZone.setScale(1.02);
        });

        hitZone.on('pointerout', () => {
            btnText.setScale(1.0);
            hitZone.setScale(1.0);
        });

        hitZone.on('pointerdown', () => {
            this.scene.start('Reveal', { ...this.gameEndData, socketManager: this.socketManager });
        });

        this.tweens.add({
            targets: btnText,
            alpha: 1,
            duration: 600,
            ease: 'Power2',
        });
    }
}
