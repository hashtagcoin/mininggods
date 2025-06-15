Of course. Here is the complete and final Product Requirements Document, consolidating all discussed features, decisions, and architectural strategies. This document is designed to be the single source of truth, detailed enough to serve as the foundation for creating your technical architecture documents, project backlog, and development tasks.

---

### **Mining Gods – Final Product Requirements Document (PRD)**
**Version:** 1.1 (Final for MVP)
**Date:** 11 June 2025
**Status:** Approved for Development

**Document Purpose:** This document provides the complete vision, features, and technical requirements for the "Mining Gods" project. It is the single source of truth for all subsequent design, architecture, and development tasks.

**Change Log:**
*   *v1.0:* Final consolidation of all features including fleet management, crypto economy, and generative world design.
*   *v1.1:* Added the requirement for a "Persistence Adapter" in the technical architecture to ensure a seamless future transition from LocalStorage to a production database like Supabase.

---

### **1. Game Summary & Vision**

Mining Gods is an isometric, fleet-management strategy game set in a vast, procedurally generated world. Players command an expanding fleet of autonomous vehicles to build a mining empire. The core experience blends logistical optimization, deep modular customization, and a high-stakes economy with a real-world Web3 integration.

The initial product is a **rich single-player experience** where the player competes against sophisticated AI fleets. The entire architecture is **designed from the ground up as multiplayer-ready**, utilizing a simulated client-server model to ensure a seamless future transition to a persistent, shared-world online game where players compete and cooperate in different risk zones.

### **2. Core Gameplay Pillars**

*   **Command an Autonomous Fleet:** Progress from a single rig to a massive, automated operation. Deploy specialized vehicles (Miners, Transporters, etc.) and design efficient supply chains to maximize your mining empire's output.
*   **Navigate a High-Stakes Economy:** Manage a critical fuel supply that creates constant economic pressure. Make strategic decisions on converting standard ore to in-game currency for upgrades or withdrawing rare "Crypto Ore" to a personal crypto wallet.
*   **Deep Modular Customization:** Every vehicle is a collection of swappable parts. Use a visual "Garage" interface to balance speed, fuel efficiency, cargo capacity, and other stats to optimize your fleet for any task.
*   **Explore a Living World:** The near-infinite, procedurally generated map is filled with opportunity. Discover rich ore deposits, scavenge for powerful abandoned parts, and navigate different risk zones for greater rewards.

### **3. Target Audience & Platforms**

*   **Players:** 16-40 yrs, fans of simulation (Factorio), tycoon (Transport Tycoon), light RTS, MMO-lite (Albion Online), and crypto/Web3-enabled games.
*   **MVP Platform:** Desktop Web (Chrome, Firefox, Edge, Safari) - Built with React.js
*   **Mobile Platform:** iOS & Android - React Native with Expo 53 (converted from React.js codebase for maximum code reuse)
*   **Future Platforms:** Progressive Web App (PWA) support for mobile browsers

### **4. Detailed Feature Breakdown**

#### **4.1. World & Generation**
*   **Procedural Generation:** The world is generated using a layered **Perlin Noise** strategy for near-infinite scale and variety.
    *   **Layer 1 (Heightmap):** Determines large-scale terrain (mountains, plains, valleys).
    *   **Layer 2 (Biome/Mineral Maps):** Determines biome types (e.g., rocky, icy) and the location of ore deposits (Iron, Copper, Crypto Nodes).
    *   **Layer 3 (Clutter Map):** Determines placement of non-interactive rocks and debris for visual richness.
*   **Chunk-Based Loading:** The world is loaded and rendered in "chunks" around the player's active camera view to ensure high performance and low memory usage.
*   **Zone System (For future multiplayer):** The map is logically divided into zones:
    *   **Zone 1 (Safe):** For new players. No PvP combat. Contains basic ores.
    *   **Zone 2 (Contested):** Higher-value ores. PvP combat is enabled.
    *   **Zone 3 (High-Risk):** Ultra-rare Crypto Nodes and legendary parts. Ruthless PvP and environmental hazards.

