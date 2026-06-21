import { addCreditsButton } from '../CreditsOverlay.js';

const SIDE_ORDER = {
    A: ['C', 'B'],
    B: ['A', 'C'],
    C: ['B', 'A'],
};

const OSTRICH_COLORS = [
    { id: 'blue',   hex: 0x2196F3 },
    { id: 'cyan',   hex: 0x00BCD4 },
    { id: 'green',  hex: 0x4CAF50 },
    { id: 'orange', hex: 0xFF9800 },
    { id: 'pink',   hex: 0xE91E63 },
    { id: 'purple', hex: 0x9C27B0 },
    { id: 'red',    hex: 0xF44336 },
    { id: 'yellow', hex: 0xFFD700 },
];

const CAROUSEL_SLIDES = [
    {
        title: 'Choose a Neighbor',
        desc: 'Each round, pick a player on your left or right',
        render(scene, container) {
            const btnScale = 0.42;
            const labelStyle = { fontFamily: '"Press Start 2P"', fontSize: '8px', color: '#FFFFFF' };
            const arrowStyle = { fontFamily: '"Press Start 2P"', fontSize: '14px', color: '#FFD700' };
            const others = SIDE_ORDER[scene.playerId] || ['B', 'C'];
            const bird = scene.add.sprite(0, 0, 'ostrich_red', 0).setDisplaySize(72, 72);
            const shareLeft = scene.add.image(-170, 0, 'btn_share').setScale(btnScale);
            const shareRight = scene.add.image(170, 0, 'btn_share').setScale(btnScale);
            const shareLeftLabel = scene.add.text(-170, 0, 'Share', labelStyle).setOrigin(0.5);
            const shareRightLabel = scene.add.text(170, 0, 'Share', labelStyle).setOrigin(0.5);
            const labelLeft = scene.add.text(-170, 30, `Player ${others[0]}`, labelStyle).setOrigin(0.5);
            const labelYou = scene.add.text(0, 40, 'You', labelStyle).setOrigin(0.5);
            const labelRight = scene.add.text(170, 30, `Player ${others[1]}`, labelStyle).setOrigin(0.5);
            const arrowL = scene.add.text(-90, -5, '<', arrowStyle).setOrigin(0.5);
            const arrowR = scene.add.text(90, -5, '>', arrowStyle).setOrigin(0.5);
            container.add([shareLeft, shareRight, shareLeftLabel, shareRightLabel,
                bird, labelLeft, labelYou, labelRight, arrowL, arrowR]);
        },
    },
    {
        title: 'Partner Up to Collect Eggs',
        desc: 'If your partner also chooses you, you both gain an egg',
        render(scene, container) {
            const egg = scene.add.image(0, 0, 'egg').setScale(4);
            container.add(egg);
        },
    },
    {
        title: '12 Rounds',
        desc: 'Make your choice before time runs out each round',
        render(scene, container) {
            const roundStyle = { fontFamily: '"Press Start 2P"', fontSize: '11px', color: '#FFD700' };
            const roundText = scene.add.text(0, -18, 'Round  4 / 12', roundStyle).setOrigin(0.5);
            const barW = 280, barH = 10, barX = -barW / 2, barY = 2;
            const barBg = scene.add.graphics();
            barBg.fillStyle(0x333333);
            barBg.fillRoundedRect(barX, barY, barW, barH, 4);
            const barFill = scene.add.graphics();
            barFill.fillStyle(0x4CAF50);
            barFill.fillRoundedRect(barX, barY, barW * 0.4, barH, 4);
            const secsLeft = scene.add.text(0, 18, '~15 seconds',
                { fontFamily: '"Press Start 2P"', fontSize: '9px', color: '#AAAAAA' }).setOrigin(0.5);
            container.add([roundText, barBg, barFill, secsLeft]);
        },
    },
];

const CAROUSEL_Y = 643;
const DOT_Y = 736;
const BIRD_Y = 252;
const COLOR_ROW_Y = [387, 455];
const READY_BTN_Y = 515;

export class Lobby extends Phaser.Scene {

