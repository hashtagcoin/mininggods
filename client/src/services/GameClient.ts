import { Client, Room } from "colyseus.js";

export interface GameState {
  players: Record<string, Player>;
  vehicles: Record<string, Vehicle>;
  oreNodes: Record<string, OreNode>;
  worldSeed: number;
  tick: number;
}

export interface Player {
  id: string;
  name: string;
  x: number;
  y: number;
  credits: number;
}

export interface Vehicle {
  id: string;
  name: string;
  x: number;
  y: number;
  z: number;
  rotation?: number;
  type: string;
  status: string;
  ownerId?: string;
  isAI?: boolean;
  targetRotation?: number;
}

export interface OreNode {
  id: string;
  x: number;
  y: number;
  z: number;
  amount: number;
  type: string;
}

export class GameClient {
  private client: Client;
  private room: Room<GameState> | null = null;
  private onStateUpdate: (state: GameState) => void;
  private previousPlayerCount = 0;

  constructor(onStateUpdate: (state: GameState) => void) {
    this.client = new Client("ws://localhost:2567");
    this.onStateUpdate = onStateUpdate;
  }

  async joinGame(playerName: string = "Player"): Promise<void> {
    try {
      console.log("Connecting to Mining Gods server...");
      
      this.room = await this.client.joinOrCreate<GameState>("game", {
        name: playerName
      });

      console.log(`Connected to game room: ${this.room.roomId}`);

      this.room.onStateChange((state) => {
        console.log("Game state updated:", state);
        console.log("Vehicles in state:", state.vehicles ? Object.keys(state.vehicles).length : 0);
        
        if (state.vehicles) {
          console.log("Vehicles MapSchema:", state.vehicles);
          console.log("Vehicles type:", typeof state.vehicles);
          console.log("Is MapSchema?", state.vehicles.constructor.name);
          
          // Try different ways to access vehicles
          const vehicleKeys = [];
          state.vehicles.forEach((vehicle, key) => {
            vehicleKeys.push(key);
            console.log("Vehicle via forEach:", key, vehicle);
          });
          console.log("Vehicle keys from forEach:", vehicleKeys);
          
          // Also try direct access
          const firstVehicleId = Object.keys(state.vehicles)[0];
          if (firstVehicleId) {
            const firstVehicle = state.vehicles[firstVehicleId];
            console.log("First vehicle via direct access:", firstVehicle);
          }
        }
        
        const currentPlayerCount = Object.keys(state.players).length;
        if (currentPlayerCount > this.previousPlayerCount) {
          console.log("Player joined the game");
        } else if (currentPlayerCount < this.previousPlayerCount) {
          console.log("Player left the game");
        }
        this.previousPlayerCount = currentPlayerCount;
        
        this.onStateUpdate(state);
      });

      this.room.onError((code, message) => {
        console.error("Room error:", code, message);
      });

      this.room.onLeave((code) => {
        console.log("Left room with code:", code);
        this.room = null;
      });

    } catch (error) {
      console.error("Failed to join game:", error);
      throw error;
    }
  }

  movePlayer(x: number, y: number, z: number = 0): void {
    if (this.room) {
      this.room.send("move_player", { x, y, z });
    }
  }

  moveVehicle(vehicleId: string, x: number, y: number, z: number = 0): void {
    if (this.room) {
      this.room.send("move_vehicle", { vehicleId, x, y, z });
    }
  }

  assignVehicle(vehicleId: string, targetId: string, action: string = "mining"): void {
    if (this.room) {
      this.room.send("assign_vehicle", { vehicleId, targetId, action });
    }
  }

  leaveGame(): void {
    if (this.room) {
      this.room.leave();
      this.room = null;
    }
  }

  isConnected(): boolean {
    return this.room !== null;
  }

  getMyPlayerId(): string | null {
    return this.room?.sessionId || null;
  }
}
