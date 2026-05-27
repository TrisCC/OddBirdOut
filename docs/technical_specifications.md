# Odd Bird Out Technical Specifications

### **Network Topology**

- **Router:** Standalone Wi-Fi router. No internet connection required.
- **Laptop (Server):** Connected to the router via Ethernet (recommended for lowest latency) or 5GHz Wi-Fi. Assigned a Static IP (e.g., `192.168.1.100`).
- **Tablets (Clients):** Connected to the router's Wi-Fi. Access the game via the server's IP (e.g., `[http://192.168.1.100:3000/?player=A](http://192.168.1.100:3000/?player=A)`). Run a dedicated kiosk browser (like Fully Kiosk Browser) to lock users into the webpage and prevent gestures.

### **Backend Architecture (Node.js \+ Socket.IO)**

Keep the server lightweight and event-driven.

- **Core Stack:** Express.js (to serve the static frontend files) \+ Socket.IO (for real-time, bidirectional communication).
- **Room/Client Management:**
  - Hardcode or pass URL parameters to map specific WebSocket IDs to Player A, Player B, and Player C.
  - Server maintains an internal memory state. No database required since sessions are ephemeral.
- **The State Machine:**
  - **Global State:** Tracks the actual round number and the current phase (Phase 1: Trust, Phase 2: Ostracism).
  - **True State:** The actual mathematical outcome of the players' inputs.
  - **Illusion States (A, B, C):** Three independent state objects. During Phase 2, the server dynamically generates localized JSON payloads for each player, ensuring `socket.emitTo(player_A_id)` sends data showing B and C cooperating.
- **Game database**: Final true states after the game ends will be saved to a local file to use for data analysis later. Each game will be saved as a separate JSON file.

### **Frontend Architecture (Pixel Art Web Game)**

**Recommended Engine: Phaser 3 (JavaScript/HTML5 Canvas)**

Phaser is the optimal choice for a 2D, browser-based pixel art game.

- **Pixel-Perfect Rendering:** Phaser has a built-in `pixelArt: true` configuration flag. This disables WebGL anti-aliasing, ensuring your scaled-up pixel art remains perfectly crisp rather than blurry.
- **Sprite Animations:** It natively handles sprite sheets. You can easily trigger animations (Ostrich idle, Pecking/Stealing, Head-in-sand/Defend, Sharing a seed) based on WebSocket events.
- **Audio Management:** Easily handles the chiptune or retro sound effects that pair well with pixel art.
- **Architecture:**
  - **Boot Scene:** Preloads pixel art assets (sprite sheets, UI panels, retro fonts like "Press Start 2P").
  - **Lobby Scene:** Waits for the server to confirm all 3 players are connected.
  - **Game Scene:** Handles the UI inputs (3 buttons), sends actions via `socket.emit()`, and plays animations based on `socket.on('roundResult')` payloads.

### **Data Flow Execution**

1. **Input:** Tablet A taps "Share". Emits `{ action: 'share', target: 'B' }`.
2. **Intercept:** Server receives inputs from A, B, and C.
3. **Process (Phase 2):** Server ignores actual inputs. It runs the "Ostracism Algorithm" to build three separate reality payloads.
4. **Output:**
   - Server to Tablet A: `{ p1_anim: 'share', p2_anim: 'share_with_p3', p3_anim: 'share_with_p2', score_change: 0 }`
   - Server to Tablet B: `{ p1_anim: 'share_with_p3', p2_anim: 'share', p3_anim: 'share_with_p1', score_change: 0 }`

Do you want to outline the specific JSON payload structures for the WebSocket events next, or map out the specific pixel-art asset list you will need for the UI and animations?
