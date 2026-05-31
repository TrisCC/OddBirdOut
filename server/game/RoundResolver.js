const { fabricateForPlayer, getEscalationLevel } = require('./OstracismEngine');
const { GameState } = require('./GameState');
const config = require('../config');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');

class RoundResolver {

    constructor(io, playerSockets) {
        this.io = io;
        this.playerSockets = playerSockets;
        this.gameState = new GameState();
        this.roundTimer = null;
        this.gameActive = false;
        this.adminCallback = null;
        this.illusionCumulativeScores = {
            A: { A: 0, B: 0, C: 0 },
            B: { A: 0, B: 0, C: 0 },
            C: { A: 0, B: 0, C: 0 },
        };
        this.sessionId = uuidv4();
        this.sessionLog = {
            sessionId: this.sessionId,
            startedAt: new Date().toISOString(),
            config: {
                totalRounds: config.TOTAL_ROUNDS,
                roundDurationMs: config.ROUND_DURATION_MS,
                phase1Rounds: config.PHASE1_ROUNDS,
            },
            rounds: [],
        };
    }

    startGame() {
        this.gameActive = true;
        this.startRound();
    }

    startRound() {
        this.gameState.resetForNewRound();

        if (this.gameState.drainQueue()) {
            this.resolveRound();
            return;
        }

        const payload = {
            round: this.gameState.round,
            phase: this.gameState.phase,
            roundDurationMs: config.ROUND_DURATION_MS,
            debugMode: config.DEBUG_MODE,
        };

        this.broadcastToAll('roundStart', payload);

        if (!config.DEBUG_MODE) {
            this.roundTimer = setTimeout(() => {
                this.onRoundTimeout();
            }, config.ROUND_DURATION_MS);
        }
    }

    onRoundTimeout() {
        for (const player of ['A', 'B', 'C']) {
            if (!this.gameState.actionSubmitted[player]) {
                this.gameState.submitAction(player, 'hide', null);
            }
        }
        this.resolveRound();
    }

    submitPlayerAction(playerId, action, target) {
        if (!this.gameActive) return;

        if (!this.gameState.isRoundActive()) {
            this.gameState.queueAction(playerId, action, target);
            return;
        }

        if (this.gameState.actionSubmitted[playerId]) return;

        this.gameState.submitAction(playerId, action, target);

        if (this.gameState.hasAllActions()) {
            if (this.roundTimer) {
                clearTimeout(this.roundTimer);
                this.roundTimer = null;
            }
            this.resolveRound();
        }
    }

    resolveRound() {
        const resolveResult = this.gameState.resolveRound();
        this.gameState.markRoundResolved();
        const trueActions = resolveResult.actions;
        const trueScores = { ...this.gameState.scores };
        const trueDeltas = { ...resolveResult.deltas };

        const preScores = {};
        for (const p of ['A', 'B', 'C']) {
            preScores[p] = trueScores[p] - trueDeltas[p];
        }

        this.updateIllusionCumulativeScores(trueScores);

        const roundLog = {
            round: this.gameState.round,
            phase: this.gameState.phase,
            trueActions: trueActions.map(a => ({ ...a })),
            trueScores: { ...trueScores },
            illusions: {},
        };

        if (this.gameState.phase === 'trust') {
            const mappedActions = trueActions.map(a => ({ ...a }));
            const mappedScores = { ...trueScores };

            const payload = {
                round: this.gameState.round,
                phase: 'trust',
                actions: mappedActions,
                scores: mappedScores,
                yourScoreDelta: 0,
                exclusionEvents: 0,
            };

            this.broadcastToAll('roundResult', payload);
        } else {
            for (const playerId of ['A', 'B', 'C']) {
                const exclusionCount = this.getExclusionCount(playerId);
                const illusion = fabricateForPlayer(
                    playerId,
                    trueActions,
                    preScores,
                    this.gameState.round,
                    exclusionCount
                );

                this.setExclusionCount(playerId, illusion.exclusionEvents);

                const socketId = this.playerSockets[playerId];
                if (socketId) {
                    this.io.to(socketId).emit('roundResult', {
                        round: this.gameState.round,
                        phase: 'ostracism',
                        actions: illusion.actions,
                        scores: illusion.scores,
                        yourScoreDelta: illusion.yourScoreDelta,
                        exclusionEvents: illusion.exclusionEvents,
                    });
                }

                roundLog.illusions[playerId] = {
                    actions: illusion.actions,
                    scores: illusion.scores,
                };
            }
        }

        this.sessionLog.rounds.push(roundLog);

        if (this.adminCallback) {
            const exclusionCounts = this._exclusionCount
                ? { ...this._exclusionCount }
                : { A: 0, B: 0, C: 0 };

            const adminPayload = {
                round: this.gameState.round,
                phase: this.gameState.phase,
                escalationLevel: this.gameState.phase === 'trust' ? 'none' : getEscalationLevel(this.gameState.round),
                trueActions: roundLog.trueActions,
                trueScores: roundLog.trueScores,
                trueDeltas,
                exclusionCounts,
            };

            if (this.gameState.phase === 'ostracism') {
                adminPayload.illusions = roundLog.illusions;
            }

            this.adminCallback(adminPayload);
        }

        if (this.gameState.round >= config.TOTAL_ROUNDS) {
            this.endGame();
        } else {
            this.gameState.round++;
            this.scheduleNextRound();
        }
    }