    constructor() {
        super('Lobby');
    }

    init(data) {
        this.socketManager = data.socketManager;
    }

    create() {
        const w = this.scale.width;
        const h = this.scale.height;

        this.playerId = (this.socketManager.playerId || 'A').toUpperCase();
        const neighbors = SIDE_ORDER[this.playerId];
        const roles = [neighbors[0], this.playerId, neighbors[1]];
        const birdX = [w / 2 - 200, w / 2, w / 2 + 200];

        this.birdXMap = {};
        for (let i = 0; i < 3; i++) this.birdXMap[roles[i]] = birdX[i];

        this.birds = {};
        this.birdLabels = {};
        this.birdColors = { A: null, B: null, C: null };
        this.birdReady = { A: false, B: false, C: false };
        this.selectedColor = null;
        this.localReady = false;
        this.lastKnownTaken = new Set();

        this.add.image(w / 2, h / 2, 'bg_night').setDisplaySize(w, h);
        this.add.rectangle(w / 2, h / 2, w, h, 0x000000).setAlpha(0.4);

        this.add.text(w / 2, 52, `You are Player ${this.playerId}`, {
            fontFamily: '"Press Start 2P"',
            fontSize: '16px',
            color: '#FFFFFF',
        }).setOrigin(0.5);

        this.statusText = this.add.text(w / 2, 90, 'Waiting for players...', {
            fontFamily: '"Press Start 2P"',
            fontSize: '12px',
            color: '#AAAAAA',
        }).setOrigin(0.5);

        this.countText = this.add.text(w / 2, 118, '0 / 3 connected', {
            fontFamily: '"Press Start 2P"',
            fontSize: '14px',
            color: '#FFD700',
        }).setOrigin(0.5);

        this.readyText = this.add.text(w / 2, 144, '0 / 3 ready', {
            fontFamily: '"Press Start 2P"',
            fontSize: '11px',
            color: '#AAAAAA',
        }).setOrigin(0.5);

        for (let i = 0; i < 3; i++) {
            const role = roles[i];
            const isSelf = role === this.playerId;
            const bird = this.add.sprite(birdX[i], BIRD_Y, 'ostrich_red', 0);
            bird.setDisplaySize(130, 130).setAlpha(0.4).setTint(0x000000);
            this.birds[role] = bird;

            const label = this.add.text(birdX[i], BIRD_Y + 72,
                isSelf ? `You (${role})` : `Player ${role}`, {
                    fontFamily: '"Press Start 2P"',
                    fontSize: '8px',
                    color: isSelf ? '#FFD700' : '#AAAAAA',
                }).setOrigin(0.5);
            this.birdLabels[role] = label;
        }

        this.buildColorPicker();
        this.buildReadyButton();
        this.createCarousel();
        this.setupSocketListeners(w, h);
        addCreditsButton(this);

    }

    setRoleBird(role, color, connected, ready = false) {
        const x = this.birdXMap[role];
        if (x === undefined) return;

        if (this.birds[role]) {
            this.birds[role].destroy();
            this.birds[role] = null;
        }

        let bird;
        if (color) {
            bird = this.add.sprite(x, BIRD_Y, `ostrich_${color}`, 0);
            bird.setDisplaySize(130, 130).clearTint();
            bird.setAlpha(ready ? 1.0 : 0.35);
            if (this.anims.exists(`idle_${color}`)) bird.play(`idle_${color}`);
        } else {
            bird = this.add.sprite(x, BIRD_Y, 'ostrich_red', 0);
            bird.setDisplaySize(130, 130).setTint(0x000000).setAlpha(connected ? 0.4 : 0.2);
        }

        this.birds[role] = bird;
        this.birdColors[role] = color || null;
    }

