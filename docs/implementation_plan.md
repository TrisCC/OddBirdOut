# Odd Bird Out — Implementation Plan

This plan translates the [project description](project_description.md) and [technical specifications](technical_specifications.md) into a concrete, phased development roadmap. Each phase lists ordered, checkbox-able tasks.

---

## Phase 0 — Housekeeping (est. 30 min)

Clean up the scaffold before real development begins.

- [x] **0.1** Fix `OddBirdOut/src/main.js`: change `title` from `'Overlord Rising'` to `'OddBirdOut'`, set `pixelArt: true`
- [x] **0.2** Delete unused boilerplate assets: `space.png`, `spaceship.png`, `phaser.png` from `OddBirdOut/assets/`
- [x] **0.3** Rename `src/scenes/Start.js` to `src/scenes/Boot.js` (or keep as placeholder; the scene gets rewritten later anyway)

---

## Phase 1 — Backend Foundation (est. 3–4 days)

The server is the backbone. Build it first so the frontend has something to connect to from day one.

### 1.1 Project Scaffolding
- [x] **1.1.1** Create `server/package.json` with dependencies: `express`, `socket.io`, `uuid`
- [x] **1.1.2** Create `server/config.js` with all tunable parameters from the tech spec
- [x] **1.1.3** Create `server/index.js` — Express server with Socket.IO, serving static files from `../OddBirdOut/`
- [x] **1.1.4** Create `server/data/sessions/` directory

### 1.2 Room Management (`server/game/GameRoom.js`)
- [x] **1.2.1** On `connection`: extract `player` query param from handshake, validate it's A/B/C
- [x] **1.2.2** Reject duplicate role claims (emit error if role already taken)
- [x] **1.2.3** Track connected player socket IDs in a map: `{ A: socketId, B: socketId, C: socketId }`
- [x] **1.2.4** Broadcast `lobbyUpdate` to all clients when player connects/disconnects
- [x] **1.2.5** Listen for `playerReady` event per client
- [x] **1.2.6** When all 3 players are connected AND ready, emit `gameStart` to all
- [x] **1.2.7** Handle disconnection: pause game, 60s reconnection window, else abort

### 1.3 Game State (`server/game/GameState.js`)
- [x] **1.3.1** Initialize true state: `{ scores: {A:0, B:0, C:0}, actions: [], round: 1, phase: 'trust' }`
- [x] **1.3.2** Initialize three illusion states (empty until Phase 2)
- [x] **1.3.3** Functions: `resetForNewRound()`, `applyAction(player, action, target)`, `resolveRound()`
- [x] **1.3.4** Head in Sand logic: mark player as blocking, skip Share/Peck targeting them

### 1.4 Round Resolver (`server/game/RoundResolver.js`)
- [x] **1.4.1** Start round: set a 20-second timer, enable action collection
- [x] **1.4.2** Collect actions from all three players via `playerAction` event
- [x] **1.4.3** On timer expiry: any unsubmitted player defaults to Head in Sand
- [x] **1.4.4** Resolve true state: apply actions, compute score deltas
- [x] **1.4.5** Call OstracismEngine for Phase 2, emit `roundResult` to each player
- [x] **1.4.6** After round 12: emit `gameEnd` with true state + all illusions
- [x] **1.4.7** Save game data as JSON to `server/data/sessions/`

### 1.5 Ostracism Engine (`server/game/OstracismEngine.js`)
- [x] **1.5.1** Implement escalation mapping: `round 5-6 → low, 7-9 → medium, 10-12 → high`
- [x] **1.5.2** `fabricateForPlayer(playerId, trueState, escalationLevel)` — returns illusion payload
- [x] **1.5.3** Low: inject 1 fabricated share between the other two players, adjust score display
- [x] **1.5.4** Medium: fabricate mutual sharing between the other two, player's own action shown accurately
- [x] **1.5.5** High: full exclusion — other two exclusively cooperate, player's share actions shown as blocked
- [x] **1.5.6** Ensure illusion score deltas are consistent within each illusion (no impossible scores)

### 1.6 Testing
- [x] **1.6.1** Manual test: 3 browser tabs (`?player=A`, `?player=B`, `?player=C`), verify lobby → game start
- [x] **1.6.2** Test Phase 1: verify true actions resolve correctly, scores add up
- [x] **1.6.3** Test Phase 2: verify each tab sees a different reality, exclusion feedback present
- [x] **1.6.4** Test edge cases: disconnect, timer expiry, 0-seed peck, Head in Sand blocking
- [x] **1.6.5** Verify JSON session file is saved correctly after game end

---

## Phase 2 — Frontend Scenes (est. 5–7 days)

Build all four scenes top-to-bottom, connecting to the (now working) backend.

### 2.1 Boot Scene (`src/scenes/Boot.js`)
- [ ] **2.1.1** Initiate Socket.IO connection to `http://{serverIP}:3000` with `?player={A|B|C}` query
- [ ] **2.1.2** Create placeholder assets programmatically via `PlaceholderAssets.js` (colored rectangles, circles)
- [ ] **2.1.3** Show a "Loading..." text with a simple progress bar
- [ ] **2.1.4** On preload complete, transition to Lobby scene, pass SocketManager reference

