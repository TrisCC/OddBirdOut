const config = require('../config');
const { RoundResolver } = require('./RoundResolver');

const VALID_ROLES = ['A', 'B', 'C'];

/**
 * GameRoom manages the three player sockets, admin sockets, and the
 * RoundResolver. It also runs a periodic state broadcast so all connected
 * clients stay in sync even if an individual event is missed.
 */
class GameRoom {

    constructor(io) {
        this.io = io;
        this.players = {};
        this.readyPlayers = new Set();
        this.colorChoices = {};
        this.roundResolver = null;
        this.reconnectTimers = {};
        this.adminSockets = new Set();
        this.stateBroadcastTimer = null;

        this.VALID_COLORS = ['blue', 'cyan', 'green', 'orange', 'pink', 'purple', 'red', 'yellow'];

        this.startStateBroadcast();
    }

    /** Starts a periodic broadcast of the current lobby/game state.
     *  Interval depends on the current stage (lobby / active / post-game). */
    startStateBroadcast() {
        this.stopStateBroadcast();

        const scheduleNext = () => {
            this.broadcastLobbyUpdate();
            const interval = this.getBroadcastIntervalMs();
            this.stateBroadcastTimer = setTimeout(scheduleNext, interval);
        };

        scheduleNext();
    }

    /** Clears the active state broadcast timer. */
    stopStateBroadcast() {
        if (this.stateBroadcastTimer) {
            clearTimeout(this.stateBroadcastTimer);
            this.stateBroadcastTimer = null;
        }
    }

    /** Returns the appropriate polling interval for the current game stage. */
    getBroadcastIntervalMs() {
        if (!this.roundResolver) {
            return config.LOBBY_POLL_INTERVAL_MS;
        }
        if (this.roundResolver.gameActive) {
            return config.GAME_POLL_INTERVAL_MS;
        }
        return config.POSTGAME_POLL_INTERVAL_MS;
    }

    handleConnection(socket) {
        if (socket.handshake.query.admin === 'true') {
            this.adminSockets.add(socket.id);
            socket.on('adminReset', () => this.forceReset());
            socket.on('adminStart', () => this.adminStartGame());
            socket.on('adminForceStart', () => this.adminForceStartGame());
            socket.on('disconnect', () => this.adminSockets.delete(socket.id));
            socket.emit('adminState', this.getAdminState());
            return;
        }

        const playerId = (socket.handshake.query.player || '').toUpperCase();

        if (!VALID_ROLES.includes(playerId)) {
            socket.emit('errorMessage', { message: 'Invalid role. Use ?player=A, B, or C' });
            socket.disconnect(true);
            return;
        }

        if (this.reconnectTimers[playerId]) {
            this.handleReconnect(socket, playerId);
            return;
        }

        if (this.players[playerId]) {
            socket.emit('errorMessage', { message: `Role ${playerId} is already taken` });
            socket.disconnect(true);
            return;
        }

        this.players[playerId] = socket.id;

        socket.on('playerReady', () => this.onPlayerReady(playerId));
        socket.on('playerColorChoice', (data) => this.onPlayerColorChoice(playerId, data && data.color));
        socket.on('playerAction', (data) => this.onPlayerAction(playerId, data));
        socket.on('requestLobbyState', () => socket.emit('lobbyUpdate', this.getLobbyState()));
        socket.on('heartbeat', () => socket.emit('heartbeatAck', { timestamp: Date.now() }));
        socket.on('disconnect', () => this.onDisconnect(socket, playerId));

        this.broadcastLobbyUpdate();
    }

    handleReconnect(socket, playerId) {
        clearTimeout(this.reconnectTimers[playerId]);
        delete this.reconnectTimers[playerId];

        this.players[playerId] = socket.id;

        socket.on('playerReady', () => {
            this.readyPlayers.add(playerId);
            if (this.roundResolver) {
                this.roundResolver.handleReconnect(playerId);
            }
        });
        socket.on('playerColorChoice', (data) => this.onPlayerColorChoice(playerId, data && data.color));
        socket.on('playerAction', (data) => this.onPlayerAction(playerId, data));
        socket.on('requestLobbyState', () => socket.emit('lobbyUpdate', this.getLobbyState()));
        socket.on('heartbeat', () => socket.emit('heartbeatAck', { timestamp: Date.now() }));
        socket.on('disconnect', () => this.onDisconnect(socket, playerId));

        this.broadcastLobbyUpdate();

        if (this.roundResolver) {
            this.roundResolver.handleReconnect(playerId);
        }
    }

