const { STARTING_EGGS, PHASE1_ROUNDS } = require('../config');

class GameState {

    constructor() {
        this.round = 1;
        this.phase = 'trust';
        this.scores = { A: STARTING_EGGS, B: STARTING_EGGS, C: STARTING_EGGS };
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
        return this.hasAll();
    }

    resetForNewRound() {
        this.currentActions = [];
        this.actionSubmitted = { A: false, B: false, C: false };
        this._roundActive = true;

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
        const shareTarget = {};
        for (const act of this.currentActions) {
            if (act.action === 'share' && act.target) {
                shareTarget[act.player] = act.target;
            }
        }

        const deltas = { A: 0, B: 0, C: 0 };
        const hidPlayers = new Set();
        for (const act of this.currentActions) {
            if (act.action === 'hide') {
                hidPlayers.add(act.player);
            }
        }

        const mutualPair = ['A', 'B', 'C'].find(p =>
            shareTarget[p] && shareTarget[shareTarget[p]] === p
        );

        if (mutualPair) {
            const partner = shareTarget[mutualPair];
            deltas[mutualPair] += 1;
            deltas[partner] += 1;
        } else {
            for (const p of ['A', 'B', 'C']) deltas[p] += 1;
        }

        for (const player of ['A', 'B', 'C']) {
            if (hidPlayers.has(player)) {
                deltas[player] = 0;
            }
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

    hasAll() {
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