    buildColorPicker() {
        const w = this.scale.width;
        const BTN = 58;
        const RADIUS = 10;
        const GAP = 10;
        const STEP = BTN + GAP;
        const COLS = 4;

        const gridW = COLS * BTN + (COLS - 1) * GAP;
        const firstX = (w - gridW) / 2 + BTN / 2;

        this.colorButtons = {};

        for (let i = 0; i < OSTRICH_COLORS.length; i++) {
            const { id, hex } = OSTRICH_COLORS[i];
            const col = i % COLS;
            const row = Math.floor(i / COLS);
            const x = firstX + col * STEP;
            const y = COLOR_ROW_Y[row];

            const gfx = this.add.graphics();
            gfx.fillStyle(hex, 1);
            gfx.fillRoundedRect(x - BTN / 2, y - BTN / 2, BTN, BTN, RADIUS);

            const ring = this.add.graphics();
            ring.lineStyle(4, 0xFFFFFF, 1);
            ring.strokeRoundedRect(x - BTN / 2 - 4, y - BTN / 2 - 4, BTN + 8, BTN + 8, RADIUS + 4);
            ring.setAlpha(0);

            const zone = this.add.zone(x, y, BTN + 8, BTN + 8).setInteractive();
            zone.on('pointerdown', () => this.onColorClick(id));

            this.colorButtons[id] = { gfx, ring, zone, hex };
        }
    }

    onColorClick(id) {
        // A ready player's color is locked — can't steal it
        if (this.lastKnownTaken.has(id)) return;

        // Clicking a different color while ready → unready first
        if (this.localReady && id !== this.selectedColor) {
            this.localReady = false;
        }

        this.confirmColor(id);
    }

    confirmColor(color) {
        this.selectedColor = color;
        this.socketManager.emitPlayerColorChoice(color);
        this.setRoleBird(this.playerId, color, true, false);
        this.updateColorButtons(this.lastKnownTaken);
        this.updateReadyButton();
    }

    buildReadyButton() {
        const w = this.scale.width;
        const BTN_W = 220;
        const BTN_H = 44;
        const cx = w / 2;
        const cy = READY_BTN_Y;

        this._readyBtnCx = cx;
        this._readyBtnCy = cy;
        this._readyBtnW = BTN_W;
        this._readyBtnH = BTN_H;
        this._readyBtnRadius = 12;

        this.readyBtnBg = this.add.graphics();

        this.readyBtnLabel = this.add.text(cx, cy, 'Ready!', {
            fontFamily: '"Press Start 2P"',
            fontSize: '13px',
            color: '#FFFFFF',
        }).setOrigin(0.5);

        this.readyBtnZone = this.add.zone(cx, cy, BTN_W, BTN_H).setInteractive();
        this.readyBtnZone.on('pointerdown', () => this.onReadyClick());

        this.updateReadyButton();
    }

    updateReadyButton() {
        const { _readyBtnCx: cx, _readyBtnCy: cy, _readyBtnW: bw, _readyBtnH: bh, _readyBtnRadius: r } = this;
        this.readyBtnBg.clear();

        if (this.localReady) {
            this.readyBtnBg.fillStyle(0x2e7d32, 1);
            this.readyBtnBg.fillRoundedRect(cx - bw / 2, cy - bh / 2, bw, bh, r);
            this.readyBtnLabel.setText('Ready! ✓').setAlpha(1);
            this.readyBtnZone.disableInteractive();
        } else if (this.selectedColor) {
            this.readyBtnBg.fillStyle(0x1565C0, 1);
            this.readyBtnBg.fillRoundedRect(cx - bw / 2, cy - bh / 2, bw, bh, r);
            this.readyBtnLabel.setText('Ready!').setAlpha(1);
            this.readyBtnZone.setInteractive();
        } else {
            this.readyBtnBg.fillStyle(0x333333, 1);
            this.readyBtnBg.fillRoundedRect(cx - bw / 2, cy - bh / 2, bw, bh, r);
            this.readyBtnLabel.setText('Ready!').setAlpha(0.4);
            this.readyBtnZone.disableInteractive();
        }
    }

    onReadyClick() {
        if (!this.selectedColor || this.localReady) return;
        this.localReady = true;
        this.socketManager.emitPlayerReady();
        this.setRoleBird(this.playerId, this.selectedColor, true, true);
        this.updateColorButtons(this.lastKnownTaken);
        this.updateReadyButton();
    }

