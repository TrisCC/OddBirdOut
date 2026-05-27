# Odd Bird Out

**Odd Bird Out** is a three-player interactive game installation about cyber ostracism — the experience of being excluded in a digital social environment.

Three players compete as ostriches collecting seeds to hatch a Golden Egg. But after a few rounds, the system starts lying to each player, showing them a fabricated version of the game where the other two players are cooperating against them. Every player privately believes they are the "odd bird out" — until the reveal.

## How It Works

1. **Phase 1 — Trust (Rounds 1–4):** The game plays normally. Players see real actions and build trust in the system.
2. **Phase 2 — Ostracism (Rounds 5–12):** The server silently fabricates what each player sees. Player A sees B and C cooperating and ignoring them. Player B sees A and C cooperating and ignoring them. Player C sees A and B cooperating and ignoring them. The exclusion escalates gradually.
3. **Reveal:** After round 12, the truth comes out — nobody was actually excluded. The system manipulated everyone equally.

Each round: choose **Share** (give a seed to another player), **Peck** (steal a seed), or **Head in Sand** (block all incoming actions). The player with the most seeds wins the Golden Egg.

## Physical Setup

- Triangular installation: 3 Android tablets, separated by panels/curtains so players cannot see each other's screens.
- A laptop runs the Node.js server on a standalone Wi-Fi router (no internet needed).
- Spectators observe from outside the installation.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Node.js, Express.js, Socket.IO |
| Frontend | Phaser 3 (JavaScript / HTML5 Canvas) |
| Styling | Pixel art (placeholder: programmatic sprites) |
| Clients | Android tablets via Fully Kiosk Browser |
| Assets | Programmatically generated placeholder sprites (swappable for real pixel art later) |

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

## Project Status

**Phase 0 (Housekeeping)**: Done
- [x] Phaser scaffold with correct config
- [x] Boilerplate assets cleaned

**Phase 1 (Backend)**: Not started

**Phase 2 (Frontend)**: Not started

See [implementation plan](docs/implementation_plan.md).

## Documentation

| Document | Purpose |
|----------|---------|
| [Project Description](docs/project_description.md) | Creative vision, concept, physical setup |
| [Technical Specifications](docs/technical_specifications.md) | Architecture, gameplay rules, event schema, data models |
| [Implementation Plan](docs/implementation_plan.md) | Phased task checklist with file-level breakdown |
| [AGENTS.md](AGENTS.md) | Guidelines for coding agents working on this repo |

## Configuration

All tunable parameters live in `server/config.js`:

- `TOTAL_ROUNDS` — 12 rounds
- `ROUND_DURATION_MS` — 20,000 ms per round
- `PHASE1_ROUNDS` — 4 trust rounds before manipulation begins
- `RECONNECT_TIMEOUT_MS` — 60,000 ms before disconnected player is dropped

## License

This is an art installation project. No license defined.
