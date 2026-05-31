const COLORS = {
    A: 0x4CAF50,
    B: 0x42A5F5,
    C: 0xFF9800,
};

const OTHER_PLAYERS = {
    A: ['B', 'C'],
    B: ['A', 'C'],
    C: ['A', 'B'],
};

export class Game extends Phaser.Scene {

    constructor() {
        super('Game');
    }

    init(data) {
        this.socketManager = data.socketManager;
        this.playerId = data.playerId;
        this.totalRounds = data.totalRounds;
        this.startingSeeds = data.startingSeeds || 10;
    }

    create() {
        const w = this.scale.width;
        const h = this.scale.height;

        this.add.rectangle(w / 2, h / 2, w, h, 0x2B1E10);

        this.add.rectangle(w / 2, 10, w, 4, 0x3D2B1A).setOrigin(0.5, 0);

        this.groundY = 490;
        this.add.rectangle(w / 2, this.groundY, w, 4, 0x5D4037);

        this.buildHUD();
        this.buildOstriches();
        this.buildActionButtons();
        this.buildTargetSelector();
        this.setupListeners();
        this.setupVignette();

        this.currentRound = 0;
        this.currentPhase = 'trust';
        this.submitted = false;
        this.seedSprites = [];
    }

    buildHUD() {
        this.roundText = this.add.text(20, 64, 'Round 0 / 12', {
            fontFamily: '"Press Start 2P"',
            fontSize: '24px',
            color: '#FFD700',
        });

        this.timerBarBg = this.add.rectangle(this.scale.width / 2, 18, this.scale.width - 40, 14, 0x333333);
        this.timerBarBg.setOrigin(0.5, 0);
        this.timerBar = this.add.rectangle(20, 18, 0, 14, 0x4CAF50);
        this.timerBar.setOrigin(0, 0);

        this.eggIcon = this.add.image(this.scale.width / 2, 78, 'golden_egg');
        this.eggIcon.setScale(1.2);

        this.eggProgressText = this.add.text(this.scale.width / 2, 100, '', {
            fontFamily: '"Press Start 2P"',
            fontSize: '9px',
            color: '#FFD700',
        }).setOrigin(0.5);

        this.statusText = this.add.text(this.scale.width / 2, 700, '', {
            fontFamily: '"Press Start 2P"',
            fontSize: '10px',
            color: '#888888',
        }).setOrigin(0.5);
    }

    buildOstriches() {
        const selfX = this.scale.width / 2;
        const selfY = 340;
        const sideX = [250, 1030];
        const sideY = 370;

        const others = OTHER_PLAYERS[this.playerId];
        const playerOrder = [others[0], this.playerId, others[1]];

        this.ostriches = {};
        this.seedCounts = {};

        const positions = [
            { x: sideX[0], y: sideY, id: playerOrder[0], scale: 1.0 },
            { x: selfX, y: selfY, id: playerOrder[1], scale: 1.3 },
            { x: sideX[1], y: sideY, id: playerOrder[2], scale: 1.0 },
        ];

        for (const pos of positions) {
            const id = pos.id;
            const isSelf = id === this.playerId;
            const textureKey = `ostrich_${id.toLowerCase()}`;

            const sprite = this.add.image(pos.x, pos.y, textureKey);
            sprite.setScale(pos.scale);
            this.ostriches[id] = sprite;

            const label = isSelf ? 'You' : `Player ${id}`;
            const labelColor = isSelf ? '#FFD700' : '#CCCCCC';

            this.add.text(pos.x, pos.y - 85, label, {
                fontFamily: '"Press Start 2P"',
                fontSize: '10px',
                color: labelColor,
            }).setOrigin(0.5);

            this.seedCounts[id] = this.add.text(pos.x, pos.y + 80, this.startingSeeds.toString(), {
                fontFamily: '"Press Start 2P"',
                fontSize: '20px',
                color: '#FFD700',
            }).setOrigin(0.5);

            this.add.image(pos.x, pos.y + 105, 'seed').setScale(0.8);
        }
    }

    buildActionButtons() {
        const w = this.scale.width;
        const by = 590;

        this.btnShare = this.createButton(w / 2 - 320, by, 'btn_share', 'Share', 'share', 0x4CAF50);
        this.btnPeck = this.createButton(w / 2, by, 'btn_peck', 'Peck', 'peck', 0xF44336);
        this.btnHide = this.createButton(w / 2 + 320, by, 'btn_hide', 'Hide', 'hide', 0x2196F3);

        this.actionButtons = [this.btnShare, this.btnPeck, this.btnHide];
    }

