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
        }

        this.add.text(w / 2, 36, 'Your exclusion was nothing personal', {
            fontFamily: '"Press Start 2P"',
            fontSize: '28px',
            color: '#FFD700',
        }).setOrigin(0.5);

        this.add.text(w / 2, 74, 'All of the player scores were manipulated', {
            fontFamily: '"Press Start 2P"',
            fontSize: '20px',
            color: '#CCCCCC',
        }).setOrigin(0.5);

        this.showTrueResults(w, h);

        this.add.text(w / 2, 615, 'Being left out in the digital world never feels good,\nbut you should never take it seriously.\nExclusion over digital platforms can have several reasons\nyou have no control of. In this context, \n the feeling of exclusion is called Cyber Ostracism. \nThe game takes inspiration from\nCyberball and Ostracism Online to transform it \ninto a physical experience.', {
            fontFamily: '"Press Start 2P"',
            fontSize: '14px',
            color: '#000000',
            align: 'center',
            lineSpacing: 14,
        }).setOrigin(0.5);

        addCreditsButton(this);
    }

    showTrueResults(w, h) {
        const playerId = this.socketManager.playerId;
        const others = SIDE_ORDER[playerId];
        const playerOrder = [others[0], playerId, others[1]];

        const trueState = this.gameEndData.trueState;
        const scores = trueState ? trueState.finalScores : {};

        const xPositions = [w * 0.22, w * 0.5, w * 0.78];
        const baseY = 350;

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
        }
    }
}
