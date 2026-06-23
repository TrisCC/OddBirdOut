const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');
const config = require('./config');
const { GameRoom } = require('./game/GameRoom');
const { DmxLighting } = require('./lighting/DmxLighting');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(config.STATIC_DIR, {
    setHeaders: (res, filePath) => {
        if (filePath.includes('/assets/Sprites/') || filePath.endsWith('.js') || filePath.endsWith('.html')) {
            res.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
            res.set('Pragma', 'no-cache');
            res.set('Expires', '0');
        }
    }
}));

app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin.html'));
});

const lighting = new DmxLighting();
const gameRoom = new GameRoom(io, lighting);

io.on('connection', (socket) => {
    gameRoom.handleConnection(socket);
});

server.listen(config.PORT, () => {
    console.log(`[${new Date().toISOString()}] Odd Bird Out server running on port ${config.PORT}`);
    console.log(`Static files: ${config.STATIC_DIR}`);
    console.log(`Admin dashboard: http://localhost:${config.PORT}/admin`);
    console.log(`Config: ${config.TOTAL_ROUNDS} rounds, phase1=${config.PHASE1_ROUNDS}, debug=${config.DEBUG_MODE}, DMX=${config.DMX_ENABLED}`);
});

process.on('SIGINT', () => {
    lighting.shutdown();
    process.exit();
});

process.on('SIGTERM', () => {
    lighting.shutdown();
    process.exit();
});