    createButton(x, y, texture, label, action, color) {
        const container = this.add.container(x, y);

        const bg = this.add.image(0, 0, texture);
        container.add(bg);

        const labelText = this.add.text(0, 0, label, {
            fontFamily: '"Press Start 2P"',
            fontSize: '13px',
            color: '#FFFFFF',
        }).setOrigin(0.5);
        container.add(labelText);

        bg.setInteractive({ useHandCursor: true });
        bg.on('pointerdown', () => this.onActionPress(action, container));
        bg.on('pointerover', () => { container.setScale(1.05); });
        bg.on('pointerout', () => { container.setScale(1.0); });

        container.action = action;
        container.bg = bg;
        container.label = labelText;

        return container;
    }

    buildTargetSelector() {
        this.targetContainer = this.add.container(0, 0);
        this.targetContainer.setVisible(false);

        const bg = this.add.rectangle(this.scale.width / 2, this.scale.height / 2,
            this.scale.width, this.scale.height, 0x000000, 0.5);
        this.targetContainer.add(bg);

        this.targetButtons = [];
        this.targetLabels = [];
    }

    showTargetSelector(action) {
        const others = OTHER_PLAYERS[this.playerId];
        const sideX = [250, 1030];

        this.targetContainer.removeAll(true);
        this.targetButtons = [];

        const bg = this.add.rectangle(this.scale.width / 2, this.scale.height / 2,
            this.scale.width, this.scale.height, 0x000000, 0.5);
        this.targetContainer.add(bg);

        for (let i = 0; i < 2; i++) {
            const id = others[i];
            const btn = this.add.image(sideX[i], 370, `btn_target_${id.toLowerCase()}`);
            btn.setInteractive({ useHandCursor: true });
            btn.on('pointerdown', () => {
                this.submitAction(action, id);
                this.targetContainer.setVisible(false);
            });
            this.targetContainer.add(btn);

            const lbl = this.add.text(sideX[i], 370, `Player ${id}`, {
                fontFamily: '"Press Start 2P"',
                fontSize: '12px',
                color: '#FFFFFF',
            }).setOrigin(0.5);
            this.targetContainer.add(lbl);
        }

        const cancelText = this.add.text(this.scale.width / 2, 650, 'Tap here to cancel', {
            fontFamily: '"Press Start 2P"',
            fontSize: '10px',
            color: '#888888',
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });
        cancelText.on('pointerdown', () => {
            this.targetContainer.setVisible(false);
        });
        this.targetContainer.add(cancelText);

        this.targetContainer.setVisible(true);
        this.targetContainer.setDepth(50);
    }

    onActionPress(action, container) {
        if (this.submitted) return;

        if (action === 'hide') {
            this.submitAction(action, null);
        } else {
            this.showTargetSelector(action);
        }
    }

    submitAction(action, target) {
        if (this.submitted) return;
        this.submitted = true;

        this.disableButtons();
        this.statusText.setText('Waiting...');

        this.socketManager.emitPlayerAction(action, target);
    }

    disableButtons() {
        for (const btn of this.actionButtons) {
            btn.bg.disableInteractive();
            btn.setAlpha(0.4);
        }
    }

    enableButtons() {
        for (const btn of this.actionButtons) {
            btn.bg.setInteractive({ useHandCursor: true });
            btn.setAlpha(1);
        }
    }

    setupListeners() {
        this.socketManager.on('roundStart', (data) => {
            this.currentRound = data.round;
            this.currentPhase = data.phase;
            this.submitted = false;

            this.roundText.setText(`Round ${data.round} / ${this.totalRounds}`);

            this.statusText.setText('');
            this.enableButtons();
            this.startTimer(data.roundDurationMs);
        });

        this.socketManager.on('roundResult', (data) => {
            this.tweens.killAll();
            this.timerBar.width = 0;
            this.statusText.setText('');

            this.updateScores(data.scores);

            this.playActionAnimations(data.actions, () => {
                this.updateVignetteAlpha();
            });
        });

        this.socketManager.on('gameEnd', (data) => {
            this.scene.start('Reveal', { ...data, socketManager: this.socketManager });
        });

        this.socketManager.on('gameAborted', (data) => {
            this.scene.start('Boot');
        });
    }

    startTimer(durationMs) {
        const barWidth = this.scale.width - 40;
        this.timerBar.width = barWidth;
        this.timerBar.fillColor = 0x4CAF50;

        this.tweens.add({
            targets: this.timerBar,
            width: 0,
            duration: durationMs,
            ease: 'Linear',
            onUpdate: (tween) => {
                const progress = tween.getValue();
                if (progress < barWidth * 0.25) {
                    this.timerBar.fillColor = 0xF44336;
                }
            },
            onComplete: () => {
                this.disableButtons();
                this.statusText.setText('Time\'s up!');
            },
        });
    }

    updateScores(scores) {
        for (const key of Object.keys(scores)) {
            const id = key === 'You' ? this.playerId : key;
            if (this.seedCounts[id]) {
                this.seedCounts[id].setText(scores[key].toString());
            }
        }
    }

