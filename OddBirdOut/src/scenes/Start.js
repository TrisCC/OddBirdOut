export class Start extends Phaser.Scene {

    constructor() {
        super('Start');
    }

    init(data) {
        this.socketManager = data.socketManager;
    }

    create() {
        const w = this.scale.width;
        const h = this.scale.height;

        this.creditsOpen = false;

        this.add.image(w / 2, h / 2, 'bg_night').setDisplaySize(w, h);

        // Title placeholder — replace with actual title asset when ready
        const title = this.add.sprite(w / 2, h / 2 - 60, 'heart_frames', 0);
        title.setDisplaySize(220, 220);

        this.tweens.add({
            targets: title,
            scaleX: title.scaleX * 1.06,
            scaleY: title.scaleY * 1.06,
            yoyo: true,
            repeat: -1,
            duration: 900,
            ease: 'Sine.easeInOut',
        });

        const tapText = this.add.text(w / 2, h / 2 + 130, 'Tap anywhere to start', {
            fontFamily: '"Press Start 2P"',
            fontSize: '18px',
            color: '#FFFFFF',
            stroke: '#000000',
            strokeThickness: 4,
        }).setOrigin(0.5);

        this.tweens.add({
            targets: tapText,
            alpha: 0.2,
            yoyo: true,
            repeat: -1,
            duration: 700,
            ease: 'Sine.easeInOut',
        });

        // Tap anywhere to proceed — guarded so credits clicks don't trigger this
        this.input.on('pointerdown', () => {
            if (this.creditsOpen) return;
            this.scene.start('Lobby', { socketManager: this.socketManager });
        });

        this.buildCreditsButton(w, h);
    }

    buildCreditsButton(w, h) {
        const btn = this.add.text(w - 14, h - 14, 'credits', {
            fontFamily: '"Press Start 2P"',
            fontSize: '8px',
            color: '#FFFFFF',
        }).setOrigin(1, 1).setAlpha(0.4).setDepth(10).setInteractive({ useHandCursor: true });

        btn.on('pointerover', () => btn.setAlpha(1));
        btn.on('pointerout', () => btn.setAlpha(0.4));
        btn.on('pointerdown', () => this.showCredits(w, h));
    }

    showCredits(w, h) {
        this.creditsOpen = true;

        const cx = w / 2;
        const cy = h / 2;
        const panelW = 560;
        const panelH = 130;

        const overlay = this.add.rectangle(cx, cy, w, h, 0x000000, 0.6)
            .setDepth(20).setInteractive();

        const panel = this.add.graphics().setDepth(21);
        panel.fillStyle(0x000000, 0.88);
        panel.fillRoundedRect(cx - panelW / 2, cy - panelH / 2, panelW, panelH, 16);

        const heading = this.add.text(cx, cy - 30, 'Music Credits', {
            fontFamily: '"Press Start 2P"',
            fontSize: '10px',
            color: '#FFD700',
        }).setOrigin(0.5).setDepth(22);

        const line1 = this.add.text(cx, cy + 4, 'Music from #Uppbeat (free for Creators!)', {
            fontFamily: '"Press Start 2P"',
            fontSize: '7px',
            color: '#FFFFFF',
        }).setOrigin(0.5).setDepth(22);

        const line2 = this.add.text(cx, cy + 26, 'uppbeat.io/t/richard-bodgers/botswana', {
            fontFamily: '"Press Start 2P"',
            fontSize: '7px',
            color: '#AAAAAA',
        }).setOrigin(0.5).setDepth(22);

        const objects = [overlay, panel, heading, line1, line2];

        overlay.once('pointerdown', () => {
            for (const obj of objects) obj.destroy();
            this.creditsOpen = false;
        });
    }
}
