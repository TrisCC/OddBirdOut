import { generateAllTextures } from '../PlaceholderAssets.js';
import { SocketManager } from '../SocketManager.js';

export class Boot extends Phaser.Scene {

    constructor() {
        super('Boot');
    }

    preload() {
        this.load.image('bg_sunset', 'assets/Sprites/bg_sunset.png');
        this.load.image('bg_night', 'assets/Sprites/bg_night.png');
        this.load.image('bg_day2night', 'assets/Sprites/bg_day2night.png');
        this.load.image('bg_day', 'assets/Sprites/bg_day.png');
        this.load.image('obo_title', 'assets/Sprites/OBO title.png?v=3');

        // Each PNG is 1920×640 with 3 animation frames of 640×640 each.
        const FRAME = { frameWidth: 640, frameHeight: 640 };
        // heart.png is 2560×640 with 4 animation frames of 640×640 each.
        this.load.spritesheet('heart_frames', 'assets/Sprites/heart.png', FRAME);
        // 1egg.png is 2560×640 with 4 animation frames; 2–6 and 8 are single 640×640 images.
        this.load.spritesheet('egg_1', 'assets/Sprites/1egg.png', FRAME);
        for (const n of [2, 3, 4, 5, 6, 8]) {
            this.load.image(`egg_${n}`, `assets/Sprites/${n}egg.png`);
        }
        this.load.spritesheet('ostrich_blue',   'assets/Sprites/ostrich blue.png',   FRAME);
        this.load.spritesheet('ostrich_cyan',   'assets/Sprites/ostrich cyan.png',   FRAME);
        this.load.spritesheet('ostrich_green',  'assets/Sprites/ostrich green.png',  FRAME);
        this.load.spritesheet('ostrich_orange', 'assets/Sprites/ostrich orange.png', FRAME);
        this.load.spritesheet('ostrich_pink',   'assets/Sprites/ostrich pink.png',   FRAME);
        this.load.spritesheet('ostrich_purple', 'assets/Sprites/ostrich purple.png', FRAME);
        this.load.spritesheet('ostrich_red',    'assets/Sprites/ostrich red.png',    FRAME);
        this.load.spritesheet('ostrich_yellow', 'assets/Sprites/ostrich yellow.png', FRAME);

        this.load.spritesheet('ostrich_blue_sand',   'assets/Sprites/blue ostrich in sand.png',   FRAME);
        this.load.spritesheet('ostrich_cyan_sand',   'assets/Sprites/cyan ostrich in sand.png',   FRAME);
        this.load.spritesheet('ostrich_green_sand',  'assets/Sprites/green ostrich in sand.png',  FRAME);
        this.load.spritesheet('ostrich_orange_sand', 'assets/Sprites/orange ostrich in sand.png', FRAME);
        this.load.spritesheet('ostrich_pink_sand',   'assets/Sprites/pink ostrich in sand.png',   FRAME);
        this.load.spritesheet('ostrich_purple_sand', 'assets/Sprites/purple ostrich in sand.png', FRAME);
        this.load.spritesheet('ostrich_red_sand',    'assets/Sprites/red ostrich in sand.png',    FRAME);
        this.load.spritesheet('ostrich_yellow_sand', 'assets/Sprites/yellow ostrich in sand.png', FRAME);

        const centerX = this.scale.width / 2;
        const centerY = this.scale.height / 2;

        const loadingText = this.add.text(centerX, centerY - 40, 'Loading...', {
            fontFamily: '"Press Start 2P"',
            fontSize: '16px',
            color: '#FFD700',
        }).setOrigin(0.5);

        const progressBar = this.add.graphics();
        const BAR_W = 400;
        const BAR_H = 24;
        const barX = centerX - BAR_W / 2;
        const barY = centerY + 10;

        this.load.on('progress', (value) => {
            progressBar.clear();
            progressBar.fillStyle(0x333333);
            progressBar.fillRect(barX, barY, BAR_W, BAR_H);
            progressBar.fillStyle(0xFFD700);
            progressBar.fillRect(barX + 2, barY + 2, (BAR_W - 4) * value, BAR_H - 4);
        });

        this.load.on('complete', () => {
            progressBar.destroy();
            loadingText.destroy();
        });
    }

    create() {
        generateAllTextures(this);

        this.anims.create({
            key: 'egg_count_1',
            frames: this.anims.generateFrameNumbers('egg_1', { start: 0, end: 3 }),
            frameRate: 8,
            repeat: 0,
        });

        this.anims.create({
            key: 'heart_burst',
            frames: this.anims.generateFrameNumbers('heart_frames', { start: 0, end: 3 }),
            frameRate: 8,
            repeat: 0,
        });

        // Register idle animations for all 8 ostrich colours (global to the game).
        for (const color of ['blue', 'cyan', 'green', 'orange', 'pink', 'purple', 'red', 'yellow']) {
            this.anims.create({
                key: `idle_${color}`,
                frames: this.anims.generateFrameNumbers(`ostrich_${color}`, { start: 0, end: 2 }),
                frameRate: 4,
                repeat: -1,
            });
        }

        for (const color of ['blue', 'cyan', 'green', 'orange', 'pink', 'purple', 'red', 'yellow']) {
            this.anims.create({
                key: `sand_${color}`,
                frames: this.anims.generateFrameNumbers(`ostrich_${color}_sand`, { start: 0, end: 5 }),
                frameRate: 6,
                repeat: 0,
            });
        }

        const socketManager = new SocketManager();
        socketManager.connect(window.location.origin);

        socketManager.on('connected', () => {
            socketManager.on('errorMessage', (data) => {
                this.showError(data.message);
            });

            this.scene.start('Start', { socketManager });
        });

        socketManager.on('disconnected', () => {
            this.showError('Connection lost. Refresh the page to try again.');
        });
    }

    showError(message) {
        const centerX = this.scale.width / 2;
        const centerY = this.scale.height / 2;

        this.add.text(centerX, centerY, message, {
            fontFamily: '"Press Start 2P"',
            fontSize: '14px',
            color: '#F44336',
            align: 'center',
            wordWrap: { width: 600 },
        }).setOrigin(0.5).setDepth(100);
    }
}
