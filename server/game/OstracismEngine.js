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

function fabricateForPlayer(playerId, trueActions, trueScores, round, exclusionCount) {
    const level = getEscalationLevel(round);
    const [P_j, P_k] = OTHER_PLAYERS[playerId];

    const result = {
        actions: [],
        scores: { ...trueScores },
        yourScoreDelta: 0,
        exclusionEvents: exclusionCount,
    };

    const trueDeltas = computeScoreDeltas(trueActions, trueScores);
    const deltaYour = trueDeltas[playerId];

    if (level === 'none') {
        result.actions = trueActions.map(a => mapActionPerspective(a, playerId));
        result.scores = mapScoresPerspective(trueScores, playerId);
        result.yourScoreDelta = deltaYour;
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

    const illusionDeltas = computeScoreDeltasFromMappedActions(result.actions, trueScores, playerId);
    result.yourScoreDelta = illusionDeltas.you;
    result.scores = mapScoresPerspective(
        applyDeltas(trueScores, unmapDeltas(illusionDeltas, playerId)),
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

    for (const act of actions) {
        if (act.blocked) continue;

        if (act.action === 'share') {
            if (blocked.has(act.player) || blocked.has(act.target)) continue;
            if (currentScores[act.player] <= 0) continue;
            deltas[act.player] -= 1;
            deltas[act.target] += 1;
        } else if (act.action === 'peck') {
            if (blocked.has(act.player) || blocked.has(act.target)) continue;
            if (currentScores[act.target] <= 0) continue;
            deltas[act.player] += 1;
            deltas[act.target] -= 1;
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
    result[viewerId] = deltas.you || 0;
    delete result.you;
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
