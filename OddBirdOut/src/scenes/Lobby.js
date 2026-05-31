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

        this.add.text(w / 2, 180, 'Odd Bird Out', {
            fontFamily: '"Press Start 2P"',
            fontSize: '28px',
            color: '#FFD700',
        }).setOrigin(0.5);

        this.add.text(w / 2, 260, `You are Player ${this.socketManager.playerId}`, {
            fontFamily: '"Press Start 2P"',
            fontSize: '16px',
            color: '#FFFFFF',
        }).setOrigin(0.5);

        this.statusText = this.add.text(w / 2, 340, 'Waiting for players...', {
            fontFamily: '"Press Start 2P"',
            fontSize: '14px',
            color: '#AAAAAA',
        }).setOrigin(0.5);

        this.countText = this.add.text(w / 2, 390, '0 / 3 connected', {
            fontFamily: '"Press Start 2P"',
            fontSize: '18px',
            color: '#FFD700',
        }).setOrigin(0.5);

        const birds = [];
        const birdX = [w / 2 - 180, w / 2, w / 2 + 180];
        for (let i = 0; i < 3; i++) {
            const bird = this.add.image(birdX[i], 500, 'ostrich_a');
            bird.setAlpha(0.3);
            birds.push(bird);
        }

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
            this.add.text(w / 2, 600, data.message, {
                fontFamily: '"Press Start 2P"',
                fontSize: '12px',
                color: '#F44336',
            }).setOrigin(0.5);
        });
    }
}
