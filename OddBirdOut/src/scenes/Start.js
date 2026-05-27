export class Start extends Phaser.Scene {

    constructor() {
        super('Start');
        this.p1Ready = false;
    }

    preload() {
        this.load.image('background', 'assets/placeholder-background.png');
        this.load.image('logo', 'assets/placeholder-logo.png');
        this.load.image('P1', 'assets/placeholder-ostrich.png');
        this.load.image('ready', 'assets/placeholder-ready.png');
        this.load.image('notready', 'assets/placeholder-notready.png');
    }

    create() {
        const background = this.add.image(640, 360, 'background');
        background.setDisplaySize(1280, 720);

        const logo = this.add.image(640, 250, 'logo');
        logo.setTint(0x000000);
        logo.setScale(0.5);

        // Player avatars
        const P1 = this.add.sprite(this.game.config.width / 2, 450, 'P1');
        const P2 = this.add.sprite(P1.x - 200, 450, 'P1');
        const P3 = this.add.sprite(P1.x + 200, 450, 'P1');
        P1.setScale(0.8);
        P2.setScale(0.5);
        P3.setScale(0.5);

        // Players ready status indicators
        const p1StatusY = 550;
        const p1Status = this.add.image(P1.x, p1StatusY, 'notready');
        p1Status.setScale(0.3);
        this.p1StatusImage = p1Status;

        const p2Status = this.add.image(P2.x, p1StatusY, 'notready');
        p2Status.setScale(0.3);

        const p3Status = this.add.image(P3.x, p1StatusY, 'ready');
        p3Status.setScale(0.3);

        // Ready button for P1
        const readyButton = this.add.rectangle(P1.x, p1StatusY + 60, 100, 40, 0x4a90e2);
        readyButton.setInteractive({ useHandCursor: true });
        readyButton.on('pointerdown', () => {
            this.p1Ready = !this.p1Ready;
            this.p1StatusImage.setTexture(this.p1Ready ? 'ready' : 'notready');
            readyButton.setScale(this.p1Ready ? 0.5 : 1);
            readyButton.setAlpha(this.p1Ready ? 0.3 : 1);
            buttonText.setScale(this.p1Ready ? 0.5 : 1);
            buttonText.setAlpha(this.p1Ready ? 0.3 : 1);
        });

        // Add text to button
        const buttonText = this.add.text(P1.x, p1StatusY + 60, 'Ready?', {
            fontSize: '16px',
            fill: '#ffffff',
            align: 'center'
        });
        buttonText.setOrigin(0.5, 0.5);
        buttonText.setInteractive({ useHandCursor: true });
        buttonText.on('pointerdown', () => {
            this.p1Ready = !this.p1Ready;
            this.p1StatusImage.setTexture(this.p1Ready ? 'ready' : 'notready');
            readyButton.setScale(this.p1Ready ? 0.5 : 1);
            readyButton.setAlpha(this.p1Ready ? 0.3 : 1);
            buttonText.setScale(this.p1Ready ? 0.5 : 1);
            buttonText.setAlpha(this.p1Ready ? 0.3 : 1);
        });

        this.tweens.add({
            targets: logo,
            y: 320,
            duration: 1500,
            ease: 'Sine.inOut',
            yoyo: true,
            loop: -1
        });
    }

    update() {
        
    }
    
}
