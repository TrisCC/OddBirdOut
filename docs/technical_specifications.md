# Odd Bird Out Technical Specifications

---

## 1. Hardware & Network Topology

- **Router:** Modern ASUS Wi-Fi router. Standalone network — no internet connection required.
- **Laptop (Server):** Connected to the router via Ethernet (recommended) or 5GHz Wi-Fi. Assigned a static IP (`192.168.1.100`).
- **Tablets (Clients):** 3 basic Android tablets connected via Wi-Fi. Run a dedicated kiosk browser (Fully Kiosk Browser) to lock users into the webpage and prevent gestures.
- **URL scheme:** Each tablet accesses `http://192.168.1.100:3000/?player={A|B|C}`.

---

## 2. Gameplay Mechanics

### 2.1 Rounds & Timing

| Parameter | Value | Notes |
|-----------|-------|-------|
| Total rounds | 12 | Configurable |
| Round duration | ~20 seconds | Configurable — timer-based round end |
| Phase 1 (Trust) | Rounds 1–4 | Real game state, no manipulation |
| Phase 2 (Ostracism) | Rounds 5–12 | Gradual escalation of fabrication |

### 2.2 Actions

Each round, every player selects one action:

| Action | Target | Effect |
|--------|--------|--------|
| **Share** | Player B or C | Give 1 seed to the target |
| **Peck** | Player B or C | Steal 1 seed from the target |
| **Head in Sand** | Self | Block all incoming Share and Peck actions this round |

A player cannot act on themselves with Share or Peck. If a target has 0 seeds, Peck has no effect.

### 2.3 Scoring & Win Condition

- All players start with **0 seeds**.
- Seeds are accumulated individually per player across all rounds.
- After round 12, the **player with the highest seed count wins the Golden Egg**.
- In case of a tie, the Golden Egg is shared (both/all tied players win).

### 2.4 Round Resolution Order

1. All players submit their action (or timer expires — if no action, default to "Head in Sand").
2. Server resolves in parallel: Head in Sand blocks all incoming actions against that player.
3. Share/Peck between non-blocked players apply.
4. True state is computed. Illusion states are fabricated for Phase 2.
5. Round results are broadcast to each player.

---

## 3. Backend Architecture (Node.js + Socket.IO)

### 3.1 Core Stack

- **Express.js** — serves static frontend files from `server/public/`.
- **Socket.IO** — real-time bidirectional communication.
- **Runtime:** Node.js 20+. No database — all state in-memory. Sessions are ephemeral.

### 3.2 Directory Structure

```
server/
  index.js                  # Entry point: Express + Socket.IO setup
  config.js                 # Round count, round duration, phase thresholds
  game/
    GameRoom.js             # Room lifecycle: connect, assign roles, disconnect
    GameState.js            # True state + 3 illusion states
    OstracismEngine.js      # Fabrication algorithm per round
    RoundResolver.js        # Collect inputs → compute true state → generate per-player payloads
  data/
    sessions/               # Saved game result JSON files
  public/                   # Built frontend (Phaser game)
```

### 3.3 State Machine

- **Global State:** Current round, current phase, timer remaining.
- **True State:** Actual seed counts, actions taken, Golden Egg winner.
- **Illusion States (A, B, C):** Three independent per-player copies. During Phase 2, `socket.emit()` to each player sends a different, fabricated payload.
- **Actions Buffer:** Per-round, collects submitted actions from connected players. Round resolves when all three have submitted OR the timer expires.

### 3.4 Ostracism Algorithm

The fabrication escalates gradually across Phase 2. The algorithm, for each player P_i, generates an illusion where the other two (P_j, P_k) appear to cooperate with each other and exclude P_i.

**Escalation schedule:**

