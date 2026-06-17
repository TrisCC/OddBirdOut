import { addCreditsButton } from '../CreditsOverlay.js';

const PLAYER_COLORS = {
    A: '#7CB87C',
    B: '#7CB0D8',
    C: '#D8A87C',
};

const OTHER_PLAYERS = {
    A: ['B', 'C'],
    B: ['A', 'C'],
    C: ['A', 'B'],
};

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
            const subtitle = this.add.text(w / 2, 150, 'Final Egg Count', {
                fontFamily: '"Press Start 2P"',
                fontSize: '18px',
                color: '#FFFFFF',
            }).setOrigin(0.5).setAlpha(0);

            this.tweens.add({
                targets: subtitle,
                alpha: 1,
                duration: 800,
                ease: 'Power2',
            });
        });

        this.time.delayedCall(1800, () => {
            this.showFakeScores(w, h);
        });

        this.time.delayedCall(3400, () => {
            this.createRevealButton(w);
        });

        addCreditsButton(this);
    }

    showFakeScores(w, h) {
        const playerId = this.socketManager.playerId;
        const others = OTHER_PLAYERS[playerId];

        const whatYouWereShown = this.gameEndData.whatYouWereShown || [];
        const lastIllusion = whatYouWereShown[whatYouWereShown.length - 1];
        const prevIllusion = whatYouWereShown[whatYouWereShown.length - 2] || lastIllusion;

        // The final round's illusion dramatically zeroes out "You" for the
        // in-game reveal animation. Game Over should show the fake score the
        // player believed they had before that crash, not the post-crash 0.
        const fakeScores = {
            ...(lastIllusion ? lastIllusion.scores : {}),
            ...(prevIllusion ? { You: prevIllusion.scores.You } : {}),
        };

        const rows = [
            { id: playerId, label: `You (${playerId})`, key: 'You' },
            { id: others[0], label: `Player ${others[0]}`, key: others[0] },
            { id: others[1], label: `Player ${others[1]}`, key: others[1] },
        ];

        let y = h * 0.32;
        for (const row of rows) {
            const score = fakeScores[row.key] ?? 0;
            const color = PLAYER_COLORS[row.id];

            const group = [];

            const label = this.add.text(w / 2 - 60, y, row.label, {
                fontFamily: '"Press Start 2P"',
                fontSize: '14px',
                color,
            }).setOrigin(1, 0.5).setAlpha(0);

            const eggIcon = this.add.image(w / 2 - 20, y, 'egg').setScale(1.1).setAlpha(0);

            const scoreText = this.add.text(w / 2 + 10, y, `${score}`, {
                fontFamily: '"Press Start 2P"',
                fontSize: '20px',
                color: '#FFD700',
            }).setOrigin(0, 0.5).setAlpha(0);

            group.push(label, eggIcon, scoreText);

            this.tweens.add({
                targets: group,
                alpha: 1,
                duration: 600,
                ease: 'Power2',
            });

            y += 80;
        }
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
