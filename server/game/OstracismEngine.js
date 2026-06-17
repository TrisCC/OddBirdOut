const { TOTAL_ROUNDS, PHASE1_ROUNDS } = require('../config');

const OTHER_PLAYERS = {
    A: ['B', 'C'],
    B: ['A', 'C'],
    C: ['A', 'B'],
};

function getEscalationLevel(round) {
    if (round <= PHASE1_ROUNDS) return 'none';
    if (round <= 6) return 'low';
    if (round <= 9) return 'medium';
    return 'high';
}

function mapPlayer(player, viewerId) {
    return player === viewerId ? 'You' : player;
}

function mapScoresPerspective(scores, viewerId) {
    const mapped = {};
    for (const p of ['A', 'B', 'C']) {
        const key = p === viewerId ? 'You' : p;
        mapped[key] = scores[p] || 0;
    }
    return mapped;
}

function computeMutualShareDeltas(actions, resolvePlayer) {
    const shareTarget = {};
    for (const act of actions) {
        if (act.action === 'share' && act.target) {
            shareTarget[resolvePlayer(act.player)] = resolvePlayer(act.target);
        }
    }

    const deltas = { A: 0, B: 0, C: 0 };
    const counted = new Set();
    for (const [player, target] of Object.entries(shareTarget)) {
        if (counted.has(player) || counted.has(target)) continue;
        if (shareTarget[target] === player) {
            deltas[player] += 1;
            deltas[target] += 1;
            counted.add(player);
            counted.add(target);
        }
    }
    return deltas;
}

function buildFabricatedActions(playerId, P_j, P_k, playerTrueAction) {
    const actions = [
        { player: P_j, action: 'share', target: P_k },
        { player: P_k, action: 'share', target: P_j },
    ];

    if (playerTrueAction) {
        actions.push({
            player: 'You',
            action: 'share',
            target: mapPlayer(playerTrueAction.target, playerId),
        });
    }

    return actions;
}

function fabricateForPlayer(playerId, preScores, cumulativeIllusionScore, round, playerTrueAction) {
    const [P_j, P_k] = OTHER_PLAYERS[playerId];

    const fabricatedActions = buildFabricatedActions(playerId, P_j, P_k, playerTrueAction);

    const illusionBase = {};
    for (const p of ['A', 'B', 'C']) {
        illusionBase[p] = p === playerId ? cumulativeIllusionScore : preScores[p];
    }

    const resolvePlayer = (p) => p === 'You' ? playerId : p;
    const illusionDeltas = computeMutualShareDeltas(fabricatedActions, resolvePlayer);

    const postScores = {};
    for (const p of ['A', 'B', 'C']) {
        postScores[p] = Math.max(0, illusionBase[p] + (illusionDeltas[p] || 0));
    }

    if (round === TOTAL_ROUNDS) {
        postScores[playerId] = 0;
    }

    return {
        actions: fabricatedActions,
        scores: mapScoresPerspective(postScores, playerId),
        yourScoreDelta: postScores[playerId] - cumulativeIllusionScore,
        exclusionEvents: 1,
        illusionScoreAfter: postScores[playerId],
    };
}

module.exports = { fabricateForPlayer, getEscalationLevel };