    onPlayerReady(playerId) {
        this.readyPlayers.add(playerId);
        this.broadcastLobbyUpdate();
    }

    onPlayerColorChoice(playerId, color) {
        if (!this.VALID_COLORS.includes(color)) return;

        // Reject if another player already holds this color
        for (const [pid, col] of Object.entries(this.colorChoices)) {
            if (col === color && pid !== playerId) return;
        }

        this.colorChoices[playerId] = color;
        this.readyPlayers.add(playerId);
        this.broadcastLobbyUpdate();
    }

    onPlayerAction(playerId, data) {
        if (!this.roundResolver) return;
        if (!data || typeof data.action !== 'string') return;
        const { action, target } = data;
        this.roundResolver.submitPlayerAction(playerId, action, target);
    }

    onDisconnect(socket, playerId) {
        delete this.players[playerId];
        this.readyPlayers.delete(playerId);

        if (this.roundResolver) {
            this.roundResolver.handleDisconnect(playerId);
        }

        this.reconnectTimers[playerId] = setTimeout(() => {
            delete this.reconnectTimers[playerId];
            if (this.roundResolver) {
                this.endGameDueToDisconnect(playerId);
            }
            this.broadcastLobbyUpdate();
        }, config.RECONNECT_TIMEOUT_MS);

        this.broadcastLobbyUpdate();
    }

    startGame() {
        this.roundResolver = new RoundResolver(this.io, { ...this.players });
        this.roundResolver.setAdminCallback((data) => {
            this.broadcastToAdmins('adminRoundResult', data);
        });

        for (const playerId of VALID_ROLES) {
            const socketId = this.players[playerId];
            if (socketId) {
                this.io.to(socketId).emit('gameStart', {
                    playerId,
                    totalRounds: config.TOTAL_ROUNDS,
                    startingEggs: config.STARTING_EGGS,
                    colorChoices: { ...this.colorChoices },
                });
            }
        }

        this.roundResolver.startGame();
    }

    endGameDueToDisconnect(playerId) {
        this.broadcastToAll('gameAborted', {
            reason: `Player ${playerId} disconnected and did not reconnect.`,
        });
        this.reset();
    }

    broadcastToAll(event, data) {
        this.io.emit(event, data);
    }

    getLobbyState() {
        const connected = VALID_ROLES.filter(r => this.players[r]);
        const ready = [...this.readyPlayers];
        return {
            connected,
            ready,
            colorChoices: { ...this.colorChoices },
            total: 3,
        };
    }

    broadcastLobbyUpdate() {
        this.io.emit('lobbyUpdate', this.getLobbyState());
        this.broadcastToAdmins('adminState', this.getAdminState());
    }

    reset() {
        this.roundResolver = null;
        this.readyPlayers.clear();
        this.colorChoices = {};
        this.players = {};
        for (const timer of Object.values(this.reconnectTimers)) {
            clearTimeout(timer);
        }
        this.reconnectTimers = {};
        this.broadcastLobbyUpdate();
    }

    forceReset() {
        if (this.roundResolver) {
            this.roundResolver.forceEnd();
        }
        this.broadcastToAll('gameAborted', {
            reason: 'Game reset by admin.',
        });
        this.reset();
    }

    adminStartGame() {
        if (this.roundResolver) return;
        if (!this.allPlayersReady()) return;
        this.startGame();
    }

    adminForceStartGame() {
        if (this.roundResolver) return;
        if (Object.keys(this.players).length < 3) return;
        this.startGame();
    }

    allPlayersReady() {
        return VALID_ROLES.every(r => this.players[r] && this.readyPlayers.has(r));
    }

    broadcastToAdmins(event, data) {
        for (const socketId of this.adminSockets) {
            this.io.to(socketId).emit(event, data);
        }
    }

    getAdminState() {
        const connected = VALID_ROLES.filter(r => this.players[r]);
        const ready = [...this.readyPlayers];

        let state = 'idle';
        if (connected.length > 0 || this.roundResolver) {
            state = this.roundResolver ? 'playing' : 'lobby';
        }

        const adminState = {
            connected,
            ready,
            state,
            allReady: this.allPlayersReady(),
            totalRounds: config.TOTAL_ROUNDS,
            game: null,
        };

        if (this.roundResolver) {
            adminState.game = this.roundResolver.getAdminState();
        }

        return adminState;
    }
}

module.exports = { GameRoom };
