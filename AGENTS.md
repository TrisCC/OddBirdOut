# AGENTS.md — Agent Guidelines for OddBirdOut

## Project Summary

Odd Bird Out is a **three-player interactive game installation** about cyber ostracism. A Node.js/Socket.IO server manipulates what each player sees on their tablet, fabricating social exclusion in a Phaser 3 pixel-art web game. Each session: 12 rounds (6 trust + 6 ostracism). The player with the most eggs wins the Golden Egg.

The manipulation is **concealed during gameplay** — no hearts, no phase labels, no sad expressions. The ostracism is only revealed at game end after a fake GameOver screen.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Node.js 20+, Express.js, Socket.IO |
| Frontend | Phaser 3.88.2 (ES modules), vanilla JS |
| Font | Press Start 2P (pixel-art webfont, served from `assets/fonts/`) |
| Runtime | Browser (Android tablets via Fully Kiosk Browser) |
| Assets | Programmatic placeholder sprites (Phaser Graphics) — no external files |
| Lighting | Optional DMX512 via serial or remote UDP forwarder |
| Persistence | In-memory state + JSON file dumps per session |

## Repository Layout

```
docs/                          # All specification documents
  project_description.md       # Creative vision & concept
  technical_specifications.md  # Complete technical reference (read this first)
  implementation_plan.md       # Phased task checklist

OddBirdOut/                    # Phaser frontend
  src/
    main.js                    # Phaser config & game launch
    scenes/
      Boot.js                  # Socket connection + asset loading
      Start.js                 # Title splash screen
      Lobby.js                 # Player ready screen
      Game.js                  # Main gameplay scene
      GameOver.js              # Fake post-game result, reveal button
      Reveal.js                # Post-game truth reveal
      PreviewBoot.js           # Boot scene for ?preview= mode (no server)
    SocketManager.js           # Socket.IO client singleton
    PlaceholderAssets.js       # Procedural sprite generator
    CreditsOverlay.js          # Music credits button (bottom-right overlay)
  index.html                   # HTML shell, loads Phaser + main.js
  phaser.js                    # Phaser 3.88.2 (7.8 MB, do not modify)
  assets/                      # Static assets (fonts, future pixel art)

server/                        # Backend
  index.js                     # Express + Socket.IO entry
  config.js                    # All tunable parameters
  admin.html                   # Admin dashboard (Socket.IO-based)
  game/
    GameRoom.js                # Connection/role/disconnect + admin socket management
    GameState.js               # True state + scoring engine
    OstracismEngine.js         # Fabrication algorithm
    RoundResolver.js           # Round lifecycle + admin callback hooks
  data/sessions/               # Saved game results
```

## Key Conventions

- **No comments** unless a function's purpose is genuinely non-obvious. The code should speak for itself.
- **Use ES module syntax** (`import`/`export`). No CommonJS in the frontend. Backend uses CommonJS (`require`/`module.exports`).
- **Phaser scenes extend `Phaser.Scene`**, call `super('SceneName')`. Scene names are PascalCase strings.
- **Placeholder assets** are generated via `PlaceholderAssets.js` using `scene.add.graphics()` → `generateTexture()`, NOT external PNG files. This keeps the asset pipeline swappable.
- **Socket.IO events follow the schema in `docs/technical_specifications.md` Section 5.** Do not invent new event names without updating the spec.
- **`pixelArt: true`** must remain in the Phaser config.
- **Game resolution is 1280×720**, scaled via `Phaser.Scale.FIT` with `CENTER_BOTH`.
- **Player roles are A, B, C** — uppercase, single letter. Obtained from `?player=` URL param.
- **Font "Press Start 2P"** is loaded via `@font-face` in `index.html`. All in-game text should use this font family.

## Architectural Patterns

### State ownership
The server owns **all** game state. The frontend is a dumb renderer — it sends actions, receives round results, plays animations. Never compute game logic on the client.

## Scoring System

- All players start with **0 eggs** (configurable via `STARTING_EGGS` in `config.js`).
- Each round, every player **Shares** with their left or right neighbor (per `SIDE_ORDER`).
- If a **mutual pair** forms (A shares with B *and* B shares with A), each gains **+1 egg**.
- If **no mutual pair** forms in a round, **all three players** gain **+1 egg**.
- Players who **Hide** (head-in-sand) gain **0 eggs**, regardless of mutuals.
  - Players **cannot manually choose to hide** — the frontend only offers Share Left / Share Right buttons.
  - When the timer expires, inactive players are auto-assigned `hide` if `DEFAULT_TO_HIDE` is `true`, or `share` with the neighbor with the fewest eggs otherwise.
- After round 12, player(s) with most eggs win the Golden Egg. Ties allowed.