#### **4.2. Fleet Management & Vehicles**
*   **Fleet Control:** Players manage a fleet of vehicles up to their current **Hangar Capacity**, which can be upgraded.
*   **Fleet UI:** A horizontally scrolling menu at the bottom of the screen displays all owned vehicles. Each vehicle is a card showing its custom name and skin/icon. Tapping a card selects that vehicle and opens its detailed configuration panel.
*   **Vehicle Classes:**
    *   **Miner (MVP):** Extracts ore from nodes. The backbone of the operation.
    *   **Transporter (MVP):** Automates ore transport from Miners to the base.
    *   **Scout (Post-MVP):** A very fast exploration unit with an advanced, long-range scanner.
    *   **Armoury (Post-MVP):** A dedicated defensive/offensive combat unit.

#### **4.3. Core Gameplay Loops**
*   **Automation:** The primary loop involves assigning Transporters to Miners to create automated income streams, freeing the player for strategic tasks.
*   **Fuel & Refueling:**
    *   All vehicles consume fuel when moving. Fuel is a critical resource purchased with **BASH Coin**.
    *   To refuel the fleet, the player summons an **autonomous AI "Tanker"** for a flat BASH Coin fee. The Tanker travels to and refuels all of the player's vehicles in the field.
*   **Scavenging:** Players can find abandoned, high-tier vehicle parts in the world. They can swap parts on the fly, dropping their old part, which then becomes a salvageable item for others (including AI).
*   **Progression:** The main progression path involves earning currency to:
    1.  Expand the fleet by purchasing new vehicles.
    2.  Upgrade the main **Hangar** at the base to increase maximum fleet capacity.
    3.  Upgrade individual vehicle components (engines, cargo bays, etc.) in the **Garage**.

#### **4.4. Economy & Monetization**
*   **Currencies:**
    *   **Credits (Soft Currency):** Earned from selling standard ore. Used for most vehicle upgrades.
    *   **BASH Coin (Premium Currency):** Earned by converting rare "Crypto Ore" or purchased directly with real money. Required for buying **Fuel** and premium items.
*   **Market Saturation:** The sell price of standard ore dynamically decreases in a zone as more of it is sold, encouraging resource diversification and exploration.
*   **Web3 Integration (Crypto Withdrawal):**
    *   Players can mine rare Crypto Nodes (e.g., BTC Ore, ETH Ore).
    *   At the base, they can choose to convert this ore to BASH Coin or withdraw it to a personal crypto wallet as real cryptocurrency.
    *   A **1% processing fee** is applied to all crypto withdrawals.

### **5. User Experience (UX) & Controls**
*   **View:** Isometric, top-down camera.
*   **Control Scheme:**
    *   **Direct Control:** WASD / On-screen joystick for manually controlling a single selected vehicle.
    *   **RTS Control:** Left-click/drag to select units; right-click to issue move, mine, or assign commands.
*   **The Garage:** A clean, visual, 2D interface showing a vehicle schematic with clickable component slots (`Power Plant`, `Fuel Tank`, `Cargo Bay`, `Scanner`) for easy, modular part-swapping.

### **6. Technical Architecture (Multiplayer-Ready)**

The MVP will be built on a **simulated client-server architecture**. For the single-player MVP, the "server" runs as a local process alongside the client. This ensures all game logic is properly separated for a future transition to a live, networked environment.

