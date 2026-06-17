export class SocketManager {

    constructor() {
        const params = new URLSearchParams(window.location.search);
        this.playerId = params.get('player') || 'A';
        this.socket = null;
        this._callbacks = {};
        this.heartbeatInterval = null;
        this.heartbeatTimeout = null;
        this.missedHeartbeats = 0;
        this.maxMissedHeartbeats = 3;
        this.heartbeatIntervalMs = 10000;
        this.heartbeatTimeoutMs = 5000;
    }

    connect(url) {
        this.socket = io(url, {
            query: { player: this.playerId },
            reconnection: true,
            reconnectionAttempts: 10,
            reconnectionDelay: 1000,
        });

        this.socket.on('connect', () => {
            this.missedHeartbeats = 0;
            this._startHeartbeat();
            this._emit('connected');
        });

        this.socket.on('disconnect', () => {
            this._stopHeartbeat();
            this._emit('disconnected');
        });

        this.socket.on('lobbyUpdate', (data) => {
            this._emit('lobbyUpdate', data);
        });

        this.socket.on('gameStart', (data) => {
            this._emit('gameStart', data);
        });

        this.socket.on('roundStart', (data) => {
            this._emit('roundStart', data);
        });

        this.socket.on('roundResult', (data) => {
            this._emit('roundResult', data);
        });

        this.socket.on('gameEnd', (data) => {
            this._emit('gameEnd', data);
        });

        this.socket.on('gameAborted', (data) => {
            this._emit('gameAborted', data);
        });

        this.socket.on('errorMessage', (data) => {
            this._emit('errorMessage', data);
        });

        this.socket.on('heartbeatAck', () => {
            this.missedHeartbeats = 0;
            if (this.heartbeatTimeout) {
                clearTimeout(this.heartbeatTimeout);
                this.heartbeatTimeout = null;
            }
        });
    }

    /** Starts the client-side heartbeat loop. Sends a heartbeat event every
     *  heartbeatIntervalMs and waits for heartbeatAck. If too many acks are
     *  missed, the client assumes the connection is dead and lets Socket.IO
     *  reconnect. */
    _startHeartbeat() {
        this._stopHeartbeat();
        this.heartbeatInterval = setInterval(() => {
            if (!this.socket || !this.socket.connected) return;

            this.socket.emit('heartbeat');

            this.heartbeatTimeout = setTimeout(() => {
                this.missedHeartbeats++;
                if (this.missedHeartbeats >= this.maxMissedHeartbeats) {
                    this._emit('connectionStale');
                    if (this.socket) {
                        this.socket.disconnect().connect();
                    }
                }
            }, this.heartbeatTimeoutMs);
        }, this.heartbeatIntervalMs);
    }

    /** Stops the heartbeat loop and any pending ack timeout. */
    _stopHeartbeat() {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }
        if (this.heartbeatTimeout) {
            clearTimeout(this.heartbeatTimeout);
            this.heartbeatTimeout = null;
        }
        this.missedHeartbeats = 0;
    }

    emitPlayerReady() {
        this.socket.emit('playerReady', { playerId: this.playerId });
    }

    emitPlayerColorChoice(color) {
        this.socket.emit('playerColorChoice', { color });
    }

    requestLobbyState() {
        this.socket.emit('requestLobbyState');
    }

    emitPlayerAction(action, target) {
        this.socket.emit('playerAction', { action, target });
    }

    on(event, callback) {
        if (!this._callbacks[event]) {
            this._callbacks[event] = [];
        }
        this._callbacks[event].push(callback);
    }

    off(event, callback) {
        if (!this._callbacks[event]) return;
        this._callbacks[event] = this._callbacks[event].filter(cb => cb !== callback);
    }

    _emit(event, data) {
        if (!this._callbacks[event]) return;
        for (const cb of this._callbacks[event]) {
            cb(data);
        }
    }
}
