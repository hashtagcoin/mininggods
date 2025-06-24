import { create } from 'zustand';
import { useMemo } from 'react';
import type { GameState } from '../services/GameClient';
import { GameClient } from '../services/GameClient';

interface GameStore {
  // Connection state
  isConnected: boolean;
  isConnecting: boolean;
  connectionError: string | null;
  
  // Game state (mirrored from server)
  gameState: GameState | null;
  myPlayerId: string | null;
  
  // Game client instance
  gameClient: GameClient | null;
  
  // Vehicle selection state
  selectedVehicleId: string | null;
  
  // Optimistic updates
  optimisticVehiclePositions: Record<string, { x: number; z: number }>;
  
  // Actions
  initializeGame: () => void;
  connectToServer: (playerName?: string) => Promise<void>;
  disconnectFromServer: () => void;
  movePlayer: (x: number, y: number, z: number) => void;
  selectVehicle: (vehicleId: string | null) => void;
  moveVehicle: (vehicleId: string, x: number, y: number, z: number) => void;
  
  // State updaters
  setGameState: (state: GameState) => void;
  setConnectionStatus: (isConnected: boolean, isConnecting: boolean, error?: string) => void;
}

// Logging middleware
const logger = (config: any) => (set: any, get: any, api: any) => {
  let storeUpdateCount = 0;
  return config(
    (args: any) => {
      console.log(`[ZUSTAND-${++storeUpdateCount}] State update at ${new Date().toISOString()}`);
      console.log(`[ZUSTAND-${storeUpdateCount}] Updating:`, args);
      set(args);
      console.log(`[ZUSTAND-${storeUpdateCount}] New state:`, get());
    },
    get,
    api
  );
};

