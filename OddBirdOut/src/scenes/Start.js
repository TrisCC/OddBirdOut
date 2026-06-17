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
        const panelW = 580;
        const panelH = 190;

        const t = (x, y, str, size, color) => this.add.text(x, y, str, {
            fontFamily: '"Press Start 2P"', fontSize: size, color,
        }).setOrigin(0.5).setDepth(22);

        const overlay = this.add.rectangle(cx, cy, w, h, 0x000000, 0.6).setDepth(20).setInteractive();
        const panel = this.add.graphics().setDepth(21);
        panel.fillStyle(0x000000, 0.88);
        panel.fillRoundedRect(cx - panelW / 2, cy - panelH / 2, panelW, panelH, 16);

        const objects = [
            overlay,
            panel,
            t(cx, cy - 68, 'Music Credits',                          '10px', '#FFD700'),
            t(cx, cy - 40, 'Music from #Uppbeat (free for Creators!)', '7px', '#FFFFFF'),
            t(cx, cy - 22, 'uppbeat.io/t/richard-bodgers/botswana',    '7px', '#AAAAAA'),
            t(cx, cy +  4, 'Music from #Uppbeat (free for Creators!)', '7px', '#FFFFFF'),
            t(cx, cy + 22, 'uppbeat.io/t/sky-toes/sandbox-serenade',   '7px', '#AAAAAA'),
            t(cx, cy + 40, 'License: ZPTRS0EXAS3QL0CQ',               '7px', '#666666'),
            t(cx, cy + 70, 'tap to close',                             '7px', '#555555'),
        ];

        overlay.once('pointerdown', () => {
            for (const obj of objects) obj.destroy();
            this.creditsOpen = false;
        });
    }
}
