# Odd Bird Out

**Odd Bird Out** is a three-player interactive game installation about cyber ostracism — the experience of being excluded in a digital social environment.

Three players compete as ostriches collecting eggs to hatch a Golden Egg. But after round 6, the system starts lying to each player, fabricating a version of the game where the other two players are cooperating against them. Every player privately believes they are the "odd bird out" — until the reveal.

## How It Works

1. **Phase 1 — Trust (Rounds 1–6):** The game plays honestly. Players see real actions and build trust in the system.
2. **Phase 2 — Concealed Manipulation (Rounds 7–12):** The server silently fabricates what each player sees — but there are **no visible indicators of ostracism** during gameplay. No phase labels, no broken hearts, no sad expressions. The manipulation is entirely hidden.
3. **GameOver:** Each player sees a fake results screen tailored to their illusion, with a button to reveal the truth.
4. **Reveal:** The truth comes out — nobody was actually excluded. The system manipulated everyone equally.

### Scoring

- All players start with **0 eggs** (configurable via `STARTING_EGGS`).
- Each round, players **Share** with their left or right neighbor.
  - If both targeted players share with each other (a **mutual pair**), each gains **+1 egg**.
  - If **no mutual pairs** form in a round, **all three players** gain +1 egg.
- Players who **Hide** (head-in-sand) by timeout gain nothing, regardless of mutuals. The Hide action is only auto-assigned when the timer expires — players cannot manually choose it.
- After all 12 rounds, the player(s) with the most eggs win the Golden Egg. Ties allowed.

### Scene Flow

```
Boot → Start → Lobby → Game (12 rounds) → GameOver → Reveal
```

| Scene | Purpose |
|-------|---------|
| Boot | Socket.IO connection, asset generation, color selection |
| Start | Title splash screen ("Tap anywhere to start") |
| Lobby | Player ready-up, tutorial carousel, waiting for all players |
| Game | Main 12-round gameplay: HUD, action buttons, animations |
| GameOver | Fake result screen per player, "What went wrong?" reveal button |
| Reveal | Truth revelation — true scores vs shown scores per player |

## Physical Setup

- Triangular installation: 3 Android tablets, separated by panels/curtains so players cannot see each other's screens.
- A laptop runs the Node.js server on a standalone Wi-Fi router (no internet needed).
- Optional DMX-controlled RGB lighting that changes color per game phase.
- Spectators observe from outside the installation.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Node.js, Express.js, Socket.IO |
| Frontend | Phaser 3.88.2 (ES modules, vanilla JS) |
| Font | Press Start 2P (pixel-art webfont) |
| Clients | Android tablets via Fully Kiosk Browser |
| Assets | Programmatically generated placeholder sprites (swappable for real pixel art) |
| Lighting | DMX512 via serial or remote UDP forwarder |
| Persistence | In-memory state + JSON file dumps per session |

## Quick Start

### Prerequisites

- Node.js 20+
- A modern browser (Chrome recommended)

### Run the Server

```bash
node server/index.js
```

The server starts at `http://localhost:3000`.

### Test Locally (3 browser tabs)

```
http://localhost:3000/?player=A
http://localhost:3000/?player=B
http://localhost:3000/?player=C
```

Each tab plays as a different ostrich. Open all three, verify the lobby fills up (auto-starts after 10 seconds), and play through 12 rounds.

### Preview Routes

Add `&preview=` to jump directly into any screen with mock data (no server connection required):

```
http://localhost:3000/?player=A&preview=lobby
http://localhost:3000/?player=A&preview=game
http://localhost:3000/?player=A&preview=reveal
http://localhost:3000/?player=A&preview=boot
```

| Route | Shows |
|-------|-------|
| `preview=lobby` | Lobby with 3/3 connected |
| `preview=game` | Game scene, animates an ostracism round |
| `preview=reveal` | End screen with score comparison |
| `preview=boot` | Normal boot sequence (connects to server) |

### Admin Dashboard

```
http://localhost:3000/admin
```

A real-time Socket.IO dashboard showing:

- Player connections and readiness
- Live round/phase with action submission status
- **True scores vs what each player is actually being shown** (side-by-side)
- Per-player illusion details (fabricated actions, delta)
- Round history table
- Reset button to force-end the current game

Enable `DEBUG_MODE: true` in `server/config.js` to disable the round timer — rounds only advance once all players have acted.

## Configuration

All tunable parameters live in `server/config.js`:

| Key | Default | Description |
|-----|---------|-------------|
| `TOTAL_ROUNDS` | 12 | Total rounds per game |
| `ROUND_DURATION_MS` | 10000 | Time per round (ms) |
| `ROUND_RESOLVE_ANIMATION_MS` | 3000 | Pause between rounds (ms) |
| `PHASE1_ROUNDS` | 6 | Trust rounds before manipulation |
| `STARTING_EGGS` | 0 | Eggs per player at game start |
| `AUTO_START_DELAY_SECONDS` | 10 | Delay before auto-starting when lobby is full |
| `AUTO_RESET_TIMEOUT_SECONDS` | 120 | Delay before returning to lobby after reveal |
| `RECONNECT_TIMEOUT_MS` | 60000 | Grace period before a disconnected player is dropped |
| `DEFAULT_TO_HIDE` | true | Inactive players hide rather than share |
| `SKIP_ON_ALL_READY` | true | End round immediately when all have acted |
| `DEBUG_MODE` | false | Disable round timer — wait for all actions |
| `DMX_ENABLED` | false | Enable DMX lighting control |

## Documentation

| Document | Purpose |
|----------|---------|
| [Project Description](docs/project_description.md) | Creative vision, concept, physical setup |
| [Technical Specifications](docs/technical_specifications.md) | Architecture, gameplay rules, event schema |
| [Implementation Plan](docs/implementation_plan.md) | Phased task checklist |
| [AGENTS.md](AGENTS.md) | Guidelines for coding agents working on this repo |

## License

This is an art installation project. No license defined.