### Ostracism Concealment (Phase 2, rounds 7–12)

The ostracism is **hidden from players during gameplay**. The frontend does NOT display:
- Phase labels ("Trust" / "Ostracism")
- Broken hearts
- Sad ostrich expressions
- Heavy vignette darkening (only a subtle 0.08 max-alpha vignette remains)

The manipulation is only revealed at game end in the **GameOver → Reveal** sequence. Each player first sees a fake GameOver screen based on their illusion, then taps "What went wrong?" to see the **Reveal** scene with true scores vs shown scores.

## Configuration

All tunable parameters in `server/config.js`:

| Key | Default | Description |
|-----|---------|-------------|
| `TOTAL_ROUNDS` | `12` | Total rounds per game |
| `ROUND_DURATION_MS` | `10000` | Time per round (ms) |
| `ROUND_RESOLVE_ANIMATION_MS` | `3000` | Pause between rounds (ms) |
| `PHASE1_ROUNDS` | `6` | Trust rounds (rounds 1–6) before ostracism |
| `STARTING_EGGS` | `0` | Eggs per player at game start |
| `AUTO_START_DELAY_SECONDS` | `10` | Delay before auto-starting when lobby is full |
| `AUTO_RESET_TIMEOUT_SECONDS` | `120` | Delay before returning to lobby after reveal |
| `RECONNECT_TIMEOUT_MS` | `60000` | Grace period before dropping disconnected players |
| `DEFAULT_TO_HIDE` | `true` | Inactive players hide instead of sharing |
| `SKIP_ON_ALL_READY` | `true` | End round immediately when all have acted |
| `DEBUG_MODE` | `false` | Disable round timer — wait for all actions |
| `DMX_ENABLED` | `false` | Enable DMX lighting control |

### DMX Lighting

The server can control RGB lighting via DMX512. Enabling `DMX_ENABLED` triggers color changes per game phase (lobby → gameplay → game over). Channels are assigned via `DMX_CHANNEL_R`, `DMX_CHANNEL_G`, `DMX_CHANNEL_B`. Supports serial (enttec-open-usb-dmx) or remote UDP forwarding.

## Admin Dashboard

A real-time admin dashboard is available at `http://localhost:3000/admin`. It connects via Socket.IO with `query: { admin: 'true' }` and receives dedicated admin-only events (`adminState`, `adminRoundResult`). The dashboard shows:
- Connection status and player readiness
- Live round/phase info and action submissions
- True scores and per-player illusion comparison (side-by-side)
- Per-player fabricated action details and delta
- Round history table
- Reset button to force-end the current game

Admin socket handlers are `adminReset` (client → server) and `adminState` / `adminRoundResult` (server → client). See `GameRoom.js` and `RoundResolver.js`.

### Scene flow
```
Boot → Start → Lobby → Game (12 rounds, phase switch at round 7) → GameOver → Reveal
```

Preview mode (`?preview=`) uses `PreviewBoot` instead of `Boot` and bypasses the server entirely — events are mocked client-side.

### SocketManager (singleton)
Created in the Boot scene, passed to subsequent scenes via `scene.start('SceneName', { socketManager })`. Wraps all Socket.IO client logic. Exposes `emitPlayerReady()`, `emitPlayerAction(action, target)`, and event callback registration.

### CreditsOverlay
The `CreditsOverlay.js` module exports `addCreditsButton(scene)`, which draws a credits button (bottom-right) that opens a modal with music license info. Used by Start, Lobby, Game, GameOver, and Reveal scenes.

## Commands

```bash
# Start the server (from repo root)
node server/index.js

# Server will be at http://localhost:3000
# Test with 3 browser tabs:
#   http://localhost:3000/?player=A
#   http://localhost:3000/?player=B
#   http://localhost:3000/?player=C
# Admin dashboard:
#   http://localhost:3000/admin
```

No build step — the Phaser frontend is served as-is by Express.

## Testing

No automated test framework. Manual testing via multiple browser tabs:
1. Start the server
2. Open 3 tabs with `?player=A`, `?player=B`, `?player=C`
3. Play through all 12 rounds
4. Verify each tab sees different actions in Phase 2
5. Check `server/data/sessions/` for saved JSON

Preview routes (`?player=A&preview=lobby|game|reveal|boot`) allow testing individual scenes without a server or other players.

## Before Starting Any Task

1. Read `docs/technical_specifications.md` — it's the single source of truth.
2. Check `docs/implementation_plan.md` for the current phase and task checklist.
3. If creating a new file, match the directory structure defined in the tech spec Section 3.2 and 4.4.
4. If adding a Socket.IO event, update the event schema in the tech spec Section 5.
