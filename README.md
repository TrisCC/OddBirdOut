# Odd Bird Out

**Odd Bird Out** is a three-player interactive game installation about cyber ostracism — the experience of being excluded in a digital social environment.

Three players compete as ostriches collecting seeds to hatch a Golden Egg. But after a few rounds, the system starts lying to each player, showing them a fabricated version of the game where the other two players are cooperating against them. Every player privately believes they are the "odd bird out" — until the reveal.

## How It Works

1. **Phase 1 — Trust (Rounds 1–4):** The game plays normally. Players see real actions and build trust in the system.
2. **Phase 2 — Concealed Manipulation (Rounds 5–12):** The server silently fabricates what each player sees — but there are **no visible indicators of ostracism** during gameplay. No "Ostracism" label, no broken hearts, no sad ostrich expressions. The manipulation is entirely hidden from players.
3. **Reveal:** After round 12, the truth comes out — nobody was actually excluded. The system manipulated everyone equally.

Each round: choose **Share** (if both targeted players share with each other, both gain +2 seeds), **Peck** (steal 3 seeds from an undefended player), or **Head in Sand** (block all incoming actions). Each player starts with **10 seeds**. The player with the most seeds wins the Golden Egg.

## Physical Setup

- Triangular installation: 3 Android tablets, separated by panels/curtains so players cannot see each other's screens.
- A laptop runs the Node.js server on a standalone Wi-Fi router (no internet needed).
- Spectators observe from outside the installation.

## Tech Stack

| Layer    | Technology                                                                          |
| -------- | ----------------------------------------------------------------------------------- |
| Backend  | Node.js, Express.js, Socket.IO                                                      |
| Frontend | Phaser 3 (JavaScript / HTML5 Canvas)                                                |
| Styling  | Pixel art (placeholder: programmatic sprites)                                       |
| Clients  | Android tablets via Fully Kiosk Browser                                             |
| Assets   | Programmatically generated placeholder sprites (swappable for real pixel art later) |

## Quick Start

### Prerequisites

- Node.js 20+
- A modern browser (Chrome recommended)

### Run the Server

```bash
npm install --prefix server
node server/index.js
```

The server starts at `http://localhost:3000`.

### Test Locally (3 browser tabs)

```
http://localhost:3000/?player=A
http://localhost:3000/?player=B
http://localhost:3000/?player=C
```

Each tab plays as a different ostrich. Open all three, verify the lobby fills up, and play through 12 rounds.

### Preview Routes

Add `&preview=` to jump directly into any screen with mock data:

```
http://localhost:3000/?player=A&preview=lobby
http://localhost:3000/?player=A&preview=game
http://localhost:3000/?player=A&preview=reveal
```

Change `player` to `B` or `C` to see each screen from that player's perspective.

| Route | Shows |
|-------|-------|
| `preview=lobby` | Lobby with 3/3 connected |
| `preview=game` | Game scene at round 5, then animates an ostracism round |
| `preview=reveal` | End screen with triangle scoreboard and mock winner |
| `preview=boot` | Normal boot sequence (connects to server) |

No server connection is required for preview modes — textures are generated client-side and events are mocked.

### Admin Dashboard

To begin in debug mode (no round timer)
server/config.js > debugMode: true

```
http://localhost:3000/admin
```

A real-time Socket.IO dashboard showing:

- Player connections and readiness
- Live round/phase with action submission status
- **True scores vs what each player is actually being shown** (side-by-side)
- Round history table
- Reset button to force-end the game

## Project Status

**Phase 0 (Housekeeping)**: Done

**Phase 1 (Backend)**: Done — Express + Socket.IO server, GameRoom, GameState, RoundResolver, OstracismEngine, session persistence

**Phase 2 (Frontend)**: Done — Boot, Lobby, Game, Reveal scenes; action selection, animations, scoring display, ostracism concealment

**Enhancements**:

- [x] Starting seeds set to 5 (configurable)
- [x] Ostracism elements hidden during gameplay (no hearts, phase labels, or sad expressions)
- [x] Admin dashboard with real-time true/illusion score comparison

See [implementation plan](docs/implementation_plan.md).

## Documentation

| Document                                                     | Purpose                                                 |
| ------------------------------------------------------------ | ------------------------------------------------------- |
| [Project Description](docs/project_description.md)           | Creative vision, concept, physical setup                |
| [Technical Specifications](docs/technical_specifications.md) | Architecture, gameplay rules, event schema, data models |
| [Implementation Plan](docs/implementation_plan.md)           | Phased task checklist with file-level breakdown         |
| [AGENTS.md](AGENTS.md)                                       | Guidelines for coding agents working on this repo       |

## Configuration

All tunable parameters live in `server/config.js`:

- `TOTAL_ROUNDS` — 12 rounds
- `ROUND_DURATION_MS` — 10,000 ms per round
- `ROUND_RESOLVE_ANIMATION_MS` — 3,000 ms pause between rounds
- `PHASE1_ROUNDS` — 4 trust rounds before manipulation begins
- `STARTING_SEEDS` — 10 seeds per player at game start
- `RECONNECT_TIMEOUT_MS` — 60,000 ms before disconnected player is dropped

## License

This is an art installation project. No license defined.
