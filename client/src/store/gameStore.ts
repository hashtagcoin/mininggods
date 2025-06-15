import { create } from "zustand";
import { GameClient, GameState, Player } from "../services/GameClient";

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
  
  // Actions
  initializeGame: () => void;
  connectToServer: (playerName?: string) => Promise<void>;
  disconnectFromServer: () => void;
  movePlayer: (x: number, y: number, z?: number) => void;
  
  // State updaters
  setGameState: (state: GameState) => void;
  setConnectionStatus: (isConnected: boolean, isConnecting: boolean, error?: string) => void;
}

export const useGameStore = create<GameStore>((set, get) => ({
  // Initial state
  isConnected: false,
  isConnecting: false,
  connectionError: null,
  gameState: null,
  myPlayerId: null,
  gameClient: null,

  // Initialize the game client
  initializeGame: () => {
    const client = new GameClient((state: GameState) => {
      // Update store when server state changes
      get().setGameState(state);
    });
    
    set({ gameClient: client });
  },

  // Connect to the server
  connectToServer: async (playerName = "Player") => {
    const { gameClient } = get();
    if (!gameClient) {
      console.error("Game client not initialized");
      return;
    }

    set({ 
      isConnecting: true, 
      connectionError: null 
    });

    try {
      await gameClient.joinGame(playerName);
      
      set({ 
        isConnected: true,
        isConnecting: false,
        myPlayerId: gameClient.getMyPlayerId(),
        connectionError: null
      });
      
      console.log("🎮 Successfully connected to Mining Gods server!");
      
    } catch (error) {
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
      connectionError: null
    });
  },

  // Send player movement to server
  movePlayer: (x: number, y: number, z = 0) => {
    const { gameClient, isConnected } = get();
    if (gameClient && isConnected) {
      gameClient.movePlayer(x, y, z);
    }
  },

  // Update game state from server
  setGameState: (state: GameState) => {
    set({ gameState: state });
  },

  // Update connection status
  setConnectionStatus: (isConnected: boolean, isConnecting: boolean, error?: string) => {
    set({ 
      isConnected,
      isConnecting,
      connectionError: error || null
    });
  }
}));
