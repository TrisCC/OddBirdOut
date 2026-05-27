export class Start extends Phaser.Scene {

    constructor() {
        super('Start');
    }

    preload() {
        this.load.image('background', 'assets/placeholder-background.png');
        this.load.image('logo', 'assets/placeholder-logo.png');
        this.load.image('P1', 'assets/placeholder-ostrich.png');
    }

    create() {
        const background = this.add.image(640, 360, 'background');
        background.setDisplaySize(1280, 720);

        const logo = this.add.image(640, 250, 'logo');
        logo.setTint(0x000000);
        logo.setScale(0.5);

        const P1 = this.add.sprite(640, 450, 'P1');

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
