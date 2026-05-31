const { STARTING_SEEDS, SEEDS_PER_ROUND_DRAIN, PHASE1_ROUNDS } = require('../config');

class GameState {

    constructor() {
        this.round = 1;
        this.phase = 'trust';
        this.scores = { A: STARTING_SEEDS, B: STARTING_SEEDS, C: STARTING_SEEDS };
        this.alive = { A: true, B: true, C: true };
        this.currentActions = [];
        this.actionSubmitted = { A: false, B: false, C: false };
        this.roundHistory = [];
        this._roundActive = false;
        this._actionQueue = [];
        this._dyingThisRound = [];
    }

    isRoundActive() {
        return this._roundActive;
    }

    isAlive(playerId) {
        return this.alive[playerId];
    }

    queueAction(playerId, action, target) {
        this._actionQueue.push({ playerId, action, target: target || null });
    }

    drainQueue() {
        for (const entry of this._actionQueue) {
            if (!this.actionSubmitted[entry.playerId]) {
                this.submitAction(entry.playerId, entry.action, entry.target);
            }
        }
        this._actionQueue = [];
        return this.hasAllOrDead();
    }

    resetForNewRound() {
        this.currentActions = [];
        this.actionSubmitted = { A: false, B: false, C: false };
        this._roundActive = true;
        this._dyingThisRound = [];

        for (const player of ['A', 'B', 'C']) {
            if (this.alive[player]) {
                this.scores[player] -= SEEDS_PER_ROUND_DRAIN;
                if (this.scores[player] <= 0) {
                    this._dyingThisRound.push(player);
                }
            }
        }

        if (this.round === 1) {
            this.phase = 'trust';
        } else {
            this.phase = this.round <= PHASE1_ROUNDS ? 'trust' : 'ostracism';
        }
    }

    markRoundResolved() {
        this._roundActive = false;
    }

    submitAction(playerId, action, target) {
        if (this.actionSubmitted[playerId]) {
            return false;
        }

        this.currentActions.push({ player: playerId, action, target: target || null });
        this.actionSubmitted[playerId] = true;
        return true;
    }

    resolveRound() {
        const blocked = new Set();
        const newlyDead = [];

        for (const act of this.currentActions) {
            if (act.action === 'hide' && this.alive[act.player]) {
                blocked.add(act.player);
            }
        }

        let antiStealTarget = null;
        const aliveActions = this.currentActions.filter(a => this.alive[a.player]);

        const mutualShares = new Set();
        for (const act of aliveActions) {
            if (act.action !== 'share') continue;
            if (!act.target) continue;
            const reciprocal = aliveActions.find(a =>
                a.action === 'share' &&
                a.player === act.target &&
                a.target === act.player
            );
            if (reciprocal) {
                mutualShares.add(`${act.player}->${act.target}`);
            }
        }

        const mutualSharePlayers = [...new Set([...mutualShares].map(s => s.split('->')[0]))];
        const stealPlayers = aliveActions.filter(a => a.action === 'peck').map(a => a.player);

        if (mutualSharePlayers.length === 2 && stealPlayers.length === 1) {
            antiStealTarget = stealPlayers[0];
        }

        const deltas = { A: 0, B: 0, C: 0 };

        for (const act of this.currentActions) {
            if (!this.alive[act.player]) {
                continue;
            }

            if (act.action === 'share') {
                if (blocked.has(act.player)) continue;
                if (!act.target || !this.alive[act.target]) continue;
                if (blocked.has(act.target)) continue;
                if (!mutualShares.has(`${act.player}->${act.target}`)) continue;
                deltas[act.target] += 2;

            } else if (act.action === 'peck') {
                if (antiStealTarget === act.player) {
                    deltas[act.player] -= 1;
                    continue;
                }
                if (blocked.has(act.player)) continue;
                if (!act.target || !this.alive[act.target]) continue;
                if (blocked.has(act.target)) continue;
                deltas[act.player] += 2;
                deltas[act.target] -= 1;
            }
        }

        for (const player of ['A', 'B', 'C']) {
            if (this.alive[player]) {
                this.scores[player] += deltas[player];
                if (this.scores[player] <= 0) {
                    this.alive[player] = false;
                    newlyDead.push(player);
                }
            }
        }

        const roundResult = {
            round: this.round,
            phase: this.phase,
            actions: this.currentActions.map(a => ({ ...a })),
            scores: { ...this.scores },
            deltas: { ...deltas },
            alive: { ...this.alive },
            newlyDead: [...newlyDead],
        };

        this.roundHistory.push(roundResult);
        return { actions: [...this.currentActions], deltas, newlyDead: [...newlyDead] };
    }

    hasAllActions() {
        return this.actionSubmitted.A && this.actionSubmitted.B && this.actionSubmitted.C;
    }

    hasAllOrDead() {
        for (const p of ['A', 'B', 'C']) {
            if (this.alive[p] && !this.actionSubmitted[p]) return false;
        }
        return true;
    }

    getWinner() {
        const maxScore = Math.max(this.scores.A, this.scores.B, this.scores.C);
        const winners = ['A', 'B', 'C'].filter(p => this.scores[p] === maxScore);
        return winners;
    }

    getTrueSnapshot() {
        return {
            round: this.round,
            phase: this.phase,
            scores: { ...this.scores },
            alive: { ...this.alive },
        };
    }

    getFullState() {
        return {
            round: this.round,
            phase: this.phase,
            scores: { ...this.scores },
            alive: { ...this.alive },
            actionSubmitted: { ...this.actionSubmitted },
            currentActions: this.currentActions.map(a => ({ ...a })),
            roundHistory: this.roundHistory.map(r => ({
                round: r.round,
                phase: r.phase,
                scores: { ...r.scores },
                deltas: { ...r.deltas },
                alive: { ...r.alive },
            })),
        };
    }
}

module.exports = { GameState };