| Layer | Implementation | Tasklist Keywords for Development |
| :--- | :--- | :--- |
| **Server** | **Node.js** with **Colyseus** or **Nakama** | `Setup Colyseus Server`, `Define Room State Schema`, `Implement Player Auth Stub`, `Implement RPC Handlers` |
| **Client** | **React.js** with **Vite** | `Setup Vite Project`, `Component Library (ChakraUI/MUI)`, `UI State Hooks (Zustand)`, `API Service Layer` |
| **Rendering** | **React Three Fiber (R3F)** | `Setup R3F Scene`, `Implement Camera Controls`, `Define Lighting`, `Post-Processing Stack`, `InstancedMesh Manager for Vehicles & Clutter` |
| **Physics** | **Rapier (headless on Server)** | `Setup Server Physics World`, `Generate Terrain Mesh Collider from Noise`, `Create Vehicle RigidBody`, `Implement Raycasting for Terrain Following` |
| **State Sync** | **WebSockets (via Colyseus/Nakama)** | `Integrate Colyseus Client SDK`, `Implement State Listener`, `Define Client Input Schema`, `Send Inputs to Server on Tick` |
| **State Mgmt.** | **Zustand (Client)** | `Create UI Store for Menus`, `Create Server State Mirror Store` |
| **World Gen.** | **`noisejs` library (Server)** | `Perlin Seed Manager`, `Heightmap Generator`, `Biome Map Generator`, `On-the-fly Chunk Generation Logic` |
| **Persistence**| **Persistence Adapter Layer (Server)** | `Define IPersistenceAdapter Interface`, **`Create LocalStorageAdapter (MVP)`**, `Create SupabaseAdapter (Future)` |
| **Web3** | **`ethers.js` (Client)** | `Implement Wallet Connection UI (ConnectKit/RainbowKit)`, `Read Contract Data`, `Initiate Withdrawal Transaction` |

#### **6.1. Data Persistence Strategy**
To ensure a seamless transition from local development to a cloud-based production database, all server-side data persistence will be handled through an **abstracted adapter**.

1.  **Define Interface (`IPersistenceAdapter`):** Create a common interface with methods like `saveGameState(userId, state)` and `loadGameState(userId)`.
2.  **MVP Implementation (`LocalStorageAdapter`):** For the MVP, implement this interface to read/write the game state to a local file or browser LocalStorage.
3.  **Future Implementation (`SupabaseAdapter`):** For production, implement the same interface using the Supabase client library to interact with a PostgreSQL database.
4.  **Integration:** The server will be configured to use the appropriate adapter based on the environment. Switching from local saves to a cloud database will require changing only a single line of code in the server's configuration, not the core game logic.

### **7. Roadmap**

| Phase | Duration | Key Deliverables & Epic Tasks |
| :--- | :--- | :--- |
| **1. Pre-production**| 4 wks | • GDD & Final PRD.<br>• **Epic: Tech Spike:** Setup local client-server architecture; prove communication & state sync. Define the `IPersistenceAdapter` interface and implement the initial `LocalStorageAdapter`. |
| **2. MVP Alpha** | 18 wks | • **Epic: World Generation:** Implement Perlin noise chunk system for terrain and resources.<br>• **Epic: Core Gameplay:** Implement Miner & Transporter automation loop, fuel/tanker system, and scavenging.<br>• **Epic: Economy:** Implement Credits, BASH Coin, and market saturation systems.<br>• **Epic: UI/UX:** Build Fleet Menu, Garage, HUD, and all core interface components.<br>• **Epic: Persistence:** Integrate save/load calls throughout the server logic using the persistence adapter. |
| **3. Beta** | 8 wks | • **Epic: Web3 Integration:** Implement Crypto Ore mining and the full wallet withdrawal flow.<br>• **Epic: Content Expansion:** Add Scout vehicle class & Daily Contracts system.<br>• **Epic: Balancing:** Tune economy, AI difficulty, and upgrade costs based on playtesting. |
| **4. Launch (v1.0)**| 4 wks | • **Epic: Polish:** Add Armoury vehicle class, sound effects, visual polish, and tutorial.<br>• **Epic: Porting:** Create the initial React Native (Expo) build for performance testing on mobile devices. |
| **5. Post-Launch**| Ongoing | • **Epic: Multiplayer Transition:** Deploy the Node.js server to a cloud host. Implement the `SupabaseAdapter`. Add player authentication and matchmaking.<br>• **Epic: Live Ops:** Launch multiplayer alpha. Add clans, leaderboards, and live events. |

---
**End of Document**