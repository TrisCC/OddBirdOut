const COLORS = {
    A: 0x4CAF50,
    B: 0x42A5F5,
    C: 0xFF9800,
};

export function generateAllTextures(scene) {
    generateOstrich(scene, 'A', COLORS.A);
    generateOstrich(scene, 'B', COLORS.B);
    generateOstrich(scene, 'C', COLORS.C);
    generateOstrichSad(scene, 'A', COLORS.A);
    generateOstrichSad(scene, 'B', COLORS.B);
    generateOstrichSad(scene, 'C', COLORS.C);
    generateEgg(scene);
    generateHeart(scene);
    generateBrokenHeart(scene);
    generateButton(scene, 'share', 0x4CAF50);
    generateButton(scene, 'ready', 0x4CAF50);
    generatePanelBg(scene);
}

function generateOstrich(scene, id, color) {
    const g = scene.add.graphics();
    const w = 80;
    const h = 100;

    g.fillStyle(color);
    g.fillRoundedRect(10, 20, 60, 60, 8);

    g.fillStyle(0x000000);
    g.fillRect(18, 10, 12, 20);
    g.fillRect(50, 10, 12, 20);

    g.fillStyle(0xFFFFFF);
    g.fillRect(18, 30, 16, 16);
    g.fillRect(48, 30, 16, 16);

    g.fillStyle(0x000000);
    g.fillCircle(26, 38, 4);
    g.fillCircle(56, 38, 4);

    g.fillStyle(0xFFA000);
    g.fillTriangle(36, 46, 44, 46, 40, 52);

    g.fillStyle(color);
    g.fillRect(28, 80, 8, 18);
    g.fillRect(44, 80, 8, 18);

    g.generateTexture(`ostrich_${id.toLowerCase()}`, w, h);
    g.destroy();
}

function generateOstrichSad(scene, id, color) {
    const g = scene.add.graphics();
    const w = 80;
    const h = 100;

    g.fillStyle(color);
    g.fillRoundedRect(10, 20, 60, 60, 8);

    g.fillStyle(0x000000);
    g.fillRect(18, 10, 12, 20);
    g.fillRect(50, 10, 12, 20);

    g.fillStyle(0xFFFFFF);
    g.fillRect(18, 30, 16, 16);
    g.fillRect(48, 30, 16, 16);

    g.fillStyle(0x000000);
    g.fillRect(20, 44, 10, 3);
    g.fillRect(50, 44, 10, 3);

    g.fillStyle(0xFFA000);
    g.fillTriangle(36, 46, 44, 46, 40, 56);

    g.fillStyle(color);
    g.fillRect(28, 80, 8, 18);
    g.fillRect(44, 80, 8, 18);

    g.generateTexture(`ostrich_${id.toLowerCase()}_sad`, w, h);
    g.destroy();
}

function generateEgg(scene) {
    const g = scene.add.graphics();
    g.fillStyle(0xF5EFE0);
    g.fillEllipse(10, 12, 16, 20);
    g.fillStyle(0xD9C7A3);
    g.fillCircle(7, 7, 1.5);
    g.fillCircle(13, 11, 1.5);
    g.fillCircle(8, 16, 1.5);
    g.fillCircle(14, 17, 1.5);
    g.generateTexture('egg', 20, 24);
    g.destroy();
}

function generateHeart(scene) {
    const g = scene.add.graphics();
    g.fillStyle(0xE53935);
    g.fillCircle(10, 8, 8);
    g.fillCircle(22, 8, 8);
    g.fillTriangle(2, 10, 30, 10, 16, 28);
    g.generateTexture('heart', 32, 30);
    g.destroy();
}

function generateBrokenHeart(scene) {
    const g = scene.add.graphics();
    g.fillStyle(0x757575);
    g.fillCircle(10, 8, 8);
    g.fillCircle(22, 8, 8);
    g.fillTriangle(2, 10, 30, 10, 16, 28);
    g.lineStyle(3, 0x424242);
    g.lineBetween(8, 0, 24, 28);
    g.generateTexture('broken_heart', 32, 30);
    g.destroy();
}

function generateButton(scene, id, color) {
    const g = scene.add.graphics();
    const w = 180;
    const h = 76;

    g.fillStyle(color);
    g.fillRoundedRect(0, 0, w, h, 12);

    g.fillStyle(0x000000, 0.15);
    g.fillRoundedRect(2, 2, w - 4, h / 2 - 2, { tl: 10, tr: 10, bl: 0, br: 0 });

    g.generateTexture(`btn_${id}`, w, h);
    g.destroy();
}

function generatePanelBg(scene) {
    const g = scene.add.graphics();
    g.fillStyle(0x1A0F0A, 0.92);
    g.fillRect(0, 0, 8, 8);
    g.generateTexture('panel_bg', 8, 8);
    g.destroy();
}
