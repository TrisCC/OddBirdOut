const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const config = require('./config');
const { GameRoom } = require('./game/GameRoom');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(config.STATIC_DIR));

const gameRoom = new GameRoom(io);

io.on('connection', (socket) => {
    gameRoom.handleConnection(socket);
});

server.listen(config.PORT, () => {
    console.log(`Odd Bird Out server running on port ${config.PORT}`);
    console.log(`Serving static files from ${config.STATIC_DIR}`);
});