    playActionAnimations(actions, onComplete) {
        const selfX = this.scale.width / 2;
        const selfY = 340;
        const others = OTHER_PLAYERS[this.playerId];
        const sideX = {
            [others[0]]: 250,
            [others[1]]: 1030,
        };
        sideX[this.playerId] = selfX;

        const sideY = {
            [others[0]]: 370,
            [others[1]]: 370,
            [this.playerId]: selfY,
        };

        let delay = 0;
        const ANIM_DURATION = 800;
        const STEP_DELAY = 1000;

        for (const act of actions) {
            const giverId = act.player === 'You' ? this.playerId : act.player;
            const targetId = act.target === 'You' ? this.playerId : (act.target || null);

            const giverSprite = this.ostriches[giverId];

            if (act.action === 'share') {
                const blocked = act.blocked === true;
                this.time.delayedCall(delay, () => {
                    this.playShareAnim(giverSprite, giverId, targetId, sideX, sideY, blocked);
                });

            } else if (act.action === 'peck') {
                const blocked = act.blocked === true;
                this.time.delayedCall(delay, () => {
                    this.playPeckAnim(giverSprite, giverId, targetId, sideX, sideY, blocked);
                });

            } else if (act.action === 'hide') {
                this.time.delayedCall(delay, () => {
                    this.playHideAnim(giverSprite);
                });
            }

            delay += STEP_DELAY;
        }

        this.time.delayedCall(delay + 500, onComplete);
    }

    playShareAnim(giverSprite, giverId, targetId, sideX, sideY, blocked) {
        if (!giverSprite || !targetId) return;

        const seed = this.add.image(sideX[giverId], sideY[giverId] - 20, 'seed');
        seed.setScale(0.6);

        const targetSprite = this.ostriches[targetId];

        if (targetSprite) {
            this.tweens.add({
                targets: seed,
                x: sideX[targetId],
                y: sideY[targetId] - 20,
                duration: 600,
                ease: 'Sine.easeIn',
                onComplete: () => {
                    if (!blocked && targetSprite !== giverSprite) {
                        this.tweens.add({
                            targets: targetSprite,
                            scaleX: targetSprite.scaleX * 1.1,
                            scaleY: targetSprite.scaleY * 1.1,
                            yoyo: true,
                            duration: 100,
                        });
                    }
                    seed.destroy();
                },
            });
        } else {
            this.time.delayedCall(600, () => seed.destroy());
        }

        this.tweens.add({
            targets: giverSprite,
            scaleX: giverSprite.scaleX * 0.9,
            scaleY: giverSprite.scaleY * 0.9,
            yoyo: true,
            duration: 100,
        });
    }

    playPeckAnim(giverSprite, giverId, targetId, sideX, sideY, blocked) {
        if (!giverSprite || !targetId) return;

        const targetSprite = this.ostriches[targetId];
        const originalX = giverSprite.x;
        const targetX = sideX[targetId];

        this.tweens.add({
            targets: giverSprite,
            x: targetX + (originalX < targetX ? -20 : 20),
            duration: 150,
            ease: 'Power2',
            yoyo: true,
            onYoyo: () => {
                if (!blocked && targetSprite && targetSprite !== giverSprite) {
                    this.tweens.add({
                        targets: targetSprite,
                        x: targetSprite.x + (originalX < targetX ? 10 : -10),
                        duration: 50,
                        yoyo: true,
                    });
                }
            },
        });
    }

    playHideAnim(giverSprite) {
        if (!giverSprite) return;
        this.tweens.add({
            targets: giverSprite,
            scaleY: giverSprite.scaleY * 0.5,
            duration: 200,
            yoyo: true,
            ease: 'Sine.easeInOut',
        });
    }

    updateVignetteAlpha() {
        if (this.currentPhase !== 'ostracism') {
            this.vignette.setAlpha(0);
            return;
        }
        const maxRounds = 8;
        const current = this.currentRound - 4;
        const alpha = Math.min(1, current / maxRounds) * 0.08;
        this.tweens.add({
            targets: this.vignette,
            alpha,
            duration: 500,
        });
    }

    setupVignette() {
        const w = this.scale.width;
        const h = this.scale.height;

        const vignetteGfx = this.add.graphics();
        vignetteGfx.setDepth(10);

        vignetteGfx.fillStyle(0x000000, 1);
        vignetteGfx.fillRect(0, 0, w, h);
        vignetteGfx.fillStyle(0x000000, 0);
        vignetteGfx.fillEllipse(w / 2, h / 2, w * 0.75, h * 0.75);

        const maskShape = this.make.graphics({ add: false });
        maskShape.fillStyle(0xffffff);
        maskShape.fillEllipse(w / 2, h / 2, w * 0.75, h * 0.75);

        const mask = maskShape.createGeometryMask();
        vignetteGfx.setMask(mask);
        vignetteGfx.setAlpha(0);

        this.vignette = vignetteGfx;
    }
}