    updateColorButtons(takenByOthers) {
        for (const [id, { gfx, ring, zone }] of Object.entries(this.colorButtons)) {
            const taken = takenByOthers.has(id);
            const isSelected = this.selectedColor === id;

            if (taken) {
                // Only ready players' colors are locked — always block these
                gfx.setAlpha(0.15);
                ring.setAlpha(0);
                zone.disableInteractive();
            } else if (this.localReady) {
                // Post-ready: highlight own selection, grey out rest
                gfx.setAlpha(isSelected ? 1 : 0.15);
                ring.setAlpha(isSelected ? 1 : 0);
                zone.setInteractive(); // still allow clicking another color to unready
            } else if (isSelected) {
                gfx.setAlpha(1);
                ring.setAlpha(1);
                zone.setInteractive();
            } else {
                gfx.setAlpha(this.selectedColor ? 0.4 : 1);
                ring.setAlpha(0);
                zone.setInteractive();
            }
        }
    }

    setupSocketListeners(w, h) {
        const onLobbyUpdate = (data) => {
            const count = data.connected.length;
            const readyArr = Array.isArray(data.ready) ? data.ready : [];
            const readyCount = readyArr.length;
            const colorChoices = data.colorChoices || {};

            // Re-send only if server is missing our state (reconnect recovery)
            if (this.selectedColor && colorChoices[this.playerId] !== this.selectedColor) {
                this.socketManager.emitPlayerColorChoice(this.selectedColor);
            }
            if (this.localReady && !readyArr.includes(this.playerId)) {
                this.socketManager.emitPlayerReady();
            }

            this.countText.setText(`${count} / 3 connected`);
            this.readyText.setText(`${readyCount} / 3 ready`);

            for (const role of ['A', 'B', 'C']) {
                const connected = data.connected.includes(role);
                const isOwnRole = role === this.playerId;
                const isReady = isOwnRole ? this.localReady : readyArr.includes(role);
                // Own player shows colour immediately on selection; others only reveal on ready
                const chosenColor = isOwnRole
                    ? (this.selectedColor || null)
                    : (isReady ? (colorChoices[role] || null) : null);

                const colorChanged = this.birdColors[role] !== chosenColor;
                const readyChanged = this.birdReady[role] !== isReady;

                if (colorChanged || readyChanged) {
                    this.setRoleBird(role, chosenColor, connected, isReady);
                    this.birdReady[role] = isReady;
                } else if (this.birds[role]) {
                    const targetAlpha = chosenColor
                        ? (isReady ? 1.0 : 0.35)
                        : (connected ? 0.4 : 0.2);
                    this.birds[role].setAlpha(targetAlpha);
                }

                if (this.birdLabels[role]) {
                    const baseText = isOwnRole ? `You (${role})` : `Player ${role}`;
                    const suffix = isReady ? ' ✓' : (chosenColor ? ' •' : '');
                    const labelColor = isOwnRole
                        ? '#FFD700'
                        : (isReady ? '#4CAF50' : (chosenColor ? '#CCCCCC' : '#AAAAAA'));
                    this.birdLabels[role].setText(baseText + suffix);
                    this.birdLabels[role].setColor(labelColor);
                }
            }

            // Only ready players' colors count as locked for others
            const takenByOthers = new Set(
                Object.entries(colorChoices)
                    .filter(([pid]) => pid !== this.playerId && readyArr.includes(pid))
                    .map(([, col]) => col),
            );
            this.lastKnownTaken = takenByOthers;
            this.updateColorButtons(takenByOthers);

            if (count < 3) {
                this.statusText.setText('Waiting for players...');
                this.statusText.setColor('#AAAAAA');
            } else if (!this.selectedColor) {
                this.statusText.setText('Pick your colour to begin!');
                this.statusText.setColor('#FFD700');
            } else if (!this.localReady) {
                this.statusText.setText('Tap Ready when set!');
                this.statusText.setColor('#FFD700');
            } else if (readyCount < 3) {
                this.statusText.setText('Waiting for others...');
                this.statusText.setColor('#FFD700');
            } else {
                this.statusText.setText('All players ready!');
                this.statusText.setColor('#4CAF50');
            }
        };

        const onGameStart = (data) => {
            this.scene.start('Game', {
                socketManager: this.socketManager,
                playerId: data.playerId,
                totalRounds: data.totalRounds,
                startingEggs: data.startingEggs,
                colorChoices: data.colorChoices || {},
            });
        };

        const onGameAborted = () => {
            this.localReady = false;
            this.selectedColor = null;
            this.socketManager.requestLobbyState();
        };

        const onPlayerDisconnected = (data) => {
            this.statusText.setText(`Player ${data.playerId} disconnected`);
            this.statusText.setColor('#F44336');
        };

        const onPlayerReconnected = (data) => {
            this.statusText.setText(`Player ${data.playerId} reconnected`);
            this.statusText.setColor('#4CAF50');
        };

        const onConnected = () => {
            this.localReady = false;
            this.selectedColor = null;
            this.socketManager.requestLobbyState();
        };

        const onErrorMessage = (data) => {
            this.add.text(w / 2, 665, data.message, {
                fontFamily: '"Press Start 2P"',
                fontSize: '12px',
                color: '#F44336',
            }).setOrigin(0.5);
        };

        this.socketManager.on('lobbyUpdate',  onLobbyUpdate);
        this.socketManager.on('gameStart',    onGameStart);
        this.socketManager.on('gameAborted',  onGameAborted);
        this.socketManager.on('playerDisconnected', onPlayerDisconnected);
        this.socketManager.on('playerReconnected',  onPlayerReconnected);
        this.socketManager.on('connected',          onConnected);
        this.socketManager.on('errorMessage', onErrorMessage);

        this.events.once('shutdown', () => {
            this.socketManager.off('lobbyUpdate',  onLobbyUpdate);
            this.socketManager.off('gameStart',    onGameStart);
            this.socketManager.off('gameAborted',  onGameAborted);
            this.socketManager.off('playerDisconnected', onPlayerDisconnected);
            this.socketManager.off('playerReconnected',  onPlayerReconnected);
            this.socketManager.off('connected',          onConnected);
            this.socketManager.off('errorMessage', onErrorMessage);
        });

        this.socketManager.requestLobbyState();
    }