| Rounds | Fabrication Level | Behavior |
|--------|-------------------|----------|
| 1–4 | None | True state shown to all |
| 5–6 | Low | 1 fabricated action per round: show P_j sharing with P_k |
| 7–9 | Medium | 2 fabricated actions: P_j ↔ P_k share, both ignore P_i; P_i's actions are shown accurately to themselves |
| 10–12 | High | Full exclusion: P_j and P_k exclusively share with each other. If P_i used Head in Sand, show P_j/P_k pecking P_i (blocked). Displayed scores are adjusted to match illusions. |

**Per-player payload generation (pseudocode):**

```
for each player P_i in {A, B, C}:
    illusion = deepCopy(trueState)
    {P_j, P_k} = otherPlayers(P_i)

    switch (phase escalation level):
        case LOW:
            // Inject 1 fabricated share between P_j and P_k
            illusion.actions.push({ player: P_j, action: 'share', target: P_k })
        case MEDIUM:
            // Mutual cooperation between P_j and P_k
            illusion.actions = [
                { player: P_j, action: 'share', target: P_k },
                { player: P_k, action: 'share', target: P_j },
                ...(P_i's real action)
            ]
        case HIGH:
            // Full exclusion
            illusion.actions = [
                { player: P_j, action: 'share', target: P_k },
                { player: P_k, action: 'share', target: P_j },
                ...(P_i's real action, but if P_i shared → shown as blocked/ignored)
            ]
            // Adjust scores: P_j and P_k gain, P_i stays/stagnates

    emitTo(P_i, illusion)
```

### 3.5 Game Data Persistence

After each game ends, the **true state** is saved as a JSON file in `server/data/sessions/`.

**Filename:** `{ISO8601-timestamp}_{sessionId}.json`

**Schema:**
```json
{
  "sessionId": "uuid-v4",
  "startedAt": "2026-05-27T12:00:00Z",
  "endedAt": "2026-05-27T12:04:00Z",
  "durationMs": 240000,
  "config": {
    "totalRounds": 12,
    "roundDurationMs": 20000,
    "phase1Rounds": 4
  },
  "rounds": [
    {
      "round": 1,
      "phase": "trust",
      "trueActions": [
        { "player": "A", "action": "share", "target": "B" },
        { "player": "B", "action": "peck", "target": "A" },
        { "player": "C", "action": "hide", "target": null }
      ],
      "trueScores": { "A": 0, "B": 1, "C": 0 },
      "illusions": {
        "A": { "actions": [...], "scoreDeltas": {...} },
        "B": { "actions": [...], "scoreDeltas": {...} },
        "C": { "actions": [...], "scoreDeltas": {...} }
      }
    }
  ],
  "finalScores": { "A": 5, "B": 7, "C": 4 },
  "winner": ["B"]
}
```

---

## 4. Frontend Architecture (Phaser 3)

### 4.1 Phaser Configuration

```javascript
const config = {
    type: Phaser.AUTO,
    title: 'OddBirdOut',
    parent: 'game-container',
    width: 1280,
    height: 720,
    backgroundColor: '#2B1E10',
    pixelArt: true,
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
    },
    scene: [Boot, Lobby, Game, Reveal]
};
```

### 4.2 Scene Breakdown

#### Boot Scene (`src/scenes/Boot.js`)
- Preloads all placeholder sprites, UI elements, and the retro font.
- Shows a minimal loading bar.
- Auto-transitions to Lobby on completion.
- Connects to Socket.IO server during preload.

#### Lobby Scene (`src/scenes/Lobby.js`)
- Displays "Waiting for players..." with live connected count (1/3, 2/3, 3/3).
- Shows which player role (A/B/C) this tablet is assigned.
- When all 3 players are connected with unique roles, server emits `gameStart` and scene transitions to Game.

#### Game Scene (`src/scenes/Game.js`)
- **HUD Layout (top-to-bottom):**
  - Top bar: Round number ("Round 3 / 12"), phase indicator (Trust / Ostracism), timer countdown.
  - Golden Egg display: center-top, shows progress fill based on leading score.
  - Three ostrich avatars: labeled "You" for self, "Player B" / "Player C" for others, with seed count underneath.
  - Hearts display: each player has 3 hearts shown under their avatar.
