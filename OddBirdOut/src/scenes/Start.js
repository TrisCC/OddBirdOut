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
            // already on the start screen — no-op
        };
        this.socketManager.on('gameAborted', onGameAborted);
        this.events.once('shutdown', () => {
            this.socketManager.off('gameAborted', onGameAborted);
        });

        if (!this.textures.exists('obo_title')) {
            this.load.image('obo_title', 'assets/Sprites/OBO title.png');
            this.load.once('complete', () => this.scene.restart());
            this.load.start();
            return;
        }

        const title = this.add.image(w / 2, h / 2 + 50, 'obo_title');
        title.setDisplaySize(w * 0.9, h * 0.9);

        this.tweens.add({
            targets: title,
            scaleX: title.scaleX * 1.03,
            scaleY: title.scaleY * 1.03,
            yoyo: true,
            repeat: -1,
            duration: 1200,
            ease: 'Sine.easeInOut',
        });

        const tapText = this.add.text(w / 2, h / 2 + 200, 'Tap anywhere to start', {
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
