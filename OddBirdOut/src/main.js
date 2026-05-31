import { Boot } from './scenes/Boot.js';
import { Lobby } from './scenes/Lobby.js';
import { Game } from './scenes/Game.js';
import { Reveal } from './scenes/Reveal.js';

const config = {
    type: Phaser.AUTO,
    title: 'OddBirdOut',
    description: '',
    parent: 'game-container',
    width: 1280,
    height: 720,
    backgroundColor: '#2B1E10',
    pixelArt: true,
    scene: [
        Boot,
        Lobby,
        Game,
        Reveal,
    ],
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
    },
}

new Phaser.Game(config);
            