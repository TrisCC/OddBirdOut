import { generateAllTextures } from '../PlaceholderAssets.js';
import { SocketManager } from '../SocketManager.js';

export class Boot extends Phaser.Scene {

    constructor() {
        super('Boot');
    }

    preload() {
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

        const socketManager = new SocketManager();
        socketManager.connect(window.location.origin);

        socketManager.on('connected', () => {
            socketManager.on('errorMessage', (data) => {
                this.showError(data.message);
            });

            this.scene.start('Lobby', { socketManager });
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