- **Action Panel (bottom third):**
  - Three large pixel-art buttons: **Share** (green), **Peck** (red), **Head in Sand** (blue).
  - Tapping Share or Peck reveals a target selector (two smaller buttons for the other players).
  - Tapping Head in Sand immediately submits (no target needed).
  - Once submitted, buttons lock until round resolves.
- **Round Resolution (animation phase, ~3 seconds):**
  - Animates actions: seed flying between ostriches, peck animation, hide/burrow animation.
  - Scores update with a count-up/down tween.
  - Broken heart appears when player is excluded (Phase 2).
- **Phase 2 Additional UI:**
  - Subtle visual tension cues: screen edges darken slightly, the "excluded" ostrich's eyes look sad.
  - Broken heart icons accumulate as exclusion repeats.
- **Timer:**
  - Countdown bar at top of screen.
  - Flashes red when below 5 seconds.
  - If no action submitted, auto-defaults to Head in Sand.

#### Reveal Scene (`src/scenes/Reveal.js`)
- Triggered after round 12.
- Shows "The Truth" in large retro pixel text.
- Displays the true final scores vs what each player was shown (animated reveal).
- Golden Egg awarded to the winner(s) with a cracking/hatching animation.
- Message: "You were all manipulated. Nobody was truly excluded."
- Option to restart after a delay (or manual operator restart).

### 4.3 Socket.IO Client Integration

A shared `SocketManager` utility module (`src/SocketManager.js`):

```javascript
// Singleton wrapping the Socket.IO client
// Emits: playerReady, playerAction
// Listens: lobbyUpdate, gameStart, roundResult, gameEnd
// Exposes current playerId (A/B/C) from URL param
```

### 4.4 Frontend File Structure

```
OddBirdOut/
  assets/
    sprites/
      ostrich_idle.png       # Placeholder ostrich
      ostrich_peck.png
      ostrich_share.png
      ostrich_hide.png
      ostrich_hurt.png
      seed.png
      golden_egg.png
      heart.png
      broken_heart.png
    ui/
      button_share.png
      button_peck.png
      button_hide.png
      panel_bg.png
    fonts/
      press_start_2p.png     # Bitmap font or CSS font
  src/
    main.js                  # Game config + launch
    SocketManager.js         # Socket.IO singleton
    scenes/
      Boot.js
      Lobby.js
      Game.js
      Reveal.js
  index.html
  phaser.js
```

---

## 5. WebSocket Event Schema

### 5.1 Client → Server

| Event | Payload | Description |
|-------|---------|-------------|
| `playerReady` | `{ playerId: 'A' }` | Tablet announces role and readiness |
| `playerAction` | `{ action: 'share'\|'peck'\|'hide', target: 'A'\|'B'\|'C'\|null }` | Submitted action for current round |

### 5.2 Server → All Clients

| Event | Payload | Description |
|-------|---------|-------------|
| `lobbyUpdate` | `{ connected: ['A','B'], ready: 3 }` | Live lobby status |
| `gameStart` | `{ playerId: 'A', totalRounds: 12 }` | Game begins, tells client its role |
| `gameEnd` | `{ trueState: {...}, winner: ['B'], illusions: {A:{...}, B:{...}, C:{...}} }` | Final results and reveal data |

### 5.3 Server → Individual Client (Phase 2)

| Event | Payload | Description |
|-------|---------|-------------|
| `roundResult` | See below | Per-player fabricated round outcome |

**`roundResult` payload (per-player, Phase 2 example):**
```json
{
  "round": 6,
  "phase": "ostracism",
  "actions": [
    { "player": "B", "action": "share", "target": "C" },
    { "player": "C", "action": "share", "target": "B" },
    { "player": "You", "action": "share", "target": "B", "blocked": true }
  ],
  "scores": { "You": 2, "B": 5, "C": 4 },
  "yourScoreDelta": 0,
  "exclusionEvents": 2
}
```

