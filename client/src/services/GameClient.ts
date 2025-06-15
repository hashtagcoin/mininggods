import { Client, Room } from "colyseus.js";

export interface GameState {
  players: Map<string, Player>;
  tick: number;
}

export interface Player {
  id: string;
  name: string;
  x: number;
  y: number;
  credits: number;
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

      console.log("Successfully joined game room:", this.room.id);

      this.room.onStateChange((state) => {
        console.log("Game state updated:", state);
        
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
