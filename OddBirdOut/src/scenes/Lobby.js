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

        // Store playerId on instance so setRoleBird and carousel can access it.
        this.playerId = (this.socketManager.playerId || 'A').toUpperCase();
        const neighbors = SIDE_ORDER[this.playerId];
        const roles = [neighbors[0], this.playerId, neighbors[1]];
        const birdX = [w / 2 - 200, w / 2, w / 2 + 200];

        // Map role → x position so we can recreate bird sprites anywhere.
        this.birdXMap = {};
        for (let i = 0; i < 3; i++) this.birdXMap[roles[i]] = birdX[i];

        this.birds = {};
        this.birdLabels = {};
        this.birdColors = { A: null, B: null, C: null };
        this.selectedColor = null;
        this.activePopupObjects = null;
        this.lastKnownTaken = new Set();

        // Background
        this.add.image(w / 2, h / 2, 'bg_night').setDisplaySize(w, h);
        this.add.rectangle(w / 2, h / 2, w, h, 0x000000).setAlpha(0.4);

        this.add.text(w / 2, 60, 'Odd Bird Out', {
            fontFamily: '"Press Start 2P"',
            fontSize: '28px',
            color: '#FFD700',
        }).setOrigin(0.5);

        this.add.text(w / 2, 110, `You are Player ${this.playerId}`, {
            fontFamily: '"Press Start 2P"',
            fontSize: '16px',
            color: '#FFFFFF',
        }).setOrigin(0.5);

        this.statusText = this.add.text(w / 2, 148, 'Waiting for players...', {
            fontFamily: '"Press Start 2P"',
            fontSize: '12px',
            color: '#AAAAAA',
        }).setOrigin(0.5);

        this.countText = this.add.text(w / 2, 178, '0 / 3 connected', {
            fontFamily: '"Press Start 2P"',
            fontSize: '14px',
            color: '#FFD700',
        }).setOrigin(0.5);

        this.readyText = this.add.text(w / 2, 204, '0 / 3 chosen', {
            fontFamily: '"Press Start 2P"',
            fontSize: '11px',
            color: '#AAAAAA',
        }).setOrigin(0.5);

        // Initial placeholder birds (black silhouette)
        for (let i = 0; i < 3; i++) {
            const role = roles[i];
            const isSelf = role === this.playerId;
            const bird = this.add.sprite(birdX[i], 310, 'ostrich_red', 0);
            bird.setDisplaySize(130, 130).setAlpha(0.4).setTint(0x000000);
            this.birds[role] = bird;

            const label = this.add.text(birdX[i], 382,
                isSelf ? `You (${role})` : `Player ${role}`, {
                    fontFamily: '"Press Start 2P"',
                    fontSize: '8px',
                    color: isSelf ? '#FFD700' : '#AAAAAA',
                }).setOrigin(0.5);
            this.birdLabels[role] = label;
        }

        this.createCarousel();
        this.buildColorPicker();
        this.setupSocketListeners(w, h);
    }

    // Destroys the existing sprite for a role and creates a fresh one.
    // This is the only place birds are updated — no setTexture/play juggling.
    setRoleBird(role, color, connected) {
        const x = this.birdXMap[role];
        if (x === undefined) return;

        if (this.birds[role]) {
            this.birds[role].destroy();
            this.birds[role] = null;
        }

        let bird;
        if (color) {
            bird = this.add.sprite(x, 310, `ostrich_${color}`, 0);
            bird.setDisplaySize(130, 130).clearTint().setAlpha(connected ? 1 : 0.4);
            if (this.anims.exists(`idle_${color}`)) bird.play(`idle_${color}`);
        } else {
            bird = this.add.sprite(x, 310, 'ostrich_red', 0);
            bird.setDisplaySize(130, 130).setTint(0x000000).setAlpha(connected ? 0.4 : 0.2);
        }

        this.birds[role] = bird;
        this.birdColors[role] = color || null;
    }

    buildColorPicker() {
        const w = this.scale.width;
        const BTN = 88;
        const RADIUS = 14;
        const GAP = 14;
        const STEP = BTN + GAP;
        const totalW = OSTRICH_COLORS.length * BTN + (OSTRICH_COLORS.length - 1) * GAP;
        const startX = (w - totalW) / 2 + BTN / 2;
        const btnY = 660;

        this.colorButtons = {};

        for (let i = 0; i < OSTRICH_COLORS.length; i++) {
            const { id, hex } = OSTRICH_COLORS[i];
            const x = startX + i * STEP;

            const gfx = this.add.graphics();
            gfx.fillStyle(hex, 1);
            gfx.fillRoundedRect(x - BTN / 2, btnY - BTN / 2, BTN, BTN, RADIUS);

            const ring = this.add.graphics();
            ring.lineStyle(4, 0xFFFFFF, 1);
            ring.strokeRoundedRect(x - BTN / 2 - 4, btnY - BTN / 2 - 4, BTN + 8, BTN + 8, RADIUS + 4);
            ring.setAlpha(0);

            const label = this.add.text(x, btnY + BTN / 2 + 10, id, {
                fontFamily: '"Press Start 2P"',
                fontSize: '7px',
                color: '#FFFFFF',
            }).setOrigin(0.5);

            const zone = this.add.zone(x, btnY, BTN + 12, BTN + 12).setInteractive();
            zone.on('pointerdown', () => {
                if (this.activePopupObjects) return;
                this.showColorPopup(id, hex);
            });

            this.colorButtons[id] = { gfx, ring, label, zone, hex };
        }
    }

    showColorPopup(color, colorHex) {
        this.closePopup();

        const w = this.scale.width;
        const h = this.scale.height;
        const cx = w / 2;
        const cy = h / 2;
        const D = 100;

        // Dark overlay — also blocks accidental carousel drags
        const overlay = this.add.rectangle(cx, cy, w, h, 0x000000, 0.72)
            .setDepth(D).setInteractive();

        // Panel
        const panel = this.add.graphics().setDepth(D + 1);
        panel.fillStyle(0x0d1b2a, 1);
        panel.fillRoundedRect(cx - 190, cy - 148, 380, 296, 18);
        panel.lineStyle(4, colorHex, 1);
        panel.strokeRoundedRect(cx - 190, cy - 148, 380, 296, 18);

        // Ostrich preview (fresh sprite, so animation works reliably)
        const preview = this.add.sprite(cx, cy - 68, `ostrich_${color}`, 0)
            .setDepth(D + 2).setDisplaySize(120, 120);
        if (this.anims.exists(`idle_${color}`)) preview.play(`idle_${color}`);

        const question = this.add.text(cx, cy + 10,
            `Play as ${color.toUpperCase()}?`, {
                fontFamily: '"Press Start 2P"',
                fontSize: '12px',
                color: '#FFFFFF',
            }).setOrigin(0.5).setDepth(D + 2);

        // Lock in button
        const lockBg = this.add.graphics().setDepth(D + 1);
        lockBg.fillStyle(0x2e7d32, 1);
        lockBg.fillRoundedRect(cx - 175, cy + 58, 152, 50, 10);

        const lockLabel = this.add.text(cx - 99, cy + 83, 'Lock in!', {
            fontFamily: '"Press Start 2P"',
            fontSize: '10px',
            color: '#FFFFFF',
        }).setOrigin(0.5).setDepth(D + 2);

        const lockZone = this.add.zone(cx - 99, cy + 83, 152, 50)
            .setDepth(D + 3).setInteractive();
        lockZone.on('pointerdown', () => {
            this.closePopup();
            this.confirmColor(color);
        });

        // Cancel button
        const cancelBg = this.add.graphics().setDepth(D + 1);
        cancelBg.fillStyle(0x2a2a3a, 1);
        cancelBg.fillRoundedRect(cx + 23, cy + 58, 152, 50, 10);

        const cancelLabel = this.add.text(cx + 99, cy + 83, 'Cancel', {
            fontFamily: '"Press Start 2P"',
            fontSize: '10px',
            color: '#AAAAAA',
        }).setOrigin(0.5).setDepth(D + 2);

        const cancelZone = this.add.zone(cx + 99, cy + 83, 152, 50)
            .setDepth(D + 3).setInteractive();
        cancelZone.on('pointerdown', () => this.closePopup());

        this.activePopupObjects = [
            overlay, panel, preview, question,
            lockBg, lockLabel, lockZone,
            cancelBg, cancelLabel, cancelZone,
        ];
    }

    closePopup() {
        if (this.activePopupObjects) {
            for (const obj of this.activePopupObjects) {
                if (obj && obj.active) obj.destroy();
            }
            this.activePopupObjects = null;
        }
    }

    confirmColor(color) {
        this.selectedColor = color;
        this.socketManager.emitPlayerColorChoice(color);

        // Update own bird immediately via the reliable destroy+recreate path.
        this.setRoleBird(this.playerId, color, true);

        // Refresh button states against last server-known taken set.
        this.updateColorButtons(this.lastKnownTaken);
    }

    updateColorButtons(takenByOthers) {
        for (const [id, { gfx, ring, label, zone, hex }] of Object.entries(this.colorButtons)) {
            const taken = takenByOthers.has(id);
            const isSelected = this.selectedColor === id;

            if (taken) {
                gfx.setAlpha(0.15);
                label.setAlpha(0.15);
                ring.setAlpha(0);
                zone.disableInteractive();
            } else if (isSelected) {
                gfx.setAlpha(1);
                label.setAlpha(1);
                ring.setAlpha(1);
                zone.setInteractive();
                zone.off('pointerdown');
                zone.on('pointerdown', () => {
                    if (this.activePopupObjects) return;
                    this.showColorPopup(id, hex);
                });
            } else {
                const alpha = this.selectedColor ? 0.3 : 1;
                gfx.setAlpha(alpha);
                label.setAlpha(alpha);
                ring.setAlpha(0);
                zone.setInteractive();
                zone.off('pointerdown');
                zone.on('pointerdown', () => {
                    if (this.activePopupObjects) return;
                    this.showColorPopup(id, hex);
                });
            }
        }
    }

    setupSocketListeners(w, h) {
        this.socketManager.on('lobbyUpdate', (data) => {
            const count = data.connected.length;
            const readyArr = Array.isArray(data.ready) ? data.ready : [];
            const readyCount = readyArr.length;
            const colorChoices = data.colorChoices || {};

            // Re-send on reconnect if server dropped our state.
            if (this.selectedColor && !readyArr.includes(this.playerId)) {
                this.socketManager.emitPlayerColorChoice(this.selectedColor);
            }

            this.countText.setText(`${count} / 3 connected`);
            this.readyText.setText(`${readyCount} / 3 chosen`);

            for (const role of ['A', 'B', 'C']) {
                const connected = data.connected.includes(role);
                const isOwnRole = role === this.playerId;
                // Own role: local selectedColor is authoritative so a stale
                // periodic broadcast can't revert the bird mid-flight.
                const chosenColor = (isOwnRole && this.selectedColor)
                    ? this.selectedColor
                    : (colorChoices[role] || null);

                if (this.birdColors[role] !== chosenColor) {
                    // Color changed — recreate the sprite fresh.
                    this.setRoleBird(role, chosenColor, connected);
                } else if (this.birds[role]) {
                    // Same color, just sync the alpha for connection state.
                    this.birds[role].setAlpha(
                        chosenColor
                            ? (connected ? 1 : 0.4)
                            : (connected ? 0.4 : 0.2),
                    );
                }

                if (this.birdLabels[role]) {
                    const baseText = isOwnRole ? `You (${role})` : `Player ${role}`;
                    const suffix = chosenColor ? ' ✓' : '';
                    const labelColor = isOwnRole
                        ? '#FFD700'
                        : (chosenColor ? '#4CAF50' : '#AAAAAA');
                    this.birdLabels[role].setText(baseText + suffix);
                    this.birdLabels[role].setColor(labelColor);
                }
            }

            const takenByOthers = new Set(
                Object.entries(colorChoices)
                    .filter(([pid]) => pid !== this.playerId)
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
            } else if (readyCount < 3) {
                this.statusText.setText('Waiting for other players...');
                this.statusText.setColor('#FFD700');
            } else {
                this.statusText.setText('All players ready!');
                this.statusText.setColor('#4CAF50');
            }
        });

        this.socketManager.on('gameStart', (data) => {
            this.closePopup();
            this.scene.start('Game', {
                socketManager: this.socketManager,
                playerId: data.playerId,
                totalRounds: data.totalRounds,
                startingEggs: data.startingEggs,
                colorChoices: data.colorChoices || {},
            });
        });

        this.socketManager.on('errorMessage', (data) => {
            this.add.text(w / 2, 665, data.message, {
                fontFamily: '"Press Start 2P"',
                fontSize: '12px',
                color: '#F44336',
            }).setOrigin(0.5);
        });
    }

    createCarousel() {
        const w = this.scale.width;

        this.carouselSlides = CAROUSEL_SLIDES;
        this.carouselIndex = 0;
        this.isDragging = false;
        this.isTransitioning = false;

        this.carousel = this.add.container(w / 2, 490);
        const bg = this.add.image(0, 0, 'panel_bg');
        bg.setDisplaySize(680, 180);
        this.carousel.add(bg);

        this.slideContent = this.add.container(0, -20);
        this.carousel.add(this.slideContent);

        this.navDots = [];
        const dotSpacing = 18;
        const dotStartX = -((CAROUSEL_SLIDES.length - 1) * dotSpacing) / 2;
        for (let i = 0; i < CAROUSEL_SLIDES.length; i++) {
            const dotX = w / 2 + dotStartX + i * dotSpacing;
            const dotY = 592;
            const dot = this.add.circle(dotX, dotY, 5, 0x555555);
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
        if (this.activePopupObjects) return; // popup blocks carousel drag
        if (this.isTransitioning) return;
        if (!this.isInCarousel(pointer)) return;

        const dotSpacing = 18;
        const dotStartX = this.scale.width / 2 - ((CAROUSEL_SLIDES.length - 1) * dotSpacing) / 2;
        for (let i = 0; i < CAROUSEL_SLIDES.length; i++) {
            const dx = pointer.x - (dotStartX + i * dotSpacing);
            const dy = pointer.y - 592;
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