    createCarousel() {
        const w = this.scale.width;

        this.carouselSlides = CAROUSEL_SLIDES;
        this.carouselIndex = 0;
        this.isDragging = false;
        this.isTransitioning = false;

        this.carousel = this.add.container(w / 2, CAROUSEL_Y);
        const bg = this.add.graphics();
        bg.fillStyle(0x000000, 0.45);
        bg.fillRoundedRect(-340, -90, 680, 180, 18);
        this.carousel.add(bg);

        this.slideContent = this.add.container(0, -20);
        this.carousel.add(this.slideContent);

        this.navDots = [];
        const dotSpacing = 18;
        const dotStartX = -((CAROUSEL_SLIDES.length - 1) * dotSpacing) / 2;
        for (let i = 0; i < CAROUSEL_SLIDES.length; i++) {
            const dotX = w / 2 + dotStartX + i * dotSpacing;
            const dot = this.add.circle(dotX, DOT_Y, 5, 0x555555);
            dot.setStrokeStyle(1, 0x888888);
            dot.setInteractive(new Phaser.Geom.Circle(0, 0, 12), Phaser.Geom.Circle.Contains);
            dot.on('pointerdown', () => this.onDotClick(i));
            this.navDots.push(dot);
        }

        this.input.on('pointerdown', (pointer) => this.onPointerDown(pointer));
        this.input.on('pointermove', (pointer) => this.onPointerMove(pointer));
        this.input.on('pointerup', (pointer) => this.onPointerUp(pointer));

        this.showSlide(0);
    }

    isInCarousel(pointer) {
        const cx = this.carousel.x;
        const cy = this.carousel.y;
        return pointer.x > cx - 350 && pointer.x < cx + 350 &&
               pointer.y > cy - 100 && pointer.y < cy + 100;
    }