### 2.2 Lobby Scene (`src/scenes/Lobby.js`)
- [ ] **2.2.1** Display "Waiting for players..." header
- [ ] **2.2.2** Show connected player count (e.g., "2/3 players connected")
- [ ] **2.2.3** Show this tablet's assigned role (A/B/C)
- [ ] **2.2.4** Listen for `lobbyUpdate` to update display
- [ ] **2.2.5** On `gameStart` event, store `playerId` and transition to Game scene

### 2.3 Game Scene (`src/scenes/Game.js`) — The Core

#### 2.3.1 HUD
- [ ] **2.3.1.1** Top bar: round counter (`Round 3 / 12`), phase label, timer countdown bar
- [ ] **2.3.1.2** Golden Egg: center-top, fills proportionally to leading score / max possible
- [ ] **2.3.1.3** Three ostrich placeholder avatars: green (A), blue (B), orange (C)
- [ ] **2.3.1.4** "You" label under self, seed count number under each ostrich
- [ ] **2.3.1.5** 3 hearts per player, shown as red rectangles

#### 2.3.2 Action Buttons
- [ ] **2.3.2.1** Three large buttons in bottom panel: Share (green), Peck (red), Head in Sand (blue)
- [ ] **2.3.2.2** Share/Peck: on tap, show target selector (two smaller buttons for other players)
- [ ] **2.3.2.3** Head in Sand: on tap, immediately submit (no target needed)
- [ ] **2.3.2.4** After submission: grey out all buttons, show "Waiting..." text
- [ ] **2.3.2.5** Timer expiry: auto-submit Head in Sand if no action selected

#### 2.3.3 Round Resolution & Animations
- [ ] **2.3.3.1** On `roundResult`: play action animations (~3 seconds)
- [ ] **2.3.3.2** Share animation: seed sprite flies from giver to receiver
- [ ] **2.3.3.3** Peck animation: peck sprite swipes at target ostrich
- [ ] **2.3.3.4** Head in Sand animation: ostrich burrows/ducks down
- [ ] **2.3.3.5** Score update: count-up or count-down tween next to each ostrich
- [ ] **2.3.3.6** Broken heart: grey heart replaces red heart on exclusion event
- [ ] **2.3.3.7** After animation completes, unlock buttons for next round

#### 2.3.4 Phase 2 Visuals
- [ ] **2.3.4.1** Phase label changes from "Trust" to "Ostracism" in round 5
- [ ] **2.3.4.2** Subtle vignette darkening on screen edges as escalation increases
- [ ] **2.3.4.3** Excluded ostrich shows "sad eyes" variant (drawn via Graphics)

### 2.4 Reveal Scene (`src/scenes/Reveal.js`)
- [ ] **2.4.1** On `gameEnd`: transition to Reveal scene
- [ ] **2.4.2** Animate "The Truth..." text appearing in large retro font
- [ ] **2.4.3** Show true final scores with a count-up reveal animation
- [ ] **2.4.4** Golden Egg cracks and hatches, awarded to winner(s)
- [ ] **2.4.5** Show message: "You were all manipulated. Nobody was truly excluded."
- [ ] **2.4.6** Show a summary of what each player was made to see (optional, visual)
- [ ] **2.4.7** "Restart" prompt after 30 seconds (or manual operator restart)

### 2.5 SocketManager Utility (`src/SocketManager.js`)
- [ ] **2.5.1** Initialize Socket.IO client with server URL + player query param
- [ ] **2.5.2** Expose `emitPlayerReady()`, `emitPlayerAction(action, target)`
- [ ] **2.5.3** Accept callback registrations for: `lobbyUpdate`, `gameStart`, `roundResult`, `gameEnd`
- [ ] **2.5.4** Handle `disconnect` / `reconnect` events
- [ ] **2.5.5** Store `this.playerId` (parsed from URL `?player=`)

### 2.6 Placeholder Assets (`src/PlaceholderAssets.js`)
- [ ] **2.6.1** `generateOstrichTexture(scene, color)` — colored rectangle with simple face
- [ ] **2.6.2** `generateSeedTexture(scene)` — small yellow circle
- [ ] **2.6.3** `generateEggTexture(scene)` — gold ellipse
- [ ] **2.6.4** `generateHeartTexture(scene, broken)` — red or grey heart shape
- [ ] **2.6.5** `generateButtonTexture(scene, label, color)` — rounded rect with text
- [ ] **2.6.6** All textures created in Boot scene via `scene.add.graphics()` → `generateTexture()`

### 2.7 Main Game Config Update (`src/main.js`)
- [ ] **2.7.1** Register all 4 scenes: `[Boot, Lobby, Game, Reveal]`
- [ ] **2.7.2** Remove old `Start` scene import

---

## Phase 3 — Integration & Polish (est. 2–3 days)

