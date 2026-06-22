import { addCreditsButton } from '../CreditsOverlay.js';

const SIDE_ORDER = {
    A: ['C', 'B'],
    B: ['A', 'C'],
    C: ['B', 'A'],
};

export class Reveal extends Phaser.Scene {

    constructor() {
        super('Reveal');
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

        this.add.text(w / 2, 80, 'We lied to you.', {
            fontFamily: '"Press Start 2P"',
            fontSize: '36px',
            color: '#FFD700',
        }).setOrigin(0.5);

        const whatYouWereShown = this.gameEndData.whatYouWereShown || [];
        const phase1LastRound = whatYouWereShown.length > 0 ? whatYouWereShown[0].round - 1 : 4;

        this.add.text(w / 2, 160, `After round ${phase1LastRound}, we made the other two\nplayers exclude you, regardless of their input.\nWe did the same to the others.`, {
            fontFamily: '"Press Start 2P"',
            fontSize: '14px',
            color: '#CCCCCC',
            stroke: '#000000',
            strokeThickness: 4,
            align: 'center',
            lineSpacing: 10,
        }).setOrigin(0.5);

        this.showTrueResults(w, h);

        addCreditsButton(this);
    }

    showTrueResults(w, h) {
        const playerId = this.socketManager.playerId;
        const others = SIDE_ORDER[playerId];
        const playerOrder = [others[0], playerId, others[1]];

        const trueState = this.gameEndData.trueState;
        const scores = trueState ? trueState.finalScores : {};

        const whatYouWereShown = this.gameEndData.whatYouWereShown || [];
        const lastIllusion = whatYouWereShown[whatYouWereShown.length - 1];
        const prevIllusion = whatYouWereShown[whatYouWereShown.length - 2] || lastIllusion;
        const fakeScores = {
            ...(lastIllusion ? lastIllusion.scores : {}),
            ...(prevIllusion ? { You: prevIllusion.scores.You } : {}),
        };

        const xPositions = [w * 0.22, w * 0.5, w * 0.78];
        const baseY = 390;

        for (let i = 0; i < 3; i++) {
            const id = playerOrder[i];
            const isSelf = id === playerId;
            const x = xPositions[i];
            const y = isSelf ? baseY + 20 : baseY;

            const colorKey = this.colorChoices[id] || 'red';
            const textureKey = `ostrich_${colorKey}_sand`;

            const sprite = this.add.sprite(x, y, textureKey, 0);
            sprite.setDisplaySize(130, 130);

            if (this.anims.exists(`sand_${colorKey}`)) {
                sprite.play(`sand_${colorKey}`);
            }

            const label = isSelf ? 'You' : `Player ${id}`;
            this.add.text(x, y - 90, label, {
                fontFamily: '"Press Start 2P"',
                fontSize: '18px',
                color: isSelf ? '#FFD700' : '#CCCCCC',
            }).setOrigin(0.5);

            const score = scores[id] ?? 0;

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

            const fakeScoreKey = isSelf ? 'You' : id;
            const fakeScore = fakeScores[fakeScoreKey] ?? 0;
            this.add.text(x, y + 132, `(shown: ${fakeScore})`, {
                fontFamily: '"Press Start 2P"',
                fontSize: '13px',
                color: '#000000',
            }).setOrigin(0.5).setAlpha(0.7);
        }
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
