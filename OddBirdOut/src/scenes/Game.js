import { addCreditsButton } from '../CreditsOverlay.js';

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
        this.colorChoices = data.colorChoices || {};
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
        this.currentRound = 0;
        this.currentPhase = 'trust';
        this.submitted = false;
        this.eggSprites = [];
        this.currentScores = { A: this.startingEggs, B: this.startingEggs, C: this.startingEggs };

        // Fade from lobby night to day as soon as the game scene loads.
        // animating=true blocks roundStart from being processed until the fade completes.
        addCreditsButton(this);

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
            stroke: '#FFFFFF',
            strokeThickness: 4,
        }).setDepth(20);

        this.timerBarBg = this.add.rectangle(this.scale.width / 2, 18, this.scale.width - 40, 14, 0x333333).setDepth(5);
        this.timerBarBg.setOrigin(0.5, 0);
        this.timerBar = this.add.rectangle(20, 18, 0, 14, 0x4CAF50).setDepth(5);
        this.timerBar.setOrigin(0, 0);

        this.statusText = this.add.text(this.scale.width / 2, 700, '', {
            fontFamily: '"Press Start 2P"',
            fontSize: '10px',
            color: '#003366',
            stroke: '#FFFFFF',
            strokeThickness: 3,
        }).setOrigin(0.5).setDepth(20);

        this.noTalkingText = this.add.text(this.scale.width / 2, 200, 'No talking to your\nopponents!', {
            fontFamily: '"Press Start 2P"',
            fontSize: '14px',
            color: '#FFD700',
            stroke: '#000000',
            strokeThickness: 4,
            align: 'center',
        }).setOrigin(0.5).setDepth(50).setVisible(false);
    }

    buildOstriches() {
        const selfX = this.scale.width / 2;
        const selfY = 450;
        const sideX = [250, 1030];
        const sideY = 340;

        const others = SIDE_ORDER[this.playerId];
        const playerOrder = [others[0], this.playerId, others[1]];

        this.ostriches = {};
        this.eggDisplays = {};
        this.eggCountTexts = {};
        this.ostrichPositions = {};

        const positions = [
            { x: sideX[0], y: sideY, id: playerOrder[0], scale: 1.0, eggDx: -40, eggDy: 40,  eggSize: 50 },
            { x: selfX,    y: selfY, id: playerOrder[1], scale: 1.3, eggDx:   0, eggDy: 80, eggSize: 64 },
            { x: sideX[1], y: sideY, id: playerOrder[2], scale: 1.0, eggDx:  40, eggDy: 40,  eggSize: 50 },
        ];

        for (const pos of positions) {
            const id = pos.id;
            const isSelf = id === this.playerId;
            const colorKey = this.colorChoices[id];
            const textureKey = colorKey ? `ostrich_${colorKey}` : 'ostrich_red';
            const displaySize = isSelf ? 130 : 100;
            const sprite = this.add.sprite(pos.x, pos.y, textureKey, 0);
            sprite.setDisplaySize(displaySize, displaySize);
            if (colorKey && this.anims.exists(`idle_${colorKey}`)) {
                sprite.play(`idle_${colorKey}`);
            }
            this.ostriches[id] = sprite;
            this.ostrichPositions[id] = { x: pos.x, y: pos.y };

            const label = isSelf ? 'You' : `Player ${id}`;

            this.add.text(pos.x, pos.y - 85, label, {
                fontFamily: '"Press Start 2P"',
                fontSize: '10px',
                color: '#003366',
                stroke: '#FFFFFF',
                strokeThickness: 3,
            }).setOrigin(0.5).setDepth(20);

            const eggDisplay = this.add.sprite(pos.x + pos.eggDx, pos.y + pos.eggDy, 'egg_1', 0);
            eggDisplay.setDisplaySize(pos.eggSize, pos.eggSize).setDepth(5).setAlpha(0);
            eggDisplay.baseDisplaySize = pos.eggSize;
            this.eggDisplays[id] = eggDisplay;

            const countText = this.add.text(
                pos.x + pos.eggDx,
                pos.y + pos.eggDy + pos.eggSize / 2 + 10,
                '',
                {
                    fontFamily: '"Press Start 2P"',
                    fontSize: isSelf ? '16px' : '12px',
                    color: '#003366',
                    stroke: '#FFFFFF',
                    strokeThickness: 3,
                }
            ).setOrigin(0.5).setDepth(20).setAlpha(0);
            this.eggCountTexts[id] = countText;

            if (this.startingEggs > 0) this.updateEggDisplay(id, this.startingEggs);
        }
    }

    buildActionButtons() {
        const sideX = [250, 1030];
        const by = 590;
        const others = SIDE_ORDER[this.playerId];

        this.btnShareLeft = this.createButton(sideX[0], by, 'btn_share', 'Pair', 'share', others[0]);
        this.btnShareRight = this.createButton(sideX[1], by, 'btn_share', 'Pair', 'share', others[1]);

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

        const onRoundStart = (data) => {
            this.eventQueue.push({ type: 'roundStart', data });
            this.processEventQueue();
        };
        const onRoundResult = (data) => {
            this.eventQueue.push({ type: 'roundResult', data });
            this.processEventQueue();
        };
        const onGameEnd = (data) => {
            this.eventQueue.push({ type: 'gameEnd', data });
            this.processEventQueue();
        };
        const onGameAborted = () => {
            this.scene.start('Start', { socketManager: this.socketManager });
        };
        const onPlayerDisconnected = (data) => {
            this.statusText.setText(`Player ${data.playerId} disconnected`);
            this.statusText.setColor('#F44336');
        };
        const onPlayerReconnected = (data) => {
            this.statusText.setText(`Player ${data.playerId} reconnected`);
            this.statusText.setColor('#4CAF50');
            this.time.delayedCall(3000, () => {
                if (this.statusText && this.statusText.text === `Player ${data.playerId} reconnected`) {
                    this.statusText.setText('');
                }
            });
        };
        const onDisconnected = () => {
            this.statusText.setText('Connection lost. Reconnecting...');
            this.statusText.setColor('#F44336');
            this.disableButtons();
        };
        const onConnected = () => {
            this.socketManager.requestLobbyState();
        };
        const onRoundSync = (data) => {
            this.currentRound = data.round;
            this.currentPhase = data.phase;
            this.submitted = data.submitted;
            this.roundText.setText(`Round ${data.round} / ${this.totalRounds}`);
            this.noTalkingText.setVisible(data.round <= 4);

            if (data.scores) this.updateScores(data.scores);

            if (data.submitted) {
                this.disableButtons();
                this.statusText.setText('Waiting...');
            } else {
                this.enableButtons();
                this.statusText.setText('');
                if (!data.debugMode && data.roundActive) {
                    this.tweens.killAll();
                    this.startTimer(data.roundDurationMs);
                }
            }
        };

        this.socketManager.on('roundStart',  onRoundStart);
        this.socketManager.on('roundResult', onRoundResult);
        this.socketManager.on('gameEnd',     onGameEnd);
        this.socketManager.on('gameAborted', onGameAborted);
        this.socketManager.on('playerDisconnected', onPlayerDisconnected);
        this.socketManager.on('playerReconnected',  onPlayerReconnected);
        this.socketManager.on('disconnected',       onDisconnected);
        this.socketManager.on('connected',          onConnected);
        this.socketManager.on('roundSync',          onRoundSync);

        this.events.once('shutdown', () => {
            this.socketManager.off('roundStart',  onRoundStart);
            this.socketManager.off('roundResult', onRoundResult);
            this.socketManager.off('gameEnd',     onGameEnd);
            this.socketManager.off('gameAborted', onGameAborted);
            this.socketManager.off('playerDisconnected', onPlayerDisconnected);
            this.socketManager.off('playerReconnected',  onPlayerReconnected);
            this.socketManager.off('disconnected',       onDisconnected);
            this.socketManager.off('connected',          onConnected);
            this.socketManager.off('roundSync',          onRoundSync);
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
        this.noTalkingText.setVisible(data.round <= 4);

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

        const applyScores = () => {
            this.updateScores(data.scores);

            for (const [id, delta] of Object.entries(deltas)) {
                if (delta !== 0) this.showEggDelta(id, delta);
            }
        };

        const finish = () => {
            this.animating = false;
            this.processEventQueue();
        };

        if (isLastRound) {
            this.playActionAnimations(data.actions, () => {
                applyScores();
                finish();
            });
        } else {
            // Sequence: fade to night → hearts play → scores update → fade to day → next round
            this.crossFadeBg('bg_night', 1200, () => {
                this.playActionAnimations(data.actions, () => {
                    applyScores();
                    this.crossFadeBg('bg_day', 1200, finish);
                });
            });
        }
    }

    applyGameEnd(data) {
        this.scene.start('GameOver', { ...data, socketManager: this.socketManager, colorChoices: this.colorChoices });
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
            this.currentScores[id] = scores[key];
            this.updateEggDisplay(id, scores[key]);
        }
    }

    eggKeyForScore(score) {
        if (score >= 8) return 'egg_8';
        if (score === 7) return 'egg_6';
        return `egg_${score}`;
    }

    updateEggDisplay(id, score) {
        const sprite = this.eggDisplays[id];
        if (!sprite) return;

        sprite.stop();
        sprite.off('animationupdate');
        sprite.off('animationcomplete');

        const countText = this.eggCountTexts[id];

        if (score <= 0) {
            sprite.setAlpha(0);
            if (countText) countText.setAlpha(0);
            return;
        }

        if (countText) {
            countText.setText(String(score)).setAlpha(1);
        }

        sprite.setAlpha(1);
        const key = this.eggKeyForScore(score);
        const size = sprite.baseDisplaySize;

        if (key === 'egg_1') {
            sprite.setTexture('egg_1', 0);
            sprite.setDisplaySize(size, size);
            const baseScale = sprite.scaleX;
            sprite.setScale(baseScale * 0.25);
            sprite.play('egg_count_1');
            sprite.on('animationupdate', (anim, frame) => {
                sprite.setScale(baseScale * (frame.textureFrame + 1) / 4);
            });
            sprite.once('animationcomplete', () => {
                sprite.setScale(baseScale);
                sprite.off('animationupdate');
            });
        } else {
            sprite.setTexture(key);
            sprite.setDisplaySize(size, size);
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
        const STEP_DELAY = 1800;

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

        const from = this.ostrichPositions[giverId];
        const to = this.ostrichPositions[targetId];
        const heart = this.add.sprite(from.x, from.y, 'heart_frames', 0);
        heart.setDisplaySize(60, 60).setDepth(15);

        const targetSprite = this.ostriches[targetId];

        if (targetSprite) {
            this.tweens.add({
                targets: heart,
                x: to.x,
                y: to.y,
                duration: 600,
                ease: 'Sine.easeIn',
                onComplete: () => {
                    heart.play('heart_burst');
                    const baseScale = heart.scaleX;
                    heart.on('animationupdate', (anim, frame) => {
                        heart.setScale(baseScale * (1 + frame.textureFrame * 0.2));
                    });
                    if (targetSprite !== giverSprite) {
                        this.tweens.add({
                            targets: targetSprite,
                            x: targetSprite.x + 6,
                            duration: 80,
                            yoyo: true,
                            repeat: 0,
                            ease: 'Sine.easeInOut',
                        });
                    }
                    heart.once('animationcomplete', () => {
                        if (targetSprite !== giverSprite) {
                            this.tweens.add({
                                targets: targetSprite,
                                scaleX: targetSprite.scaleX * 1.1,
                                scaleY: targetSprite.scaleY * 1.1,
                                yoyo: true,
                                duration: 100,
                            });
                        }
                        heart.destroy();
                    });
                },
            });
        } else {
            this.time.delayedCall(600, () => heart.destroy());
        }

        const dx = to.x - from.x;
        const dy = to.y - from.y;
        const len = Math.sqrt(dx * dx + dy * dy);
        this.tweens.add({
            targets: giverSprite,
            x: giverSprite.x + (dx / len) * 15,
            y: giverSprite.y + (dy / len) * 15,
            duration: 150,
            yoyo: true,
            ease: 'Sine.easeOut',
        });
    }

}
