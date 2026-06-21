import { addCreditsButton } from '../CreditsOverlay.js';

const PLAYER_COLORS = {
    A: '#7CB87C',
    B: '#7CB0D8',
    C: '#D8A87C',
};

const SIDE_ORDER = {
    A: ['C', 'B'],
    B: ['A', 'C'],
    C: ['B', 'A'],
};

function countShares(trueActions, fromPlayer, toPlayer) {
    let count = 0;
    for (const r of trueActions) {
        for (const act of r.actions) {
            if (act.player === fromPlayer && act.action === 'share' && act.target === toPlayer) {
                count++;
            }
        }
    }
    return count;
}

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
                this.scene.start('Lobby', { socketManager: this.socketManager });
            });
            this.socketManager.on('connected', () => {
                this.socketManager.requestLobbyState();
            });
        }

        this.time.delayedCall(800, () => {
            this.showMessage(w / 2, 70, 'The Truth', '28px', '#FFD700');
        });

        if (this.gameEndData) {
            this.time.delayedCall(2000, () => {
                this.showScoresAndDeaths(w, h);
            });

            this.time.delayedCall(4000, () => {
                const egg = this.add.image(w / 2, 540, 'egg');
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
                this.add.text(w / 2, 600, 'You were all manipulated.', {
                    fontFamily: '"Press Start 2P"',
                    fontSize: '14px',
                    color: '#FFFFFF',
                }).setOrigin(0.5);

                this.add.text(w / 2, 635, 'Nobody was truly excluded.', {
                    fontFamily: '"Press Start 2P"',
                    fontSize: '14px',
                    color: '#FFFFFF',
                }).setOrigin(0.5);
            });

            this.time.delayedCall(7500, () => {
                this.add.text(w / 2, 690, 'The operator will restart the game shortly.', {
                    fontFamily: '"Press Start 2P"',
                    fontSize: '10px',
                    color: '#888888',
                }).setOrigin(0.5);
            });
        }

        addCreditsButton(this);
    }

    showScoresAndDeaths(w, h) {
        const trueState = this.gameEndData.trueState;
        const revelation = this.gameEndData.revelation;
        const myId = this.socketManager.playerId;

        if (!trueState || !trueState.finalScores) return;

        const scores = trueState.finalScores;
        const trueActions = (revelation && revelation.trueActions) || [];

        this.add.text(w / 2, 145, 'Final Scores', {
            fontFamily: '"Press Start 2P"',
            fontSize: '14px',
            color: '#FFFFFF',
        }).setOrigin(0.5);

        const sides = SIDE_ORDER[myId];
        const positions = {
            [sides[0]]: { x: w * 0.25, y: h * 0.35 },
            [sides[1]]: { x: w * 0.75, y: h * 0.35 },
            [myId]:     { x: w * 0.5,  y: h * 0.60 },
        };

        const pts = Object.values(positions);
        const gfx = this.add.graphics();
        gfx.lineStyle(2, 0x555555, 0.5);
        gfx.lineBetween(pts[0].x, pts[0].y, pts[1].x, pts[1].y);
        gfx.lineBetween(pts[1].x, pts[1].y, pts[2].x, pts[2].y);
        gfx.lineBetween(pts[2].x, pts[2].y, pts[0].x, pts[0].y);

        for (const playerId of ['A', 'B', 'C']) {
            const score = scores[playerId];
            if (score === undefined) continue;

            const pos = positions[playerId];
            const isSelf = playerId === myId;
            const label = isSelf ? `You (${playerId})` : `Player ${playerId}`;
            const color = PLAYER_COLORS[playerId];

            const otherTwo = ['A', 'B', 'C'].filter(p => p !== playerId);
            let statY = pos.y - 58;
            for (const target of otherTwo) {
                const count = countShares(trueActions, playerId, target);
                const targetLabel = target === myId ? 'You' : `Player ${target}`;
                this.add.text(pos.x, statY, `Shared w/ ${targetLabel}: ${count}`, {
                    fontFamily: '"Press Start 2P"',
                    fontSize: '9px',
                    color: '#CCCCCC',
                }).setOrigin(0.5);
                statY += 16;
            }

            this.add.text(pos.x, pos.y, label, {
                fontFamily: '"Press Start 2P"',
                fontSize: '12px',
                color,
            }).setOrigin(0.5);

            this.add.text(pos.x, pos.y + 24, `${score}`, {
                fontFamily: '"Press Start 2P"',
                fontSize: '22px',
                color: '#E0E0E0',
            }).setOrigin(0.5);
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