During Phase 1 (Trust), `roundResult` is broadcast to all clients with the same truthful payload.

---

## 6. Pixel Art Placeholder Approach

Final pixel art is not yet defined. All development will use **programmatically generated placeholder sprites**:

- **Ostriches:** Colored rectangles (Player A = green, B = blue, C = orange) with a simple face drawn via Phaser Graphics.
- **Seeds:** Small yellow circles.
- **Golden Egg:** Gold-colored ellipse, grows a crack line in reveal.
- **Hearts / Broken Hearts:** Red rectangles in heart shape, grey for broken.
- **Action Buttons:** Rounded rectangles with text labels.
- **Background:** Solid dark brown with simple ground line.

All placeholder generation code lives in a single `src/PlaceholderAssets.js` utility, making it trivial to swap in real sprites later.

---

## 7. Audio

| Category | Assets |
|----------|--------|
| UI SFX | Button click, action submit |
| Action SFX | Seed toss/fly, peck/stab, burrow/hide |
| Feedback SFX | Seed collect (positive chime), broken heart (sad tone), exclusion feedback |
| Event SFX | Round start chime, timer warning tick, phase transition |
| End SFX | Egg crack, egg hatch, reveal fanfare |
| Ambience | Optional low BGM loop (chiptune) |

All audio uses Phaser's built-in audio manager. Placeholder: use Phaser-generated tones or simple beep SFX until final audio is ready.

---

## 8. Operational Concerns

### 8.1 Player Assignment & Room Management
- Players join via unique URL: `?player=A`, `?player=B`, `?player=C`.
- Server rejects duplicate role claims (second player trying `?player=A` gets an error page).
- Game only starts when all three unique roles are connected and have emitted `playerReady`.

### 8.2 Disconnection Handling
- If a player disconnects mid-game: game pauses, all clients show "Waiting for Player X to reconnect...".
- 60-second reconnection window; if exceeded, game terminates and all clients return to lobby.
- Auto-reconnect: Socket.IO `reconnect` enabled on client.

### 8.3 Game Reset
- Manual restart: operator refreshes all 3 tablets and restarts the Node.js server process.
- Future enhancement: admin button on server to trigger reset via WebSocket.

### 8.4 Kiosk Mode (Android Tablets)
- Install Fully Kiosk Browser from Google Play.
- Set start URL to `http://192.168.1.100:3000/?player={A|B|C}`.
- Enable "Locked Mode" (no status bar, no navigation gestures).
- Disable screen timeout.
- Lock to landscape orientation.

### 8.5 Spectator Display
- The true state is **not** revealed to spectators during gameplay.
- Spectators observe the physical interaction: players' reactions, the triangular installation.

---

## 9. Configuration

All tunable parameters in `server/config.js`:

```javascript
module.exports = {
    PORT: 3000,
    TOTAL_ROUNDS: 12,
    ROUND_DURATION_MS: 20000,
    ROUND_RESOLVE_ANIMATION_MS: 3000,
    PHASE1_ROUNDS: 4,
    RECONNECT_TIMEOUT_MS: 60000,
    STATIC_DIR: path.join(__dirname, '..', 'OddBirdOut'),
};
```

---

## 10. Known Bugs in Existing Code

| File | Issue | Fix |
|------|-------|-----|
| `OddBirdOut/src/main.js:5` | `title: 'Overlord Rising'` | Change to `'OddBirdOut'` |
| `OddBirdOut/src/main.js:11` | `pixelArt: false` | Change to `true` |
| `OddBirdOut/assets/` | Unused boilerplate: `space.png`, `spaceship.png`, `phaser.png` | Remove |
| `OddBirdOut/src/scenes/Start.js` | Placeholder scene — will be replaced by Boot/Lobby/Game/Reveal | Replace |

