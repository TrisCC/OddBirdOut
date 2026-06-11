export class SocketManager {

    constructor() {
        const params = new URLSearchParams(window.location.search);
        this.playerId = params.get('player') || 'A';
        this.socket = null;
        this._callbacks = {};
    }

    connect(url) {
        this.socket = io(url, {
            query: { player: this.playerId },
            reconnection: true,
            reconnectionAttempts: 10,
            reconnectionDelay: 1000,
        });

        this.socket.on('connect', () => {
            this._emit('connected');
        });

        this.socket.on('disconnect', () => {
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
    }

    emitPlayerReady() {
        this.socket.emit('playerReady', { playerId: this.playerId });
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
