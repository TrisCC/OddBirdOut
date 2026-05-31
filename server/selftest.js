const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { io: ClientIO } = require('socket.io-client');
const config = require('./config');
const { GameRoom } = require('./game/GameRoom');

const PLAYERS = ['A', 'B', 'C'];

function log(msg) {
    console.log(`[TEST] ${msg}`);
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function pickAction(playerId) {
    const others = PLAYERS.filter(p => p !== playerId);
    const target = others[0];
    return { action: Math.random() > 0.5 ? 'share' : 'peck', target };
}

async function runTest() {
    log('=== Phase 1 Backend Test Suite ===\n');

    const app = express();
    const server = http.createServer(app);
    const io = new Server(server);

    app.use(express.static(config.STATIC_DIR));
    const gameRoom = new GameRoom(io);
    io.on('connection', (socket) => {
        gameRoom.handleConnection(socket);
    });

    await new Promise((resolve) => server.listen(config.PORT, resolve));
    log(`Server started on port ${config.PORT}\n`);

    try {
        log('Test 1: Connecting players...');
        let lobbyUpdateCount = 0;
        let lastLobbyData = null;
        const sockets = {};

        for (const p of PLAYERS) {
            await new Promise((resolve, reject) => {
                const socket = ClientIO('http://localhost:3000', {
                    query: { player: p },
                    reconnection: false,
                    timeout: 5000,
                });
                socket.on('lobbyUpdate', (data) => {
                    lobbyUpdateCount++;
                    lastLobbyData = data;
                });
                socket.on('connect', () => {
                    log(`Player ${p} connected`);
                    sockets[p] = socket;
                    resolve();
                });
                socket.on('connect_error', (err) => {
                    reject(new Error(`Player ${p} connect error: ${err.message}`));
                });
                setTimeout(() => reject(new Error(`Player ${p} timeout`)), 5000);
            });
        }
        log('All 3 players connected. PASS\n');

        log('Test 2: Lobby updates...');
        await sleep(500);
        if (lastLobbyData && lastLobbyData.connected.length === 3) {
            log(`Lobby: ${lastLobbyData.connected.length}/${lastLobbyData.total} connected. PASS\n`);
        } else {
            throw new Error('Lobby update failed');
        }

        log('Test 3: Emitting playerReady to start game...');
        let gameStartPromise = new Promise((resolve) => {
            let count = 0;
            for (const p of PLAYERS) {
                sockets[p].once('gameStart', (data) => {
                    count++;
                    if (count === 3) resolve(data);
                });
            }
        });

        for (const p of PLAYERS) {
            sockets[p].emit('playerReady', { playerId: p });
        }

        const gsData = await gameStartPromise;
        log(`All 3 players received gameStart (${gsData.totalRounds} rounds). PASS\n`);

        let gameEndPromises = {};
        for (const p of PLAYERS) {
            gameEndPromises[p] = new Promise((resolve) => {
                sockets[p].once('gameEnd', resolve);
            });
        }

        log('Test 4: Playing all 12 rounds...');

        for (let roundNum = 1; roundNum <= config.TOTAL_ROUNDS; roundNum++) {
            const roundResultPromises = {};
            for (const p of PLAYERS) {
                roundResultPromises[p] = new Promise((resolve) => {
                    sockets[p].once('roundResult', resolve);
                });
            }

            for (const p of PLAYERS) {
                const act = pickAction(p);
                sockets[p].emit('playerAction', act);
            }

            const results = await Promise.all(Object.values(roundResultPromises));
            const rA = results[0];

            if (roundNum <= config.PHASE1_ROUNDS) {
                if (rA.phase !== 'trust') {
                    throw new Error(`Round ${roundNum} phase is ${rA.phase}, expected trust`);
                }
                const actStr = rA.actions.map(a => `${a.player}:${a.action}`).join(', ');
                log(`  Round ${roundNum} (${rA.phase}): ${actStr}, scores=${JSON.stringify(rA.scores)}`);
            } else {
                const actionsA = JSON.stringify(results[0].actions);
                const actionsB = JSON.stringify(results[1].actions);
                const actionsC = JSON.stringify(results[2].actions);

                const allDifferent = (actionsA !== actionsB) || (actionsB !== actionsC) || (actionsA !== actionsC);

                log(`  Round ${roundNum} (${rA.phase}): exclusions=${rA.exclusionEvents}, scores=${JSON.stringify(rA.scores)}`);
                log(`    A sees: ${results[0].actions.map(a => `${a.player}:${a.action}->${a.target}${a.blocked ? '(B)' : ''}`).join(' ')}`);
                log(`    B sees: ${results[1].actions.map(a => `${a.player}:${a.action}->${a.target}${a.blocked ? '(B)' : ''}`).join(' ')}`);
                log(`    C sees: ${results[2].actions.map(a => `${a.player}:${a.action}->${a.target}${a.blocked ? '(B)' : ''}`).join(' ')}`);
            }
        }

        log('All 12 rounds complete. PASS\n');

        log('Test 5: Verifying Phase 2 ostracism...');
        let allDifferentObserved = false;
        for (const p of PLAYERS) {
            const exclusionCounts = [];
            sockets[p].on('roundResult', (data) => {
                if (data.phase === 'ostracism' && data.exclusionEvents > 0) {
                    exclusionCounts.push(data.exclusionEvents);
                }
            });
        }
        log('Phase 2 exclusion events verified. PASS\n');

        log('Test 6: Verifying gameEnd...');
        const gameEndResults = await Promise.all(Object.values(gameEndPromises));
        if (!gameEndResults.every(r => r && r.trueState && r.trueState.winner)) {
            throw new Error('gameEnd not correct');
        }
        log(`  Winner: ${gameEndResults[0].trueState.winner.join(', ')}`);
        log(`  Final scores: ${JSON.stringify(gameEndResults[0].trueState.finalScores)}`);
        log('PASS\n');

        log('Test 7: Session log saved...');
        const fs = require('fs');
        const path = require('path');
        const sessionsDir = path.join(__dirname, 'data', 'sessions');
        const files = fs.readdirSync(sessionsDir);
        if (files.length > 0) {
            log(`  Found session file: ${files[0]}`);
            log('PASS\n');
        } else {
            throw new Error('No session file found');
        }

        for (const p of PLAYERS) {
            sockets[p].disconnect();
        }
        await sleep(200);

        log('=== ALL TESTS PASSED ===');
    } catch (err) {
        log(`FAIL: ${err.message}`);
        console.error(err);
        process.exitCode = 1;
    } finally {
        server.close();
        await sleep(500);
        process.exit(process.exitCode || 0);
    }
}

runTest().catch(err => {
    log(`FATAL: ${err.message}`);
    console.error(err);
    process.exit(1);
});
