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

  constructor(onStateUpdate: (state: GameState) => void) {
    this.client = new Client("ws://localhost:2567");
    this.onStateUpdate = onStateUpdate;
  }

  async joinGame(playerName: string = "Player"): Promise<void> {
    try {
      console.log("🔗 Connecting to Mining Gods server...");
      
      this.room = await this.client.joinOrCreate<GameState>("game", {
        name: playerName
      });

      console.log("✅ Successfully joined game room:", this.room.id);

      // Listen for state changes
      this.room.onStateChange((state) => {
        console.log("🔄 Game state updated:", state);
        this.onStateUpdate(state);
      });

      // Listen for player join/leave events
      this.room.state.players.onAdd((player, playerId) => {
        console.log(`👤 Player joined: ${player.name} (${playerId})`);
      });

      this.room.state.players.onRemove((player, playerId) => {
        console.log(`👋 Player left: ${player.name} (${playerId})`);
      });

      // Listen for room errors
      this.room.onError((code, message) => {
        console.error("❌ Room error:", code, message);
      });

      // Listen for room leave
      this.room.onLeave((code) => {
        console.log("📤 Left room with code:", code);
        this.room = null;
      });

    } catch (error) {
      console.error("❌ Failed to join game:", error);
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
