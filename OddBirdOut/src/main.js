import { Boot } from './scenes/Boot.js';
import { Lobby } from './scenes/Lobby.js';
import { Game } from './scenes/Game.js';
import { GameOver } from './scenes/GameOver.js';
import { Reveal } from './scenes/Reveal.js';
import { PreviewBoot } from './scenes/PreviewBoot.js';

const params = new URLSearchParams(window.location.search);
const preview = params.get('preview');
const usePreview = preview && preview !== 'boot';

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
        usePreview ? PreviewBoot : Boot,
        Lobby,
        Game,
        GameOver,
        Reveal,
    ],
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
    },
}

new Phaser.Game(config);
            