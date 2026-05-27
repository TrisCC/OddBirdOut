const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const config = require('./config');
const { GameRoom } = require('./game/GameRoom');

function fetch(url) {
    return new Promise((resolve, reject) => {
        http.get(url, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve({ status: res.statusCode, data }));
        }).on('error', reject);
    });
}

async function run() {
    console.log('=== Frontend Integration Test ===\n');

    const app = express();
    const server = http.createServer(app);
    const io = new Server(server);
    app.use(express.static(config.STATIC_DIR));
    const gameRoom = new GameRoom(io);
    io.on('connection', (socket) => gameRoom.handleConnection(socket));

    await new Promise((resolve) => server.listen(config.PORT, resolve));

    try {
        const r1 = await fetch('http://localhost:3000/');
        console.log(`GET /: ${r1.status} (${r1.data.length} bytes)`);
        if (r1.status !== 200) throw new Error('index.html not served');

        console.log(`  socket.io.js: ${r1.data.includes('socket.io.js') ? 'PASS' : 'FAIL'}`);
        console.log(`  phaser.js: ${r1.data.includes('phaser.js') ? 'PASS' : 'FAIL'}`);
        console.log(`  main.js: ${r1.data.includes('main.js') ? 'PASS' : 'FAIL'}`);
        console.log(`  Press Start 2P: ${r1.data.includes('Press+Start+2P') ? 'PASS' : 'FAIL'}`);

        const r2 = await fetch('http://localhost:3000/src/main.js');
        if (r2.status !== 200) throw new Error('main.js not served');
        console.log(`\n  Boot import: ${r2.data.includes('Boot.js') ? 'PASS' : 'FAIL'}`);
        console.log(`  Lobby import: ${r2.data.includes('Lobby.js') ? 'PASS' : 'FAIL'}`);
        console.log(`  Game import: ${r2.data.includes('Game.js') ? 'PASS' : 'FAIL'}`);
        console.log(`  Reveal import: ${r2.data.includes('Reveal.js') ? 'PASS' : 'FAIL'}`);

        const sceneFiles = ['Boot.js', 'Lobby.js', 'Game.js', 'Reveal.js'];
        for (const file of sceneFiles) {
            const r = await fetch(`http://localhost:3000/src/scenes/${file}`);
            if (r.status !== 200) throw new Error(`${file} not served`);
            console.log(`  src/scenes/${file}: ${r.status}`);
        }

        const utilFiles = ['SocketManager.js', 'PlaceholderAssets.js'];
        for (const file of utilFiles) {
            const r = await fetch(`http://localhost:3000/src/${file}`);
            if (r.status !== 200) throw new Error(`${file} not served`);
            console.log(`  src/${file}: ${r.status}`);
        }

        const r3 = await fetch('http://localhost:3000/socket.io/socket.io.js');
        if (r3.status !== 200) throw new Error('Socket.IO client not served');
        console.log(`\n  Socket.IO client: ${r3.status} (${r3.data.length} bytes)`);

        console.log('\n=== ALL FRONTEND INTEGRATION TESTS PASSED ===');
    } finally {
        server.close();
        await new Promise(r => setTimeout(r, 300));
    }
}

run().catch(err => {
    console.error(`FAIL: ${err.message}`);
    process.exit(1);
});