    scheduleNextRound() {
        setTimeout(() => {
            if (this.gameActive) {
                this.startRound();
            }
        }, config.ROUND_RESOLVE_ANIMATION_MS);
    }

    endGame() {
        this.gameActive = false;

        const winner = this.gameState.getWinner();
        const trueState = {
            finalScores: { ...this.gameState.scores },
            winner,
        };

        this.sessionLog.endedAt = new Date().toISOString();
        this.sessionLog.finalScores = { ...this.gameState.scores };
        this.sessionLog.winner = winner;

        for (const playerId of ['A', 'B', 'C']) {
            const socketId = this.playerSockets[playerId];
            if (socketId) {
                const illusionSummary = this.buildIllusionSummary(playerId);
                this.io.to(socketId).emit('gameEnd', {
                    trueState,
                    ...illusionSummary,
                });
            }
        }

        this.saveSessionLog();

        if (this.adminCallback) {
            this.adminCallback({
                round: this.gameState.round,
                phase: 'ended',
                trueScores: { ...this.gameState.scores },
                winner: [...winner],
            });
        }
    }

    buildIllusionSummary(playerId) {
        const illusionRounds = [];
        for (const r of this.sessionLog.rounds) {
            if (r.illusions[playerId]) {
                illusionRounds.push({
                    round: r.round,
                    ...r.illusions[playerId],
                });
            }
        }

        return {
            revelation: {
                message: 'The system manipulated what every player saw.',
                trueWinner: this.sessionLog.winner,
                trueFinalScores: this.sessionLog.finalScores,
            },
            whatYouWereShown: illusionRounds,
        };
    }

    updateIllusionCumulativeScores(trueScores) {
        for (const p of ['A', 'B', 'C']) {
            this.illusionCumulativeScores[p] = { ...trueScores };
        }
    }

    getExclusionCount(playerId) {
        if (!this._exclusionCount) {
            this._exclusionCount = { A: 0, B: 0, C: 0 };
        }
        return this._exclusionCount[playerId];
    }

    setExclusionCount(playerId, count) {
        if (!this._exclusionCount) {
            this._exclusionCount = { A: 0, B: 0, C: 0 };
        }
        this._exclusionCount[playerId] = count;
    }

    saveSessionLog() {
        const sessionsDir = path.join(__dirname, '..', 'data', 'sessions');
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `${timestamp}_${this.sessionId}.json`;
        const filepath = path.join(sessionsDir, filename);

        fs.writeFileSync(filepath, JSON.stringify(this.sessionLog, null, 2));
    }

    broadcastToAll(event, data) {
        this.io.emit(event, data);
    }

    handleDisconnect(playerId) {
        this.pauseTimer();
        this.broadcastToAll('playerDisconnected', { playerId });
    }

    handleReconnect(playerId) {
        this.broadcastToAll('playerReconnected', { playerId });
        if (this.gameActive) {
            this.resumeTimer();
        }
    }

    pauseTimer() {
        if (this.roundTimer) {
            clearTimeout(this.roundTimer);
            this.roundTimer = null;
        }
    }

    resumeTimer() {
        if (!this.roundTimer && this.gameActive) {
            this.roundTimer = setTimeout(() => {
                this.onRoundTimeout();
            }, config.ROUND_DURATION_MS);
        }
    }

    setAdminCallback(cb) {
        this.adminCallback = cb;
    }

    getAdminState() {
        const state = this.gameState.getFullState();
        return {
            round: state.round,
            phase: state.phase,
            roundActive: this.gameState.isRoundActive(),
            actionsSubmitted: state.actionSubmitted,
            trueScores: state.scores,
            escalationLevel: state.phase === 'trust' ? 'none' : getEscalationLevel(state.round),
            exclusionCounts: this._exclusionCount
                ? { ...this._exclusionCount }
                : { A: 0, B: 0, C: 0 },
            roundHistory: state.roundHistory,
        };
    }

    forceEnd() {
        if (this.roundTimer) {
            clearTimeout(this.roundTimer);
            this.roundTimer = null;
        }
        this.gameActive = false;
    }
}

module.exports = { RoundResolver };
