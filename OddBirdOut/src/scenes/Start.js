import { addCreditsButton } from '../CreditsOverlay.js';

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

        this.add.image(w / 2, h / 2, 'bg_night').setDisplaySize(w, h);

        const onGameAborted = () => {
            this.scene.start('Lobby', { socketManager: this.socketManager });
        };
        this.socketManager.on('gameAborted', onGameAborted);
        this.events.once('shutdown', () => {
            this.socketManager.off('gameAborted', onGameAborted);
        });

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

        this.input.on('pointerdown', () => {
            this.scene.start('Lobby', { socketManager: this.socketManager });
        });

        addCreditsButton(this);
    }
}