### 3.1 End-to-End Flow
- [ ] **3.1.1** Full playthrough: Boot → Lobby → Game (12 rounds) → Reveal, all 3 players
- [ ] **3.1.2** Verify Phase 2 escalation feels gradual and believable
- [ ] **3.1.3** Tweak round durations and animation timings for exhibition feel

### 3.2 Audio
- [ ] **3.2.1** Add placeholder SFX using Phaser's sound manager (simple beeps/tones)
- [ ] **3.2.2** Wire SFX to: button click, action submit, seed fly, peck, hide, heart break, egg crack, egg hatch
- [ ] **3.2.3** Add ambient BGM loop (placeholder: silent or simple tone loop)

### 3.3 Polish
- [ ] **3.3.1** Transition animations between scenes (fade in/out)
- [ ] **3.3.2** Add particle effects: seed sparkle on collection, egg glow
- [ ] **3.3.3** Smooth score count-up/down tweens
- [ ] **3.3.4** Ensure all text uses the retro "Press Start 2P" font (loaded via CSS)

---

## Phase 4 — Physical Exhibition Setup (est. 1–2 days)

### 4.1 Network
- [ ] **4.1.1** Configure ASUS router: set static IP `192.168.1.100` for server laptop (DHCP reservation or manual)
- [ ] **4.1.2** Set router SSID: e.g., `OddBirdOut` — no internet / WAN disconnected
- [ ] **4.1.3** Connect server laptop via Ethernet, verify tablets can reach `http://192.168.1.100:3000`

### 4.2 Tablets
- [ ] **4.2.1** Install Fully Kiosk Browser on all 3 Android tablets
- [ ] **4.2.2** Configure each tablet:
  - Start URL: `http://192.168.1.100:3000/?player=A` (B, C respectively)
  - Locked mode: no status bar, no gestures
  - Screen timeout: never
  - Orientation: landscape locked
- [ ] **4.2.3** Test each tablet loads the game and shows the correct role

### 4.3 Physical Setup
- [ ] **4.3.1** Arrange 3 tablets in triangular formation within the ~2.5m interaction zone
- [ ] **4.3.2** Install panels/curtains between stations so players cannot see others' screens
- [ ] **4.3.3** Cable management: power for tablets + server laptop
- [ ] **4.3.4** Position router centrally for even Wi-Fi coverage

### 4.4 Live Testing
- [ ] **4.4.1** Full run with 3 test players: verify the full experience flow
- [ ] **4.4.2** Observe player reactions — does the ostracism effect work?
- [ ] **4.4.3** Tweak round duration and escalation timing based on test feedback
- [ ] **4.4.4** Test disconnect + reconnect scenario

### 4.5 Operator Runbook
- [ ] **4.5.1** Write simple instructions: how to start the server, how to reset between groups
- [ ] **4.5.2** Document all IP addresses, URLs, and router config
- [ ] **4.5.3** Troubleshooting: what to do if a tablet disconnects, how to restart

---

## Phase 5 — Final Art & Audio (est. TBD)

This phase can run in parallel with earlier phases since placeholder assets are used during development.

- [ ] **5.1** Commission or create pixel-art sprite sheets (ostrich variants, seeds, Golden Egg, hearts, UI)
- [ ] **5.2** Commission or create audio assets (SFX + BGM)
- [ ] **5.3** Swap placeholder assets for final assets — single replace in `PlaceholderAssets.js`
- [ ] **5.4** Final visual polish pass

---

## Dependency Graph

```
Phase 0 (Housekeeping)
  └── Phase 1 (Backend) ──┐
                          ├── Phase 3 (Integration & Polish)
Phase 2 (Frontend) ──────┘       │
                                  ├── Phase 4 (Exhibition Setup)
Phase 5 (Final Art) ─────────────┘
```

- **Backend and Frontend can be built in parallel** if two developers are available.
- If single developer: build Backend first (Phases 1.1–1.5), then Frontend (Phase 2), then Integration (Phase 3).
- Phase 5 (Final Art) is fully independent and can start anytime.

---

## Key Files To Create / Modify

| File | Action | Phase |
|------|--------|-------|
| `server/package.json` | Create | 1.1 |
| `server/config.js` | Create | 1.1 |
| `server/index.js` | Create | 1.1 |
| `server/game/GameRoom.js` | Create | 1.2 |
| `server/game/GameState.js` | Create | 1.3 |
| `server/game/RoundResolver.js` | Create | 1.4 |
| `server/game/OstracismEngine.js` | Create | 1.5 |
| `OddBirdOut/src/main.js` | Modify | 0.1, 2.7 |
| `OddBirdOut/src/SocketManager.js` | Create | 2.5 |
| `OddBirdOut/src/PlaceholderAssets.js` | Create | 2.6 |
| `OddBirdOut/src/scenes/Boot.js` | Create | 2.1 |
| `OddBirdOut/src/scenes/Lobby.js` | Create | 2.2 |
| `OddBirdOut/src/scenes/Game.js` | Create | 2.3 |
| `OddBirdOut/src/scenes/Reveal.js` | Create | 2.4 |
| `OddBirdOut/assets/` (unused boilerplate) | Delete 3 files | 0.2 |
