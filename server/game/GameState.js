const { STARTING_SEEDS } = require('../config');

class GameState {

    constructor() {
        this.round = 1;
        this.phase = 'trust';
        this.scores = { A: STARTING_SEEDS, B: STARTING_SEEDS, C: STARTING_SEEDS };
        this.currentActions = [];
        this.actionSubmitted = { A: false, B: false, C: false };
        this.roundHistory = [];
        this._roundActive = false;
        this._actionQueue = [];
    }

    isRoundActive() {
        return this._roundActive;
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
        return this.hasAllActions();
    }

    resetForNewRound() {
        this.currentActions = [];
        this.actionSubmitted = { A: false, B: false, C: false };
        this._roundActive = true;

        if (this.round === 1) {
            this.phase = 'trust';
        } else {
            const { PHASE1_ROUNDS } = require('../config');
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

        for (const act of this.currentActions) {
            if (act.action === 'hide') {
                blocked.add(act.player);
            }
        }

        const deltas = { A: 0, B: 0, C: 0 };

        for (const act of this.currentActions) {
            if (act.action === 'share') {
                if (blocked.has(act.player)) {
                    continue;
                }
                if (blocked.has(act.target)) {
                    continue;
                }
                if (this.scores[act.player] <= 0) {
                    continue;
                }
                deltas[act.player] -= 1;
                deltas[act.target] += 1;

            } else if (act.action === 'peck') {
                if (blocked.has(act.player)) {
                    continue;
                }
                if (blocked.has(act.target)) {
                    continue;
                }
                if (this.scores[act.target] <= 0) {
                    continue;
                }
                deltas[act.player] += 1;
                deltas[act.target] -= 1;
            }
        }

        for (const player of ['A', 'B', 'C']) {
            this.scores[player] += deltas[player];
        }

        const roundResult = {
            round: this.round,
            phase: this.phase,
            actions: this.currentActions.map(a => ({ ...a })),
            scores: { ...this.scores },
            deltas: { ...deltas },
        };

        this.roundHistory.push(roundResult);
        return { actions: [...this.currentActions], deltas };
    }

    hasAllActions() {
        return this.actionSubmitted.A && this.actionSubmitted.B && this.actionSubmitted.C;
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
        };
    }

    getFullState() {
        return {
            round: this.round,
            phase: this.phase,
            scores: { ...this.scores },
            actionSubmitted: { ...this.actionSubmitted },
            currentActions: this.currentActions.map(a => ({ ...a })),
            roundHistory: this.roundHistory.map(r => ({
                round: r.round,
                phase: r.phase,
                scores: { ...r.scores },
                deltas: { ...r.deltas },
            })),
        };
    }
}

module.exports = { GameState };
