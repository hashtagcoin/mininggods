Of course. Here is a detailed Architecture Document based on the final PRD.

This document is designed to be a practical guide for your development team. It outlines the technical blueprint, explains *why* specific technologies were chosen, and defines clear boundaries between services. This modular approach is the key to supporting easy expansion for features like multiplayer, marketplaces, and more.

---

### **Mining Gods – Technical Architecture Document**
**Version:** 1.0
**Date:** 11 June 2025
**Author:** AI Assistant
**Status:** Proposed

### **1. Introduction & Guiding Principles**

This document outlines the technical architecture for **Mining Gods**. It is designed to meet the immediate needs of the single-player MVP while establishing a robust, scalable foundation for future expansion into a full multiplayer, multi-platform, Web3-enabled game.

**Guiding Architectural Principles:**
1.  **Server-Authoritative Logic:** All game logic, physics, and state changes are processed on the server. The client is a "dumb" renderer. This is non-negotiable for cheat prevention and seamless multiplayer transition.
2.  **Modularity over Monolith:** Services (Game Logic, Persistence, Chat, etc.) must be decoupled. This allows them to be developed, deployed, and scaled independently.
3.  **Interface-Driven Design:** Key systems (e.g., Persistence, Payments) will be accessed through defined interfaces (adapters). This allows us to swap out implementations without refactoring core code (e.g., LocalStorage -> Supabase).
4.  **Component-Based Frontend:** The UI and 3D scene will be built with a component-based framework (React/R3F) for maintainability and reusability across web and native mobile.

### **2. High-Level Architecture Diagram**

This diagram illustrates the two phases of the architecture: the **Single-Player MVP** (all running locally) and the **Future Multiplayer** model.

```mermaid
graph TD
    subgraph Single-Player MVP (Local Machine)
        A[User's Browser]
        A -- HTTPS --> B[React Client (Vite)]
        B -- WebSocket (localhost) --> C[Node.js Server (Colyseus)]
        C -- File I/O --> D[Local Storage (JSON file)]
        B -- ethers.js --> E[Blockchain Wallets (MetaMask)]

        subgraph B [React Client]
            B1[UI (React Components)]
            B2[3D Scene (React Three Fiber)]
            B3[State (Zustand)]
            B4[Network Client]
        end

        subgraph C [Node.js Server]
            C1[Game Room Logic]
            C2[Physics (Rapier Headless)]
            C3[Persistence Adapter]
        end
    end

    subgraph Future Multiplayer (Cloud Architecture)
        F[Multiple Users]
        F -- HTTPS --> G[CDN (Cloudflare)]
        G -- Serves --> H[React Client (Static Build)]
        H -- Secure WebSocket (WSS) --> I[Load Balancer]
        I --> J1[Node.js Server 1 (Colyseus)]
        I --> J2[Node.js Server 2 (Colyseus)]
        J1 & J2 -- TCP/IP --> K[Persistence Service (Supabase)]
        J1 & J2 -- TCP/IP --> L[Marketplace Service (Node.js)]
        H -- ethers.js --> E

        subgraph K [Supabase]
            K1[PostgreSQL DB]
            K2[Auth]
            K3[Storage]
        end
    end

    style D fill:#f9f,stroke:#333,stroke-width:2px
    style K fill:#9cf,stroke:#333,stroke-width:2px
```

### **3. Technology Stack**

| Layer | Technology | Rationale |
| :--- | :--- | :--- |
| **Client Framework** | **React.js 18+** with **Vite** (MVP) → **React Native with Expo 53** (Mobile) | React.js for fast web MVP development, then convert to React Native with Expo 53 for iOS/Android. Maximum code reuse between platforms. |
| **3D Rendering** | **React Three Fiber (R3F)** & **Drei** (Web) → **Expo GL** with **Three.js** (Mobile) | R3F is perfect for web. For mobile, Expo GL provides Three.js support with hardware acceleration. |
| **UI Components** | **Material UI (MUI)** | Comprehensive, accessible, and themeable component library. Works well with Industrial Sci-Fi theme. Better mobile responsiveness than Chakra UI. |
| **Client State** | **Zustand** | Minimalist, fast, and scalable state management. Works identically in both React.js and React Native. |
| **Server Framework**| **Node.js** with **TypeScript** | Universal JavaScript ecosystem. TypeScript provides essential type safety for a complex application. |
| **Game Server** | **Colyseus** | A battle-tested, state-of-the-art game server framework. Manages rooms, state synchronization, and client-server communication out of the box. |
| **Server Physics** | **Rapier (headless)** | High-performance Rust-based physics engine with excellent JavaScript bindings. Crucial for running authoritative physics on the server. |
| **Persistence (MVP)**| **Local File System (`fs` module)** | Simple, dependency-free method for the local server to save and load game state as a JSON file for the single-player MVP. |
| **Persistence (Prod)**| **Supabase** | An all-in-one backend-as-a-service. Provides PostgreSQL, Authentication, Storage, and Edge Functions, covering most of our future backend needs in a single, scalable platform. |
| **Web3 Integration** | **ethers.js** & **ConnectKit/RainbowKit** (Web) → **WalletConnect** (Mobile) | Ethers.js is the standard for blockchain interaction. ConnectKit for web wallets, WalletConnect for mobile wallet integration. |