    onPointerDown(pointer) {
        if (this.isTransitioning) return;
        if (!this.isInCarousel(pointer)) return;

        // Don't start a drag if the pointer is on a nav dot
        for (const dot of this.navDots) {
            const dx = pointer.x - dot.x;
            const dy = pointer.y - dot.y;
            if (dx * dx + dy * dy < 225) return;
        }

        this.isDragging = true;
        this.dragStartX = pointer.x;
        this.dragStartContentX = this.slideContent.x;
    }

    onPointerMove(pointer) {
        if (!this.isDragging) return;
        this.slideContent.x = this.dragStartContentX + (pointer.x - this.dragStartX);
    }

    onPointerUp(pointer) {
        if (!this.isDragging) return;
        this.isDragging = false;

        const dx = pointer.x - this.dragStartX;
        const threshold = 40;

        if (dx < -threshold) {
            this.transitionTo(this.carouselIndex + 1, -1);
        } else if (dx > threshold) {
            this.transitionTo(this.carouselIndex - 1, 1);
        } else {
            this.tweens.add({
                targets: this.slideContent,
                x: 0,
                duration: 150,
                ease: 'Cubic.easeOut',
            });
        }
    }

    onDotClick(index) {
        if (index === this.carouselIndex || this.isTransitioning) return;
        const dir = index > this.carouselIndex ? -1 : 1;
        this.transitionTo(index, dir);
    }

    transitionTo(newIndex, direction) {
        if (this.isTransitioning) return;
        this.isTransitioning = true;

        const exitX = direction * 300;
        this.tweens.add({
            targets: this.slideContent,
            x: exitX,
            duration: 180,
            ease: 'Cubic.easeIn',
            onComplete: () => {
                this.carouselIndex = ((newIndex % this.carouselSlides.length) +
                    this.carouselSlides.length) % this.carouselSlides.length;
                this.slideContent.removeAll(true);
                this.slideContent.x = -exitX;

                const slide = this.carouselSlides[this.carouselIndex];
                slide.render(this, this.slideContent);

                const titleStyle = { fontFamily: '"Press Start 2P"', fontSize: '10px', color: '#FFFFFF' };
                const title = this.add.text(0, 72, slide.title, titleStyle).setOrigin(0.5);
                this.slideContent.add(title);

                const descStyle = { fontFamily: '"Press Start 2P"', fontSize: '7px', color: '#CCCCCC' };
                const desc = this.add.text(0, 88, slide.desc, descStyle).setOrigin(0.5);
                this.slideContent.add(desc);

                this.updateDots();

                this.tweens.add({
                    targets: this.slideContent,
                    x: 0,
                    duration: 180,
                    ease: 'Cubic.easeOut',
                    onComplete: () => { this.isTransitioning = false; },
                });
            },
        });
    }

    showSlide(index) {
        this.carouselIndex = ((index % this.carouselSlides.length) +
            this.carouselSlides.length) % this.carouselSlides.length;
        this.slideContent.removeAll(true);

        const slide = this.carouselSlides[this.carouselIndex];
        slide.render(this, this.slideContent);

        const titleStyle = { fontFamily: '"Press Start 2P"', fontSize: '10px', color: '#FFFFFF' };
        const title = this.add.text(0, 72, slide.title, titleStyle).setOrigin(0.5);
        this.slideContent.add(title);

        const descStyle = { fontFamily: '"Press Start 2P"', fontSize: '7px', color: '#CCCCCC' };
        const desc = this.add.text(0, 88, slide.desc, descStyle).setOrigin(0.5);
        this.slideContent.add(desc);

        this.updateDots();
    }

    updateDots() {
        for (let i = 0; i < this.navDots.length; i++) {
            const dot = this.navDots[i];
            if (i === this.carouselIndex) {
                dot.setFillStyle(0xFFD700);
                dot.setStrokeStyle(1, 0xFFD700);
            } else {
                dot.setFillStyle(0x555555);
                dot.setStrokeStyle(1, 0x888888);
            }
        }
    }
}
