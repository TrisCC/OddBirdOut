const COLORS = {
    A: 0x4CAF50,
    B: 0x42A5F5,
    C: 0xFF9800,
};

// [left, right] from each player's physical perspective in the installation
const SIDE_ORDER = {
    A: ['C', 'B'],
    B: ['A', 'C'],
    C: ['B', 'A'],
};

export class Game extends Phaser.Scene {

    constructor() {
        super('Game');
    }

    init(data) {
        this.socketManager = data.socketManager;
        this.playerId = data.playerId;
        this.totalRounds = data.totalRounds;
        this.startingEggs = data.startingEggs ?? 0;
    }

    create() {
        const w = this.scale.width;
        const h = this.scale.height;

        this.bg = this.add.image(w / 2, h / 2, 'bg_night').setDisplaySize(w, h).setDepth(-2);
        this.bgOverlay = this.add.image(w / 2, h / 2, 'bg_night').setDisplaySize(w, h).setDepth(-1).setAlpha(0);

        this.groundY = 490;

        this.buildHUD();
        this.buildOstriches();
        this.buildActionButtons();
        this.setupListeners();
        this.setupVignette();

        this.currentRound = 0;
        this.currentPhase = 'trust';
        this.submitted = false;
        this.eggSprites = [];
        this.currentScores = { A: this.startingEggs, B: this.startingEggs, C: this.startingEggs };

        // Fade from lobby night to day as soon as the game scene loads.
        // animating=true blocks roundStart from being processed until the fade completes.
        this.animating = true;
        this.doSunriseTransition(() => {
            this.animating = false;
            this.processEventQueue();
        });
    }

    buildHUD() {
        this.roundText = this.add.text(20, 64, 'Round 0 / 12', {
            fontFamily: '"Press Start 2P"',
            fontSize: '24px',
            color: '#003366',
        }).setDepth(5);

        this.timerBarBg = this.add.rectangle(this.scale.width / 2, 18, this.scale.width - 40, 14, 0x333333).setDepth(5);
        this.timerBarBg.setOrigin(0.5, 0);
        this.timerBar = this.add.rectangle(20, 18, 0, 14, 0x4CAF50).setDepth(5);
        this.timerBar.setOrigin(0, 0);

        this.statusText = this.add.text(this.scale.width / 2, 700, '', {
            fontFamily: '"Press Start 2P"',
            fontSize: '10px',
            color: '#003366',
        }).setOrigin(0.5).setDepth(5);
    }