### **4. Detailed Service Breakdown**

#### **4.1. The Client Application (React)**
*   **Purpose:** To render the game state provided by the server and capture user input. It is a "dumb" client.
*   **Directory Structure:**
    ```
    /src
    ├── /components     # Reusable UI/3D components (Button, FleetMenu, RigModel)
    ├── /services       # API/Service layers (colyseus.ts, wallet.ts)
    ├── /hooks          # Custom React hooks (usePlayerInput, useGameSate)
    ├── /store          # Zustand state stores (uiStore.ts, serverStateStore.ts)
    ├── /3d             # 3D scene setup, components, and assets
    └── main.tsx        # Application entry point
    ```
*   **Key Responsibilities:**
    *   Establish and maintain a WebSocket connection to the server.
    *   Listen for state updates from the server and update the Zustand `serverStateStore`.
    *   React components and R3F components will subscribe to this store to re-render when state changes.
    *   Capture user inputs (clicks, key presses) and send them to the server as defined RPC calls (e.g., `room.send("move", { unitId: 'abc', position: {x, y} })`).
    *   Handle all Web3 wallet interactions on the client side.

#### **4.2. The Game Server (Node.js/Colyseus)**
*   **Purpose:** To be the single source of truth. It runs the game simulation.
*   **Directory Structure:**
    ```
    /src
    ├── /rooms          # Colyseus room definitions (MiningRoom.ts)
    ├── /state          # State schemas (Player.ts, Vehicle.ts)
    ├── /services       # Business logic services (PhysicsService, AIService)
    └── /persistence    # The Persistence Adapter layer
        ├── IPersistenceAdapter.ts
        ├── LocalStorageAdapter.ts
        └── SupabaseAdapter.ts
    ```
*   **Key Responsibilities:**
    *   On room creation, instantiate the physics world and game state.
    *   Load player data using the configured **Persistence Adapter**.
    *   Process incoming client inputs, validate them against game rules (e.g., "does the player have enough fuel?"), and update the state.
    *   Run the main game loop (e.g., at 20Hz), which advances the physics simulation, updates AI state machines, and broadcasts the new state to all clients in the room.
    *   Periodically save the game state via the **Persistence Adapter**.

#### **4.3. The Persistence Service**
*   **Purpose:** To provide a single, consistent way to save and load data, regardless of the backend technology.
*   **MVP Implementation (`LocalStorageAdapter`):**
    *   The `saveGameState` method will serialize the state object to a JSON string and write it to a local file (e.g., `savegame.json`).
    *   The `loadGameState` method will read and parse this file.
*   **Production Implementation (`SupabaseAdapter`):**
    *   The `saveGameState` method will make an API call to a Supabase Edge Function or use the Supabase client to `upsert` data into the appropriate PostgreSQL tables (e.g., `users`, `vehicles`).
    *   The `loadGameState` method will query these tables.
    *   **This service handles the abstraction. The Game Server does not know or care if it's talking to a local file or a cloud database.**

### **5. Expansion & Modularity Strategy**

This architecture is designed for future growth. Here’s how new features will be added:

*   **Multiplayer:**
    1.  Deploy the Node.js Game Server to a cloud provider (e.g., Render, Heroku).
    2.  Deploy the Supabase backend.
    3.  In the Game Server, swap the `LocalStorageAdapter` for the `SupabaseAdapter`.
    4.  In the React Client, change the server connection URL from `localhost` to the public server URL.
    5.  Implement authentication using Supabase Auth.
    *   *Result: Minimal code changes to the core game logic.*

*   **Skins Marketplace:**
    1.  Create a new, independent **Marketplace Service** (e.g., a simple Node.js/Express app).
    2.  This service will have its own database table for listings and will handle the logic for buying/selling.
    3.  The React Client will make API calls to this new service.
    4.  Player inventory (which skins are owned) is still managed by the main Persistence Service (Supabase).
    *   *Result: The marketplace is a separate microservice, preventing bloat in the core Game Server.*

*   **New Worlds/Biomes:**
    1.  The **Perlin Noise generation** logic is already on the server.
    2.  To create a new world, we simply need to create a new "seed" and potentially new layering rules (e.g., "this seed uses a 'lava' biome map").
    3.  A new Colyseus room type (`LavaWorldRoom`) can be created that uses this new seed.
    *   *Result: World generation is data-driven, not hard-coded.*

This architecture separates concerns effectively, allowing your team to develop, test, and deploy features in parallel with confidence that changes in one area (like a marketplace) will not break another (like core game physics).