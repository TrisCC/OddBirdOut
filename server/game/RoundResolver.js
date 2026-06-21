const { fabricateForPlayer, getEscalationLevel } = require('./OstracismEngine');
const { GameState } = require('./GameState');
const config = require('../config');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');

// [left, right] from each player's physical perspective in the installation
const SIDE_ORDER = {
    A: ['C', 'B'],
    B: ['A', 'C'],
    C: ['B', 'A'],
};

class RoundResolver {

    constructor(io, playerSockets, lighting) {
        this.io = io;
        this.playerSockets = playerSockets;
        this.gameState = new GameState();
        this.roundTimer = null;
        this.gameActive = false;
        this.adminCallback = null;
        this.lighting = lighting || null;
        this.perPlayerIllusionScores = {
            A: config.STARTING_EGGS,
            B: config.STARTING_EGGS,
            C: config.STARTING_EGGS,
        };
        this.sessionId = uuidv4();
        this.sessionLog = {
            sessionId: this.sessionId,
            startedAt: new Date().toISOString(),
            config: {
                totalRounds: config.TOTAL_ROUNDS,
                roundDurationMs: config.ROUND_DURATION_MS,
                phase1Rounds: config.PHASE1_ROUNDS,
                startingEggs: config.STARTING_EGGS,
            },
            rounds: [],
            deaths: [],
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

        if (this.lighting) {
            this.lighting.setDaytime(0);
        }

        if (!config.DEBUG_MODE) {
            this.roundTimer = setTimeout(() => {
                this.onRoundTimeout();
            }, config.ROUND_DURATION_MS);
        }
    }

    onRoundTimeout() {
        for (const player of ['A', 'B', 'C']) {
            if (!this.gameState.actionSubmitted[player]) {
                this.gameState.submitAction(player, 'share', SIDE_ORDER[player][0]);
            }
        }
        this.resolveRound();
    }

    submitPlayerAction(playerId, action, target) {
        if (!this.gameActive) return;
        if (action !== 'share') return;
        if (!SIDE_ORDER[playerId].includes(target)) return;

        if (!this.gameState.isRoundActive()) {
            this.gameState.queueAction(playerId, action, target);
            return;
        }

        if (this.gameState.actionSubmitted[playerId]) return;

        this.gameState.submitAction(playerId, action, target);

        if (this.gameState.hasAllOrDead()) {
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
        const newlyDead = resolveResult.newlyDead || [];
        const alive = { ...this.gameState.alive };

        for (const playerId of newlyDead) {
            this.sessionLog.deaths.push({
                player: playerId,
                round: this.gameState.round,
                scoreAtDeath: trueScores[playerId],
            });
        }

        const preScores = {};
        for (const p of ['A', 'B', 'C']) {
            preScores[p] = trueScores[p] - trueDeltas[p];
        }

        const roundLog = {
            round: this.gameState.round,
            phase: this.gameState.phase,
            trueActions: trueActions.map(a => ({ ...a })),
            trueScores: { ...trueScores },
            trueDeltas: { ...trueDeltas },
            alive: { ...alive },
            newlyDead: [...newlyDead],
            illusions: {},
        };

        if (this.gameState.phase === 'trust') {
            for (const playerId of ['A', 'B', 'C']) {
                this.perPlayerIllusionScores[playerId] = trueScores[playerId];
            }

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
                const cumulativeIllusionScore = this.perPlayerIllusionScores[playerId];
                const playerTrueAction = trueActions.find(a => a.player === playerId) || null;

                const illusion = fabricateForPlayer(
                    playerId,
                    preScores,
                    cumulativeIllusionScore,
                    this.gameState.round,
                    playerTrueAction
                );

                this.perPlayerIllusionScores[playerId] = illusion.illusionScoreAfter;

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
                    illusionScoreAfter: illusion.illusionScoreAfter,
                };
            }
        }

        this.sessionLog.rounds.push(roundLog);

        if (this.adminCallback) {
            const adminPayload = {
                round: this.gameState.round,
                phase: this.gameState.phase,
                escalationLevel: this.gameState.phase === 'trust' ? 'none' : getEscalationLevel(this.gameState.round),
                trueActions: roundLog.trueActions,
                trueScores: roundLog.trueScores,
                trueDeltas,
                alive: { ...alive },
                newlyDead: [...newlyDead],
                perPlayerIllusionScores: { ...this.perPlayerIllusionScores },
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
            if (this.lighting) {
                this.lighting.setNighttime();
            }
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

        if (this.lighting) {
            this.lighting.startDusk();
        }

        const winner = this.gameState.getWinner();
        const trueState = {
            finalScores: { ...this.gameState.scores },
            winner,
            alive: { ...this.gameState.alive },
        };

        this.sessionLog.endedAt = new Date().toISOString();
        this.sessionLog.finalScores = { ...this.gameState.scores };
        this.sessionLog.winner = winner;
        this.sessionLog.alive = { ...this.gameState.alive };

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
                alive: { ...this.gameState.alive },
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
                trueAlive: this.sessionLog.alive,
                deaths: this.sessionLog.deaths,
                trueActions: this.sessionLog.rounds.map(r => ({
                    round: r.round,
                    actions: r.trueActions,
                })),
            },
            whatYouWereShown: illusionRounds,
        };
    }

    saveSessionLog() {
        const sessionsDir = path.join(__dirname, '..', 'data', 'sessions');
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `${timestamp}_${this.sessionId}.json`;
        const filepath = path.join(sessionsDir, filename);

        fs.mkdirSync(sessionsDir, { recursive: true });
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
            alive: { ...this.gameState.alive },
            actionsSubmitted: state.actionSubmitted,
            trueScores: state.scores,
            escalationLevel: state.phase === 'trust' ? 'none' : getEscalationLevel(state.round),
            perPlayerIllusionScores: { ...this.perPlayerIllusionScores },
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
