import { addCreditsButton } from '../CreditsOverlay.js';

const SIDE_ORDER = {
    A: ['C', 'B'],
    B: ['A', 'C'],
    C: ['B', 'A'],
};

export class GameOver extends Phaser.Scene {

    constructor() {
        super('GameOver');
    }

    init(data) {
        this.gameEndData = data;
        this.socketManager = data.socketManager;
        this.colorChoices = data.colorChoices || {};
    }

    create() {
        const w = this.scale.width;
        const h = this.scale.height;

        this.add.image(w / 2, h / 2, 'bg_night').setDisplaySize(w, h);

        if (this.socketManager) {
            this.socketManager.on('gameAborted', () => {
                this.scene.start('Lobby', { socketManager: this.socketManager });
            });
            this.socketManager.on('connected', () => {
                this.socketManager.requestLobbyState();
            });
            this.socketManager.on('resetCountdown', (data) => {
                this.updateResetCountdown(data.seconds);
            });
        }

        this.resetCountdownText = this.add.text(w / 2, h - 24, '', {
            fontFamily: '"Press Start 2P"',
            fontSize: '14px',
            color: '#FF9800',
        }).setOrigin(0.5);

        this.add.text(w / 2, 48, 'Were you left out?', {
            fontFamily: '"Press Start 2P"',
            fontSize: '40px',
            color: '#FFD700',
        }).setOrigin(0.5);

        this.showFakeResults(w, h);
        this.createRevealButton(w, h);

        addCreditsButton(this);
    }

    showFakeResults(w, h) {
        const playerId = this.socketManager.playerId;
        const others = SIDE_ORDER[playerId];
        const playerOrder = [others[0], playerId, others[1]];

        const whatYouWereShown = this.gameEndData.whatYouWereShown || [];
        const lastIllusion = whatYouWereShown[whatYouWereShown.length - 1];
        const prevIllusion = whatYouWereShown[whatYouWereShown.length - 2] || lastIllusion;

        const fakeScores = {
            ...(lastIllusion ? lastIllusion.scores : {}),
            ...(prevIllusion ? { You: prevIllusion.scores.You } : {}),
        };

        const xPositions = [w * 0.22, w * 0.5, w * 0.78];
        const baseY = 380;

        for (let i = 0; i < 3; i++) {
            const id = playerOrder[i];
            const isSelf = id === playerId;
            const x = xPositions[i];
            const y = isSelf ? baseY + 20 : baseY;

            const colorKey = this.colorChoices[id] || 'red';
            const textureKey = isSelf
                ? `ostrich_${colorKey}_sand`
                : `ostrich_${colorKey}`;

            const sprite = this.add.sprite(x, y, textureKey, 0);
            sprite.setDisplaySize(130, 130);

            if (isSelf) {
                if (this.anims.exists(`sand_${colorKey}`)) {
                    sprite.play(`sand_${colorKey}`);
                }
            } else {
                if (this.anims.exists(`idle_${colorKey}`)) {
                    sprite.play(`idle_${colorKey}`);
                }
            }

            const label = isSelf ? 'You' : `Player ${id}`;
            this.add.text(x, y - 90, label, {
                fontFamily: '"Press Start 2P"',
                fontSize: '18px',
                color: isSelf ? '#FFD700' : '#CCCCCC',
            }).setOrigin(0.5);

            const scoreKey = isSelf ? 'You' : id;
            const score = fakeScores[scoreKey] ?? 0;

            this.add.text(x, y + 80, `${score}`, {
                fontFamily: '"Press Start 2P"',
                fontSize: '44px',
                color: '#FFD700',
            }).setOrigin(0.5);

            this.add.text(x, y + 108, 'eggs', {
                fontFamily: '"Press Start 2P"',
                fontSize: '18px',
                color: '#000000',
            }).setOrigin(0.5);
        }
    }

    createRevealButton(w, h) {
        const btnW = 480;
        const btnH = 80;
        const btnX = w / 2;
        const btnY = 620;
        const radius = 16;

        const bg = this.add.graphics();
        bg.fillStyle(0x2E7D32);
        bg.fillRoundedRect(btnX - btnW / 2, btnY - btnH / 2, btnW, btnH, radius);
        bg.fillStyle(0x000000, 0.12);
        bg.fillRoundedRect(btnX - btnW / 2 + 4, btnY - btnH / 2 + 4,
            btnW - 8, btnH / 2 - 4, { tl: 12, tr: 12, bl: 0, br: 0 });

        const btnText = this.add.text(btnX, btnY, 'What went wrong?', {
            fontFamily: '"Press Start 2P"',
            fontSize: '20px',
            color: '#FFFFFF',
        }).setOrigin(0.5);

        const hitZone = this.add.zone(btnX, btnY, btnW, btnH)
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
            this.scene.start('Reveal', {
                ...this.gameEndData,
                socketManager: this.socketManager,
                colorChoices: this.colorChoices,
            });
        });
    }

    updateResetCountdown(seconds) {
        if (!this.resetCountdownText) return;
        if (seconds > 0) {
            this.resetCountdownText.setText(`Returning to lobby in ${seconds}s...`);
        } else {
            this.resetCountdownText.setText('');
        }
    }
}