export const useGameStore = create<GameStore>(logger((set, get) => ({
  // Initial state
  isConnected: false,
  isConnecting: false,
  connectionError: null,
  gameState: null,
  myPlayerId: null,
  gameClient: null,
  selectedVehicleId: null,
  optimisticVehiclePositions: {},

  // Initialize the game client
  initializeGame: () => {
    console.log('[STORE] initializeGame called at', new Date().toISOString());
    const currentState = get();
    console.log('[STORE] Current store state before init:', {
      hasGameClient: !!currentState.gameClient,
      isConnected: currentState.isConnected,
      isConnecting: currentState.isConnecting
    });
    
    // Prevent re-initialization
    if (currentState.gameClient) {
      console.log('[STORE] Game client already initialized, skipping');
      return;
    }
    
    let updateCount = 0;
    const client = new GameClient((state: GameState) => {
      // Update store when server state changes
      console.log(`[STORE-UPDATE-${++updateCount}] Received state update from server at`, new Date().toISOString());
      console.log(`[STORE-UPDATE-${updateCount}] State size:`, {
        players: state.players ? Object.keys(state.players).length : 0,
        vehicles: state.vehicles ? Object.keys(state.vehicles).length : 0,
        oreNodes: state.oreNodes ? Object.keys(state.oreNodes).length : 0
      });
      get().setGameState(state);
    });
    
    console.log('[STORE] Setting gameClient in store');
    set({ gameClient: client });
    console.log('[STORE] Game client initialized successfully');
  },

  // Connect to the server
  connectToServer: async (playerName = "Player") => {
    console.log('[STORE] connectToServer called at', new Date().toISOString());
    const { gameClient } = get();
    if (!gameClient) {
      console.error("[STORE] Game client not initialized");
      return;
    }

    console.log('[STORE] Setting isConnecting=true');
    set({ 
      isConnecting: true, 
      connectionError: null 
    });

    try {
      console.log('[STORE] Calling gameClient.joinGame');
      await gameClient.joinGame(playerName);
      
      const playerId = gameClient.getMyPlayerId();
      console.log('[STORE] Connected successfully, playerId:', playerId);
      
      console.log('[STORE] Setting connection state');
      set({ 
        isConnected: true,
        isConnecting: false,
        myPlayerId: playerId,
        connectionError: null
      });
      
      console.log("🎮 Successfully connected to Mining Gods server!");
      
    } catch (error) {
      console.error('[STORE] Connection failed:', error);
      const errorMessage = error instanceof Error ? error.message : "Unknown connection error";
      
      set({ 
        isConnected: false,
        isConnecting: false,
        connectionError: errorMessage
      });
      
      console.error("❌ Failed to connect to server:", error);
    }
  },

  // Disconnect from server
  disconnectFromServer: () => {
    const { gameClient } = get();
    
    if (gameClient) {
      gameClient.leaveGame();
    }
    
    set({ 
      isConnected: false,
      isConnecting: false,
      gameState: null,
      myPlayerId: null,
      connectionError: null,
      selectedVehicleId: null,
      optimisticVehiclePositions: {}
    });
  },

  // Send player movement
  movePlayer: (x: number, y: number, z: number) => {
    const { gameClient, myPlayerId, gameState } = get();
    
    if (gameClient && myPlayerId && gameState?.players?.[myPlayerId]) {
      // Add optimistic update
      const currentState = get();
      set({
        optimisticVehiclePositions: { ...currentState.optimisticVehiclePositions, [myPlayerId]: { x, z } }
      });
      
      // Send to server
      gameClient.movePlayer(x, y, z);
    }
  },

  // Select a vehicle
  selectVehicle: (vehicleId: string | null) => {
    const { gameState } = get();
    if (vehicleId && (!gameState?.vehicles?.[vehicleId])) return;
    
    set({ selectedVehicleId: vehicleId });
  },

  // Move a vehicle
  moveVehicle: (vehicleId: string, x: number, y: number, z: number) => {
    console.log(`[STORE] moveVehicle called:`, { vehicleId, x, y, z });
    const { gameState, gameClient } = get();
    
    if (!gameClient) {
      console.error('[STORE] No game client available');
      return;
    }
    
    // Check if vehicles exist and try to find the vehicle
    let vehicleFound = false;
    if (gameState?.vehicles) {
      // Try direct access first
      if (gameState.vehicles[vehicleId]) {
        vehicleFound = true;
      } else if (gameState.vehicles.get && gameState.vehicles.get(vehicleId)) {
        // Try MapSchema get method
        vehicleFound = true;
      } else {
        // Try iterating
        gameState.vehicles.forEach((vehicle: any, id: string) => {
          if (id === vehicleId) vehicleFound = true;
        });
      }
    }
    
    if (!vehicleFound) {
      console.error(`[STORE] Vehicle ${vehicleId} not found in state`);
      console.log('[STORE] Available vehicles:', gameState?.vehicles);
      return;
    }
    
    console.log(`[STORE] Adding optimistic update for vehicle ${vehicleId}`);
    // Add optimistic update
    const currentState = get();
    set({
      optimisticVehiclePositions: { ...currentState.optimisticVehiclePositions, [vehicleId]: { x, z } }
    });
    
    console.log(`[STORE] Sending move command to server`);
    // Send to server with debouncing
    gameClient.moveVehicle(vehicleId, x, y, z);
  },

  // Update game state from server with throttling
  setGameState: (() => {
    let lastUpdate = 0;
    let updateCount = 0;
    const MIN_UPDATE_INTERVAL = 16; // ~60fps max update rate
    
    return (state: GameState) => {
      const now = Date.now();
      const timeSinceLastUpdate = now - lastUpdate;
      
      console.log(`[SET-STATE-${++updateCount}] Called at ${new Date().toISOString()}, time since last: ${timeSinceLastUpdate}ms`);
      
      // Throttle updates to prevent infinite loops
      if (timeSinceLastUpdate < MIN_UPDATE_INTERVAL) {
        console.log(`[SET-STATE-${updateCount}] THROTTLED - only ${timeSinceLastUpdate}ms since last update`);
        return;
      }
      
      const currentState = get();
      
      // Simple check to prevent unnecessary updates
      if (currentState.gameState === state) {
        console.log(`[SET-STATE-${updateCount}] SKIPPED - State is same object reference`);
        return;
      }
      
      console.log(`[SET-STATE-${updateCount}] UPDATING STATE`);
      lastUpdate = now;
      
      // Log what's changing
      const beforeUpdate = {
        hasGameState: !!currentState.gameState,
        playerCount: currentState.gameState?.players ? Object.keys(currentState.gameState.players).length : 0,
        vehicleCount: currentState.gameState?.vehicles ? Object.keys(currentState.gameState.vehicles).length : 0
      };
      
      set({ gameState: state });
      
      console.log(`[SET-STATE-${updateCount}] State updated:`, {
        before: beforeUpdate,
        after: {
          hasGameState: !!state,
          playerCount: state?.players ? Object.keys(state.players).length : 0,
          vehicleCount: state?.vehicles ? Object.keys(state.vehicles).length : 0
        }
      });
      
      // Log first vehicle details if any
      if (state?.vehicles && Object.keys(state.vehicles).length > 0) {
        const firstVehicleId = Object.keys(state.vehicles)[0];
        const firstVehicle = state.vehicles[firstVehicleId];
        console.log(`[SET-STATE-${updateCount}] First vehicle:`, {
          id: firstVehicle.id,
          name: firstVehicle.name,
          x: firstVehicle.x,
          y: firstVehicle.y,
          z: firstVehicle.z,
          type: firstVehicle.type
        });
      }
    };
  })(),

  // Update connection status
  setConnectionStatus: (isConnected: boolean, isConnecting: boolean, error?: string) => {
    set({ 
      isConnected,
      isConnecting,
      connectionError: error || null
    });
  }
})));

// Selectors with stable references
export const useGameState = () => useGameStore(state => state.gameState);
export const useGameConnection = () => useGameStore(state => state.isConnected);
export const useMyPlayerId = () => useGameStore(state => state.myPlayerId);
export const useSelectedVehicleId = () => useGameStore(state => state.selectedVehicleId);

// Use shallow equality for action selectors to prevent re-renders
import { shallow } from 'zustand/shallow';

// Stable selectors that only return functions
export const useVehicleActions = () => {
  const moveVehicle = useGameStore(state => state.moveVehicle);
  const selectVehicle = useGameStore(state => state.selectVehicle);
  return useMemo(() => ({ moveVehicle, selectVehicle }), [moveVehicle, selectVehicle]);
};

export const usePlayerActions = () => {
  const movePlayer = useGameStore(state => state.movePlayer);
  return useMemo(() => ({ movePlayer }), [movePlayer]);
};
