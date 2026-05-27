# AGENTS.md — Agent Guidelines for OddBirdOut

## Project Summary

Odd Bird Out is a **three-player interactive game installation** about cyber ostracism. A Node.js/Socket.IO server manipulates what each player sees on their tablet, fabricating social exclusion in a Phaser 3 pixel-art web game. Each session: 12 rounds (4 trust + 8 ostracism), 20s per round. Player with most seeds wins the Golden Egg.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Node.js 20+, Express.js, Socket.IO |
| Frontend | Phaser 3.88.2 (ES modules), vanilla JS |
| Runtime | Browser (Android tablets via Fully Kiosk Browser) |
| Assets | Programmatic placeholder sprites (Phaser Graphics) — no external files yet |
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
      Start.js                 # TEMPORARY placeholder scene (will be replaced)
    SocketManager.js           # Socket.IO client singleton (TO BE CREATED)
    PlaceholderAssets.js       # Procedural sprite generator (TO BE CREATED)
  index.html                   # HTML shell, loads Phaser + main.js
  phaser.js                    # Phaser 3.88.2 (7.8 MB, do not modify)
  assets/                      # Static assets (no pixel art yet)

server/                        # Backend (NOT YET CREATED)
  index.js                     # Express + Socket.IO entry
  config.js                    # All tunable parameters
  game/
    GameRoom.js                # Connection/role/disconnect management
    GameState.js               # True state + 3 illusion states
    OstracismEngine.js         # Fabrication algorithm
    RoundResolver.js           # Round lifecycle
  data/sessions/               # Saved game results
  public/ -> ../OddBirdOut/    # Served static files
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

## Architectural Patterns

### State ownership
The server owns **all** game state. The frontend is a dumb renderer — it sends actions, receives round results, plays animations. Never compute game logic on the client.

### Ostracism (Phase 2)
The server computes **one true state** and **three separate illusion payloads**. Each player receives `roundResult` via individual `socket.emit()`, never broadcast during Phase 2. The OstracismEngine pseudocode is in the tech spec Section 3.4.

### Scene flow
```
Boot → Lobby → Game (12 rounds, phase switch at round 5) → Reveal
```

### SocketManager (singleton)
Created in the Boot scene, passed to subsequent scenes via `scene.start('SceneName', { socketManager })`. Wraps all Socket.IO client logic. Exposes `emitPlayerReady()`, `emitPlayerAction(action, target)`, and event callback registration.

## Commands

```bash
# Start the server (from repo root)
node server/index.js

# Server will be at http://localhost:3000
# Test with 3 browser tabs:
#   http://localhost:3000/?player=A
#   http://localhost:3000/?player=B
#   http://localhost:3000/?player=C
```

No build step — the Phaser frontend is served as-is by Express.

## Testing

No automated test framework. Manual testing via multiple browser tabs:
1. Start the server
2. Open 3 tabs with `?player=A`, `?player=B`, `?player=C`
3. Play through all 12 rounds
4. Verify each tab sees different actions in Phase 2
5. Check `server/data/sessions/` for saved JSON

## Before Starting Any Task

1. Read `docs/technical_specifications.md` — it's the single source of truth.
2. Check `docs/implementation_plan.md` for the current phase and task checklist.
3. If creating a new file, match the directory structure defined in the tech spec Section 3.2 and 4.4.
4. If adding a Socket.IO event, update the event schema in the tech spec Section 5.

## Current Status (Phase 2 complete)

- [x] Phase 0 complete (main.js fixed, boilerplate removed, Start.js → Boot.js)
- [x] Phase 1 complete (backend: Express + Socket.IO server, GameRoom, GameState, RoundResolver, OstracismEngine, session persistence)
- [x] Phase 2 complete (frontend: Boot, Lobby, Game, Reveal scenes; SocketManager, PlaceholderAssets; all 4 scenes registered)
- [ ] Phase 3: Integration & Polish not started