    buildOstriches() {
        const selfX = this.scale.width / 2;
        const selfY = 450;
        const sideX = [250, 1030];
        const sideY = 340;

        const others = SIDE_ORDER[this.playerId];
        const playerOrder = [others[0], this.playerId, others[1]];

        this.ostriches = {};
        this.eggCounts = {};
        this.ostrichPositions = {};

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
            this.ostrichPositions[id] = { x: pos.x, y: pos.y };

            const label = isSelf ? 'You' : `Player ${id}`;

            this.add.text(pos.x, pos.y - 85, label, {
                fontFamily: '"Press Start 2P"',
                fontSize: '10px',
                color: '#003366',
            }).setOrigin(0.5).setDepth(5);

            this.eggCounts[id] = this.add.text(pos.x, pos.y + 80, String(this.startingEggs), {
                fontFamily: '"Press Start 2P"',
                fontSize: '20px',
                color: '#003366',
            }).setOrigin(0.5).setDepth(5);

            this.add.image(pos.x, pos.y + 105, 'egg').setScale(2.4);
        }
    }

    buildActionButtons() {
        const sideX = [250, 1030];
        const by = 590;
        const others = SIDE_ORDER[this.playerId];

        this.btnShareLeft = this.createButton(sideX[0], by, 'btn_share', 'Share', 'share', others[0]);
        this.btnShareRight = this.createButton(sideX[1], by, 'btn_share', 'Share', 'share', others[1]);

        this.actionButtons = [this.btnShareLeft, this.btnShareRight];
    }

    createButton(x, y, texture, label, action, target) {
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
        bg.on('pointerdown', () => this.submitAction(action, target));
        bg.on('pointerover', () => { container.setScale(1.05); });
        bg.on('pointerout', () => { container.setScale(1.0); });

        container.action = action;
        container.target = target;
        container.bg = bg;
        container.label = labelText;

        return container;
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
        this.eventQueue = [];
        this.animating = false;

        this.socketManager.on('roundStart', (data) => {
            this.eventQueue.push({ type: 'roundStart', data });
            this.processEventQueue();
        });

        this.socketManager.on('roundResult', (data) => {
            this.eventQueue.push({ type: 'roundResult', data });
            this.processEventQueue();
        });

        this.socketManager.on('gameEnd', (data) => {
            this.eventQueue.push({ type: 'gameEnd', data });
            this.processEventQueue();
        });

        this.socketManager.on('gameAborted', (data) => {
            this.scene.start('Boot');
        });
    }

    // Ensures each round's result animation fully finishes (and scores update)
    // before the next round's start is processed and input is re-enabled.
    processEventQueue() {
        if (this.animating || this.eventQueue.length === 0) return;

        const { type, data } = this.eventQueue.shift();

        switch (type) {
            case 'roundStart':
                this.applyRoundStart(data);
                this.processEventQueue();
                break;
            case 'roundResult':
                this.applyRoundResult(data);
                break;
            case 'gameEnd':
                this.applyGameEnd(data);
                break;
        }
    }

    applyRoundStart(data) {
        this.currentRound = data.round;
        this.currentPhase = data.phase;
        this.submitted = false;

        this.roundText.setText(`Round ${data.round} / ${this.totalRounds}`);

        this.statusText.setText('');
        this.enableButtons();

        if (data.debugMode) {
            const barWidth = this.scale.width - 40;
            this.timerBar.width = barWidth;
            this.timerBar.fillColor = 0x2196F3;
        } else {
            this.startTimer(data.roundDurationMs);
        }
    }

    applyRoundResult(data) {
        // Capture deltas before scores update
        const deltas = {};
        for (const [key, newVal] of Object.entries(data.scores)) {
            const id = key === 'You' ? this.playerId : key;
            deltas[id] = newVal - (this.currentScores[id] ?? this.startingEggs);
        }

        this.disableButtons();
        this.tweens.killAll();
        this.timerBar.width = 0;
        this.statusText.setText('');

        this.animating = true;

        const isLastRound = data.round >= this.totalRounds;

        // Run the night cycle and share animations simultaneously.
        // Both paths signal via this latch; processEventQueue fires once both are done.
        let doneCount = 0;
        const onBothDone = () => {
            if (++doneCount === (isLastRound ? 1 : 2)) {
                this.animating = false;
                this.processEventQueue();
            }
        };

        if (!isLastRound) {
            this.doNightCycle(onBothDone);
        }

        this.playActionAnimations(data.actions, () => {
            this.updateScores(data.scores);
            this.updateVignetteAlpha();
            for (const [id, delta] of Object.entries(deltas)) {
                if (delta !== 0) this.showEggDelta(id, delta);
            }
            onBothDone();
        });
    }

    applyGameEnd(data) {
        this.scene.start('GameOver', { ...data, socketManager: this.socketManager });
    }

    crossFadeBg(toKey, duration, onComplete) {
        this.bgOverlay.setTexture(toKey).setAlpha(0);
        this.tweens.add({
            targets: this.bgOverlay,
            alpha: 1,
            duration,
            ease: 'Linear',
            onComplete: () => {
                this.bg.setTexture(toKey);
                this.bgOverlay.setAlpha(0);
                if (onComplete) onComplete();
            },
        });
    }

    doSunriseTransition(onComplete) {
        this.crossFadeBg('bg_day', 2000, onComplete);
    }

    doNightCycle(onComplete) {
        this.crossFadeBg('bg_night', 1200, () => {
            this.time.delayedCall(500, () => {
                this.crossFadeBg('bg_day', 1200, onComplete);
            });
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
            if (this.eggCounts[id]) {
                this.eggCounts[id].setText(scores[key].toString());
                this.currentScores[id] = scores[key];
            }
        }
    }

    showEggDelta(playerId, delta) {
        const pos = this.ostrichPositions[playerId];
        if (!pos) return;

        const color = delta > 0 ? '#44FF88' : '#FF4444';
        const label = delta > 0 ? `+${delta}` : `${delta}`;

        const popup = this.add.text(pos.x, pos.y + 50, label, {
            fontFamily: '"Press Start 2P"',
            fontSize: '18px',
            color,
            stroke: '#000000',
            strokeThickness: 4,
        }).setOrigin(0.5).setDepth(20);

        this.tweens.add({
            targets: popup,
            y: pos.y - 20,
            alpha: 0,
            duration: 1400,
            ease: 'Power2',
            onComplete: () => popup.destroy(),
        });
    }

    playActionAnimations(actions, onComplete) {
        const selfX = this.scale.width / 2;
        const selfY = 340;
        const others = SIDE_ORDER[this.playerId];
        const sideX = {
            [others[0]]: 250,
            [others[1]]: 1030,
        };
        sideX[this.playerId] = selfX;

        const sideY = {
            [others[0]]: 280,
            [others[1]]: 280,
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
                this.time.delayedCall(delay, () => {
                    this.playShareAnim(giverSprite, giverId, targetId, sideX, sideY);
                });
            }

            delay += STEP_DELAY;
        }

        this.time.delayedCall(delay + 500, onComplete);
    }

    playShareAnim(giverSprite, giverId, targetId, sideX, sideY) {
        if (!giverSprite || !targetId) return;

        const egg = this.add.image(sideX[giverId], sideY[giverId] - 20, 'egg');
        egg.setScale(0.6);

        const targetSprite = this.ostriches[targetId];

        if (targetSprite) {
            this.tweens.add({
                targets: egg,
                x: sideX[targetId],
                y: sideY[targetId] - 20,
                duration: 600,
                ease: 'Sine.easeIn',
                onComplete: () => {
                    if (targetSprite !== giverSprite) {
                        this.tweens.add({
                            targets: targetSprite,
                            scaleX: targetSprite.scaleX * 1.1,
                            scaleY: targetSprite.scaleY * 1.1,
                            yoyo: true,
                            duration: 100,
                        });
                    }
                    egg.destroy();
                },
            });
        } else {
            this.time.delayedCall(600, () => egg.destroy());
        }

        this.tweens.add({
            targets: giverSprite,
            scaleX: giverSprite.scaleX * 0.9,
            scaleY: giverSprite.scaleY * 0.9,
            yoyo: true,
            duration: 100,
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
