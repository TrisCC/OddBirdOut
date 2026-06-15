const { STARTING_EGGS, PHASE1_ROUNDS } = require('../config');

class GameState {

    constructor() {
        this.round = 1;
        this.phase = 'trust';
        this.scores = { A: STARTING_EGGS, B: STARTING_EGGS, C: STARTING_EGGS };
        this.alive = { A: true, B: true, C: true };
        this.currentActions = [];
        this.actionSubmitted = { A: false, B: false, C: false };
        this.roundHistory = [];
        this._roundActive = false;
        this._actionQueue = [];
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
        const newlyDead = [];

        const shareTarget = {};
        for (const act of this.currentActions) {
            if (!this.alive[act.player]) continue;
            if (act.action === 'share' && act.target && this.alive[act.target]) {
                shareTarget[act.player] = act.target;
            }
        }

        const deltas = { A: 0, B: 0, C: 0 };
        const alivePlayers = ['A', 'B', 'C'].filter(p => this.alive[p]);

        if (alivePlayers.length === 3) {
            const mutualPair = alivePlayers.find(p =>
                shareTarget[p] && shareTarget[shareTarget[p]] === p
            );

            if (mutualPair) {
                const partner = shareTarget[mutualPair];
                // The excluded player neither gains nor loses eggs this round
                deltas[mutualPair] += 1;
                deltas[partner] += 1;
            } else {
                // Three-way share: everyone gives and everyone receives
                for (const p of alivePlayers) deltas[p] += 1;
            }
        } else {
            const counted = new Set();
            for (const player of alivePlayers) {
                const target = shareTarget[player];
                if (!target || counted.has(player) || counted.has(target)) continue;
                if (shareTarget[target] === player) {
                    deltas[player] += 1;
                    deltas[target] += 1;
                    counted.add(player);
                    counted.add(target);
                }
            }
        }

        for (const player of ['A', 'B', 'C']) {
            if (this.alive[player]) {
                this.scores[player] += deltas[player];
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
