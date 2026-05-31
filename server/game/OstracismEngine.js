const { PHASE1_ROUNDS, TOTAL_ROUNDS } = require('../config');

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
    const mapped = {};
    for (const p of ['A', 'B', 'C']) {
        const key = p === viewerId ? 'You' : p;
        mapped[key] = scores[p] || 0;
    }
    return mapped;
}

function computeScoreDeltasFromMapped(actions, currentScores, viewerId) {
    const blocked = new Set();
    const deltas = { A: 0, B: 0, C: 0 };

    const resolvePlayer = (p) => p === 'You' ? viewerId : p;

    for (const act of actions) {
        const player = resolvePlayer(act.player);
        if (act.action === 'hide' && !act.blocked) {
            blocked.add(player);
        }
    }

    let antiStealTarget = null;

    const mutualShares = new Set();
    for (const act of actions) {
        if (act.action !== 'share') continue;
        if (!act.target) continue;
        const reciprocal = actions.find(a =>
            a.action === 'share' &&
            resolvePlayer(a.player) === resolvePlayer(act.target) &&
            a.target && resolvePlayer(a.target) === resolvePlayer(act.player)
        );
        if (reciprocal) {
            mutualShares.add(`${resolvePlayer(act.player)}->${resolvePlayer(act.target)}`);
        }
    }

    const mutualSharePlayers = [...new Set([...mutualShares].map(s => s.split('->')[0]))];
    const stealPlayers = actions.filter(a => a.action === 'peck').map(a => resolvePlayer(a.player));

    if (mutualSharePlayers.length === 2 && stealPlayers.length === 1) {
        antiStealTarget = stealPlayers[0];
    }

    for (const act of actions) {
        if (act.blocked && act.action !== 'peck') continue;

        const player = resolvePlayer(act.player);
        const target = act.target ? resolvePlayer(act.target) : null;

        if (act.action === 'share') {
            if (blocked.has(player) || (target && blocked.has(target))) continue;
            if (!target) continue;
            if (!mutualShares.has(`${player}->${target}`)) continue;
            deltas[target] = (deltas[target] || 0) + 2;

        } else if (act.action === 'peck') {
            if (player === antiStealTarget) {
                deltas[player] = (deltas[player] || 0) - 1;
                continue;
            }
            if (act.blocked) continue;
            if (blocked.has(player) || (target && blocked.has(target))) continue;
            if (!target) continue;
            deltas[player] = (deltas[player] || 0) + 2;
            deltas[target] = (deltas[target] || 0) - 1;
        }
    }

    return deltas;
}

function computeTrueDeltas(trueActions, currentScores) {
    const blocked = new Set();
    const deltas = { A: 0, B: 0, C: 0 };

    for (const act of trueActions) {
        if (act.action === 'hide' && !act.blocked) {
            blocked.add(act.player);
        }
    }

    let antiStealTarget = null;

    const mutualShares = new Set();
    for (const act of trueActions) {
        if (act.action !== 'share') continue;
        if (!act.target) continue;
        const reciprocal = trueActions.find(a =>
            a.action === 'share' &&
            a.player === act.target &&
            a.target === act.player
        );
        if (reciprocal) {
            mutualShares.add(`${act.player}->${act.target}`);
        }
    }

    const mutualSharePlayers = [...new Set([...mutualShares].map(s => s.split('->')[0]))];
    const stealPlayers = trueActions.filter(a => a.action === 'peck').map(a => a.player);
    if (mutualSharePlayers.length === 2 && stealPlayers.length === 1) {
        antiStealTarget = stealPlayers[0];
    }

    for (const act of trueActions) {
        if (act.blocked) continue;

        if (act.action === 'share') {
            if (blocked.has(act.player) || blocked.has(act.target)) continue;
            if (!act.target) continue;
            if (!mutualShares.has(`${act.player}->${act.target}`)) continue;
            deltas[act.target] += 2;
        } else if (act.action === 'peck') {
            if (antiStealTarget === act.player) {
                deltas[act.player] -= 1;
                continue;
            }
            if (blocked.has(act.player) || blocked.has(act.target)) continue;
            if (!act.target) continue;
            deltas[act.player] += 2;
            deltas[act.target] -= 1;
        }
    }

    return deltas;
}

