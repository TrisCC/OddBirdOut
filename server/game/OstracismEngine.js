const { PHASE1_ROUNDS } = require('../config');

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

function mapActionPerspective(action, viewerId) {
    const mapped = { ...action };
    if (action.player === viewerId) {
        mapped.player = 'You';
    }
    if (action.target === viewerId) {
        mapped.target = 'You';
    }
    return mapped;
}

function mapScoresPerspective(scores, viewerId) {
    const players = ['A', 'B', 'C'];
    const mapped = {};
    for (const p of players) {
        const key = p === viewerId ? 'You' : p;
        mapped[key] = scores[p];
    }
    return mapped;
}

function fabricateForPlayer(playerId, trueActions, baseScores, round, exclusionCount) {
    const level = getEscalationLevel(round);
    const [P_j, P_k] = OTHER_PLAYERS[playerId];

    const result = {
        actions: [],
        scores: {},
        yourScoreDelta: 0,
        exclusionEvents: exclusionCount,
    };

    const trueDeltas = computeScoreDeltas(trueActions, baseScores);

    if (level === 'none') {
        result.actions = trueActions.map(a => mapActionPerspective(a, playerId));
        const postScores = {};
        for (const p of ['A', 'B', 'C']) {
            postScores[p] = baseScores[p] + (trueDeltas[p] || 0);
        }
        result.scores = mapScoresPerspective(postScores, playerId);
        result.yourScoreDelta = trueDeltas[playerId];
        result.exclusionEvents = 0;
        return result;
    }

    if (level === 'low') {
        result.actions = trueActions.map(a => mapActionPerspective(a, playerId));
        result.actions.push({
            player: P_j,
            action: 'share',
            target: P_k,
        });
    }

    if (level === 'medium') {
        result.actions = [
            { player: mapPlayer(P_j, playerId), action: 'share', target: mapPlayer(P_k, playerId) },
            { player: mapPlayer(P_k, playerId), action: 'share', target: mapPlayer(P_j, playerId) },
        ];
        const playerAction = trueActions.find(a => a.player === playerId);
        if (playerAction) {
            result.actions.push(mapActionPerspective(playerAction, playerId));
        }
    }

    if (level === 'high') {
        const playerAction = trueActions.find(a => a.player === playerId);

        result.actions = [
            { player: mapPlayer(P_j, playerId), action: 'share', target: mapPlayer(P_k, playerId) },
            { player: mapPlayer(P_k, playerId), action: 'share', target: mapPlayer(P_j, playerId) },
        ];

        if (playerAction) {
            if (playerAction.action === 'share') {
                result.actions.push({
                    player: 'You',
                    action: 'share',
                    target: mapPlayer(playerAction.target, playerId),
                    blocked: true,
                });
            } else if (playerAction.action === 'hide') {
                result.actions.push({
                    player: P_j,
                    action: 'peck',
                    target: 'You',
                    blocked: true,
                });
                result.actions.push({
                    player: P_k,
                    action: 'peck',
                    target: 'You',
                    blocked: true,
                });
                result.actions.push({
                    player: 'You',
                    action: 'hide',
                    target: null,
                });
            } else {
                result.actions.push(mapActionPerspective(playerAction, playerId));
            }
        }
    }

    const illusionDeltas = computeScoreDeltasFromMappedActions(result.actions, baseScores, playerId);
    result.yourScoreDelta = illusionDeltas[playerId];
    result.scores = mapScoresPerspective(
        applyDeltas(baseScores, unmapDeltas(illusionDeltas, playerId)),
        playerId
    );

    if (level === 'medium' || level === 'high') {
        result.exclusionEvents += 1;
    }

    return result;
}

function mapPlayer(player, viewerId) {
    return player === viewerId ? 'You' : player;
}

function computeScoreDeltas(actions, currentScores) {
    const deltas = { A: 0, B: 0, C: 0 };
    const blocked = new Set();

    for (const act of actions) {
        if (act.action === 'hide' && act.blocked !== true) {
            blocked.add(act.player);
        }
    }

    // Mutual share: both players sharing with each other → +2 each
    const shareMap = {};
    for (const act of actions) {
        if (act.blocked) continue;
        if (act.action === 'share' && !blocked.has(act.player) && !blocked.has(act.target)) {
            shareMap[act.player] = act.target;
        }
    }
    const processedPairs = new Set();
    for (const [giver, target] of Object.entries(shareMap)) {
        const pairKey = [giver, target].sort().join('-');
        if (processedPairs.has(pairKey)) continue;
        if (shareMap[target] === giver) {
            deltas[giver] = (deltas[giver] || 0) + 2;
            deltas[target] = (deltas[target] || 0) + 2;
            processedPairs.add(pairKey);
        }
    }

    // Peck: steal up to 3 seeds from undefended target
    for (const act of actions) {
        if (act.blocked) continue;
        if (act.action === 'peck') {
            if (blocked.has(act.player) || blocked.has(act.target)) continue;
            const effectiveTargetSeeds = Math.max(0, (currentScores[act.target] || 0) + (deltas[act.target] || 0));
            const stolen = Math.min(3, effectiveTargetSeeds);
            if (stolen <= 0) continue;
            deltas[act.player] = (deltas[act.player] || 0) + stolen;
            deltas[act.target] = (deltas[act.target] || 0) - stolen;
        }
    }

    return deltas;
}

function computeScoreDeltasFromMappedActions(actions, currentScores, viewerId) {
    const unmapAction = (act) => {
        const a = { ...act };
        if (a.player === 'You') a.player = viewerId;
        if (a.target === 'You') a.target = viewerId;
        if (a.blocked && a.player !== viewerId && a.action !== 'peck') {
            a.blocked = false;
        }
        return a;
    };

    return computeScoreDeltas(actions.map(unmapAction), currentScores);
}

function unmapDeltas(deltas, viewerId) {
    const result = { ...deltas };
    if ('you' in deltas) {
        result[viewerId] = deltas.you;
        delete result.you;
    }
    return result;
}

function applyDeltas(scores, deltas) {
    const result = { ...scores };
    for (const p of ['A', 'B', 'C']) {
        result[p] = (result[p] || 0) + (deltas[p] || 0);
    }
    return result;
}

module.exports = { fabricateForPlayer, getEscalationLevel };
