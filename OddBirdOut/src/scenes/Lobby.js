const CAROUSEL_SLIDES = [
    {
        title: 'Choose Your Action',
        desc: 'Share seeds, peck to steal, or hide to block attacks',
        render(scene, container) {
            const btnScale = 0.42;
            const btnSpacing = 125;
            const labelStyle = { fontFamily: '"Press Start 2P"', fontSize: '8px', color: '#FFFFFF' };

            const shareBtn = scene.add.image(-btnSpacing, 0, 'btn_share').setScale(btnScale);
            const peckBtn = scene.add.image(0, 0, 'btn_peck').setScale(btnScale);
            const hideBtn = scene.add.image(btnSpacing, 0, 'btn_hide').setScale(btnScale);
            const shareLabel = scene.add.text(-btnSpacing, 28, 'Share', labelStyle).setOrigin(0.5);
            const peckLabel = scene.add.text(0, 28, 'Peck', labelStyle).setOrigin(0.5);
            const hideLabel = scene.add.text(btnSpacing, 28, 'Hide', labelStyle).setOrigin(0.5);

            container.add([shareBtn, peckBtn, hideBtn, shareLabel, peckLabel, hideLabel]);
        },
    },
    {
        title: 'Target Another Player',
        desc: 'After choosing an action, pick which player to target',
        render(scene, container) {
            const labelStyle = { fontFamily: '"Press Start 2P"', fontSize: '8px', color: '#FFFFFF' };
            const arrowStyle = { fontFamily: '"Press Start 2P"', fontSize: '10px', color: '#FFD700' };

            const bird = scene.add.image(0, 0, 'ostrich_a').setScale(0.7);
            const targetA = scene.add.image(-170, 0, 'btn_target_a').setScale(0.4);
            const targetC = scene.add.image(170, 0, 'btn_target_c').setScale(0.4);
            const labelB = scene.add.text(-170, 28, 'Player B', labelStyle).setOrigin(0.5);
            const labelYou = scene.add.text(0, 40, 'You', labelStyle).setOrigin(0.5);
            const labelC = scene.add.text(170, 28, 'Player C', labelStyle).setOrigin(0.5);
            const arrowL = scene.add.text(-95, -5, '>', arrowStyle).setOrigin(0.5);
            const arrowR = scene.add.text(95, -5, '<', arrowStyle).setOrigin(0.5);

            container.add([targetA, targetC, bird, labelB, labelYou, labelC, arrowL, arrowR]);
        },
    },
    {
        title: 'Collect Seeds to Win',
        desc: 'Win seeds each round. The player with the most wins the Golden Egg',
        render(scene, container) {
            const items = [];
            for (let i = 0; i < 5; i++) {
                const seed = scene.add.image(-200 + i * 90, 0, 'seed').setScale(0.9);
                items.push(seed);
            }
            const egg = scene.add.image(240, 0, 'golden_egg').setScale(0.7);
            items.push(egg);

            const labelStyle = { fontFamily: '"Press Start 2P"', fontSize: '8px', color: '#FFD700' };
            const seedsLabel = scene.add.text(-200, 22, '5 seeds', labelStyle).setOrigin(0.5);
            const prizeLabel = scene.add.text(240, 22, 'Prize', labelStyle).setOrigin(0.5);
            items.push(seedsLabel, prizeLabel);

            const plusStyle = { fontFamily: '"Press Start 2P"', fontSize: '10px', color: '#4CAF50' };
            for (let i = 1; i < 5; i++) {
                const plus = scene.add.text(-200 + i * 90, -12, '+', plusStyle).setOrigin(0.5);
                items.push(plus);
            }

            container.add(items);
        },
    },
    {
        title: '12 Rounds',
        desc: 'Make your choice before time runs out each round',
        render(scene, container) {
            const roundStyle = { fontFamily: '"Press Start 2P"', fontSize: '11px', color: '#FFD700' };
            const roundText = scene.add.text(0, -18, 'Round  4 / 12', roundStyle).setOrigin(0.5);

            const barW = 280;
            const barH = 10;
            const barX = -barW / 2;
            const barY = 2;

            const barBg = scene.add.graphics();
            barBg.fillStyle(0x333333);
            barBg.fillRoundedRect(barX, barY, barW, barH, 4);

            const barFill = scene.add.graphics();
            barFill.fillStyle(0x4CAF50);
            barFill.fillRoundedRect(barX, barY, barW * 0.4, barH, 4);

            const tickStyle = { fontFamily: '"Press Start 2P"', fontSize: '9px', color: '#AAAAAA' };
            const secsLeft = scene.add.text(0, 18, '~15 seconds', tickStyle).setOrigin(0.5);

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

        this.add.rectangle(w / 2, h / 2, w, h, 0x1A0F0A);

        this.add.text(w / 2, 95, 'Odd Bird Out', {
            fontFamily: '"Press Start 2P"',
            fontSize: '28px',
            color: '#FFD700',
        }).setOrigin(0.5);

        this.add.text(w / 2, 145, `You are Player ${this.socketManager.playerId}`, {
            fontFamily: '"Press Start 2P"',
            fontSize: '16px',
            color: '#FFFFFF',
        }).setOrigin(0.5);

        this.statusText = this.add.text(w / 2, 190, 'Waiting for players...', {
            fontFamily: '"Press Start 2P"',
            fontSize: '14px',
            color: '#AAAAAA',
        }).setOrigin(0.5);

        this.countText = this.add.text(w / 2, 230, '0 / 3 connected', {
            fontFamily: '"Press Start 2P"',
            fontSize: '18px',
            color: '#FFD700',
        }).setOrigin(0.5);

        const birds = [];
        const birdX = [w / 2 - 160, w / 2, w / 2 + 160];
        for (let i = 0; i < 3; i++) {
            const bird = this.add.image(birdX[i], 315, 'ostrich_a');
            bird.setAlpha(0.3);
            bird.setScale(0.72);
            birds.push(bird);
        }

        this.createCarousel();

        this.socketManager.emitPlayerReady();

        this.socketManager.on('lobbyUpdate', (data) => {
            const count = data.connected.length;
            this.countText.setText(`${count} / 3 connected`);

            for (let i = 0; i < 3; i++) {
                birds[i].setAlpha(i < count ? 1 : 0.3);
            }

            if (count === 3) {
                this.statusText.setText('All players connected!');
                this.statusText.setColor('#4CAF50');
            }
        });

        this.socketManager.on('gameStart', (data) => {
            this.scene.start('Game', {
                socketManager: this.socketManager,
                playerId: data.playerId,
                totalRounds: data.totalRounds,
                startingSeeds: data.startingSeeds,
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

        this.carousel = this.add.container(w / 2, 480);

        const bg = this.add.image(0, 0, 'panel_bg');
        bg.setDisplaySize(680, 200);
        this.carousel.add(bg);

        this.slideContent = this.add.container(0, -20);
        this.carousel.add(this.slideContent);

        this.navDots = [];
        const dotSpacing = 18;
        const dotStartX = -((CAROUSEL_SLIDES.length - 1) * dotSpacing) / 2;
        for (let i = 0; i < CAROUSEL_SLIDES.length; i++) {
            const dotX = w / 2 + dotStartX + i * dotSpacing;
            const dotY = 598;
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
               pointer.y > cy - 108 && pointer.y < cy + 108;
    }

    onPointerDown(pointer) {
        if (this.isTransitioning) return;
        if (!this.isInCarousel(pointer)) return;

        const dotSpacing = 18;
        const dotStartX = this.scale.width / 2 - ((CAROUSEL_SLIDES.length - 1) * dotSpacing) / 2;
        for (let i = 0; i < CAROUSEL_SLIDES.length; i++) {
            const dx = pointer.x - (dotStartX + i * dotSpacing);
            const dy = pointer.y - 598;
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
                this.carouselIndex = ((newIndex % this.carouselSlides.length) + this.carouselSlides.length) % this.carouselSlides.length;
                this.slideContent.removeAll(true);
                this.slideContent.x = -exitX;

                const slide = this.carouselSlides[this.carouselIndex];
                slide.render(this, this.slideContent);

                const titleStyle = { fontFamily: '"Press Start 2P"', fontSize: '10px', color: '#FFFFFF' };
                const title = this.add.text(0, 80, slide.title, titleStyle).setOrigin(0.5);
                this.slideContent.add(title);

                const descStyle = { fontFamily: '"Press Start 2P"', fontSize: '7px', color: '#CCCCCC' };
                const desc = this.add.text(0, 96, slide.desc, descStyle).setOrigin(0.5);
                this.slideContent.add(desc);

                this.updateDots();

                this.tweens.add({
                    targets: this.slideContent,
                    x: 0,
                    duration: 180,
                    ease: 'Cubic.easeOut',
                    onComplete: () => {
                        this.isTransitioning = false;
                    },
                });
            },
        });
    }

    showSlide(index) {
        this.carouselIndex = ((index % this.carouselSlides.length) + this.carouselSlides.length) % this.carouselSlides.length;
        this.slideContent.removeAll(true);

        const slide = this.carouselSlides[this.carouselIndex];
        slide.render(this, this.slideContent);

        const titleStyle = { fontFamily: '"Press Start 2P"', fontSize: '10px', color: '#FFFFFF' };
        const title = this.add.text(0, 80, slide.title, titleStyle).setOrigin(0.5);
        this.slideContent.add(title);

        const descStyle = { fontFamily: '"Press Start 2P"', fontSize: '7px', color: '#CCCCCC' };
        const desc = this.add.text(0, 96, slide.desc, descStyle).setOrigin(0.5);
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