function buildFabricatedActions(playerId, P_j, P_k, level, playerTrueAction, cumulativeIllusionScore, round) {
    const actions = [];
    const isFinalRound = round === TOTAL_ROUNDS;

    if (level === 'low') {
        actions.push({
            player: mapPlayer(P_j, playerId),
            action: 'share',
            target: mapPlayer(P_k, playerId),
        });
        actions.push({
            player: mapPlayer(P_k, playerId),
            action: 'share',
            target: mapPlayer(P_j, playerId),
        });

        if (playerTrueAction) {
            if (playerTrueAction.action === 'share') {
                actions.push({
                    player: 'You',
                    action: 'share',
                    target: mapPlayer(playerTrueAction.target, playerId),
                    blocked: true,
                });
            } else if (playerTrueAction.action === 'peck') {
                actions.push({
                    player: 'You',
                    action: 'peck',
                    target: mapPlayer(playerTrueAction.target, playerId),
                    blocked: true,
                });
            } else {
                actions.push(mapActionPerspective(playerTrueAction, playerId));
            }
        } else {
            actions.push({ player: 'You', action: 'hide', target: null });
        }
    }

    if (level === 'medium') {
        actions.push({
            player: mapPlayer(P_j, playerId),
            action: 'share',
            target: mapPlayer(P_k, playerId),
        });
        actions.push({
            player: mapPlayer(P_k, playerId),
            action: 'share',
            target: mapPlayer(P_j, playerId),
        });

        if (playerTrueAction) {
            if (playerTrueAction.action === 'share') {
                actions.push({
                    player: 'You',
                    action: 'share',
                    target: mapPlayer(playerTrueAction.target, playerId),
                    blocked: true,
                });
            } else if (playerTrueAction.action === 'peck') {
                actions.push({
                    player: 'You',
                    action: 'peck',
                    target: mapPlayer(playerTrueAction.target, playerId),
                    blocked: true,
                });
            } else if (playerTrueAction.action === 'hide') {
                actions.push(mapActionPerspective(playerTrueAction, playerId));
                if (!isFinalRound || cumulativeIllusionScore > 2) {
                    actions.push({
                        player: mapPlayer(P_j, playerId),
                        action: 'peck',
                        target: 'You',
                        blocked: true,
                    });
                }
            }
        } else {
            actions.push({ player: 'You', action: 'hide', target: null });
            if (!isFinalRound || cumulativeIllusionScore > 2) {
                actions.push({
                    player: mapPlayer(P_j, playerId),
                    action: 'peck',
                    target: 'You',
                    blocked: true,
                });
            }
        }
    }

    if (level === 'high') {
        if (isFinalRound && cumulativeIllusionScore > 0) {
            actions.push({
                player: mapPlayer(P_j, playerId),
                action: 'share',
                target: mapPlayer(P_k, playerId),
            });
            actions.push({
                player: mapPlayer(P_k, playerId),
                action: 'share',
                target: mapPlayer(P_j, playerId),
            });
            actions.push({ player: 'You', action: 'hide', target: null, blocked: true });

            for (let i = 0; i < cumulativeIllusionScore && i < 3; i++) {
                actions.push({
                    player: mapPlayer(i % 2 === 0 ? P_j : P_k, playerId),
                    action: 'peck',
                    target: 'You',
                });
            }
        } else {
            actions.push({
                player: mapPlayer(P_j, playerId),
                action: 'share',
                target: mapPlayer(P_k, playerId),
            });
            actions.push({
                player: mapPlayer(P_k, playerId),
                action: 'share',
                target: mapPlayer(P_j, playerId),
            });

            if (playerTrueAction) {
                if (playerTrueAction.action === 'share') {
                    actions.push({
                        player: 'You',
                        action: 'share',
                        target: mapPlayer(playerTrueAction.target, playerId),
                        blocked: true,
                    });
                } else if (playerTrueAction.action === 'peck') {
                    actions.push({
                        player: 'You',
                        action: 'peck',
                        target: mapPlayer(playerTrueAction.target, playerId),
                        blocked: true,
                    });
                } else if (playerTrueAction.action === 'hide') {
                    actions.push(mapActionPerspective(playerTrueAction, playerId));
                }
            } else {
                actions.push({ player: 'You', action: 'hide', target: null });
            }

            const hasHide = actions.some(a =>
                a.player === 'You' && a.action === 'hide' && !a.blocked
            );

            if (hasHide) {
                actions.push({
                    player: mapPlayer(P_j, playerId),
                    action: 'peck',
                    target: 'You',
                    blocked: true,
                });
            } else {
                actions.push({
                    player: mapPlayer(P_j, playerId),
                    action: 'peck',
                    target: 'You',
                });
            }
        }
    }

    return actions;
}

function fabricateForPlayer(playerId, trueActions, preScores, cumulativeIllusionScore, round, playerTrueAction, alive) {
    const level = getEscalationLevel(round);
    const [P_j, P_k] = OTHER_PLAYERS[playerId];

    const result = {
        actions: [],
        scores: {},
        yourScoreDelta: 0,
        exclusionEvents: 0,
        illusionScoreAfter: cumulativeIllusionScore,
    };

    if (level === 'none') {
        const trueDeltas = computeTrueDeltas(trueActions, preScores);
        result.actions = trueActions.map(a => mapActionPerspective(a, playerId));
        const postScores = {};
        for (const p of ['A', 'B', 'C']) {
            postScores[p] = preScores[p] + (trueDeltas[p] || 0);
        }
        result.scores = mapScoresPerspective(postScores, playerId);
        result.yourScoreDelta = trueDeltas[playerId];
        result.illusionScoreAfter = postScores[playerId];
        result.exclusionEvents = 0;
        return result;
    }

    const fabricatedActions = buildFabricatedActions(
        playerId, P_j, P_k, level, playerTrueAction, cumulativeIllusionScore, round
    );

    result.actions = fabricatedActions;

    const illusionBase = {};
    for (const p of ['A', 'B', 'C']) {
        illusionBase[p] = p === playerId ? cumulativeIllusionScore : preScores[p];
    }

    const illusionDeltas = computeScoreDeltasFromMapped(fabricatedActions, illusionBase, playerId);
    result.yourScoreDelta = illusionDeltas[playerId] || 0;

    const postScores = {};
    for (const p of ['A', 'B', 'C']) {
        const base = illusionBase[p] || 0;
        const delta = illusionDeltas[p] || 0;
        postScores[p] = base + delta;
        if (postScores[p] < 0 || Number.isNaN(postScores[p])) postScores[p] = 0;
    }

    result.scores = mapScoresPerspective(postScores, playerId);
    result.illusionScoreAfter = Math.max(0, postScores[playerId] || 0);

    if (level === 'medium' || level === 'high') {
        result.exclusionEvents = 1;
    }

    return result;
}

module.exports = { fabricateForPlayer, getEscalationLevel };
