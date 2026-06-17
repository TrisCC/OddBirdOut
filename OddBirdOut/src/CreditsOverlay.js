export function addCreditsButton(scene) {
    const w = scene.scale.width;
    const h = scene.scale.height;

    const btn = scene.add.text(w - 14, h - 14, 'credits', {
        fontFamily: '"Press Start 2P"',
        fontSize: '8px',
        color: '#FFFFFF',
    }).setOrigin(1, 1).setAlpha(0.4).setDepth(50).setInteractive({ useHandCursor: true });

    btn.on('pointerover', () => btn.setAlpha(1));
    btn.on('pointerout',  () => btn.setAlpha(0.4));
    btn.on('pointerdown', (pointer) => {
        pointer.event.stopPropagation();
        showCredits(scene, w, h);
    });
}

function showCredits(scene, w, h) {
    const cx = w / 2;
    const cy = h / 2;
    const panelW = 580;
    const panelH = 190;

    const t = (x, y, str, size, color) => scene.add.text(x, y, str, {
        fontFamily: '"Press Start 2P"', fontSize: size, color,
    }).setOrigin(0.5).setDepth(52);

    const overlay = scene.add.rectangle(cx, cy, w, h, 0x000000, 0.6)
        .setDepth(50).setInteractive();

    const panel = scene.add.graphics().setDepth(51);
    panel.fillStyle(0x000000, 0.88);
    panel.fillRoundedRect(cx - panelW / 2, cy - panelH / 2, panelW, panelH, 16);

    const objects = [
        overlay,
        panel,
        t(cx, cy - 68, 'Music Credits',                           '10px', '#FFD700'),
        t(cx, cy - 40, 'Music from #Uppbeat (free for Creators!)', '7px',  '#FFFFFF'),
        t(cx, cy - 22, 'uppbeat.io/t/richard-bodgers/botswana',    '7px',  '#AAAAAA'),
        t(cx, cy +  4, 'Music from #Uppbeat (free for Creators!)', '7px',  '#FFFFFF'),
        t(cx, cy + 22, 'uppbeat.io/t/sky-toes/sandbox-serenade',   '7px',  '#AAAAAA'),
        t(cx, cy + 40, 'License: ZPTRS0EXAS3QL0CQ',               '7px',  '#666666'),
        t(cx, cy + 70, 'tap to close',                             '7px',  '#555555'),
    ];

    overlay.once('pointerdown', () => {
        for (const obj of objects) obj.destroy();
    });
}
