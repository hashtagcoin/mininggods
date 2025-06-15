import "reflect-metadata";
import { Room, Client } from "@colyseus/core";
import { Schema, MapSchema, type } from "@colyseus/schema";
import { WorldGenerator, TerrainChunk, OreNodeData, WorldConfig } from "../world/WorldGenerator";

// Player schema
export class Player extends Schema {
  @type("string") id!: string;
  @type("string") name!: string;
  @type("number") x: number = 0;
  @type("number") y: number = 0;
  @type("number") z: number = 0;
  @type("number") credits: number = 1000;
}

// Ore Node schema for network sync
export class OreNode extends Schema {
  @type("string") id!: string;
  @type("string") type!: string;
  @type("number") x!: number;
  @type("number") y!: number;
  @type("number") z!: number;
  @type("number") remaining!: number;
  @type("number") maxOre!: number;
  @type("number") quality!: number;
}

// Chunk schema for network sync
export class Chunk extends Schema {
  @type("number") chunkX!: number;
  @type("number") chunkZ!: number;
  @type({ map: OreNode }) oreNodes = new MapSchema<OreNode>();
  @type("string") heightData!: string; // Compressed height map data
  @type("string") biomeData!: string; // Compressed biome data
}

// Game state schema
export class GameState extends Schema {
  @type({ map: Player }) players = new MapSchema<Player>();
  @type({ map: Chunk }) chunks = new MapSchema<Chunk>();
  @type("number") tick: number = 0;
  @type("number") worldSeed: number = Date.now();
}

export class SimpleGameRoom extends Room<GameState> {
  maxClients = 10;
  private worldGenerator!: WorldGenerator;
  private loadedChunks: Set<string> = new Set();
  private readonly CHUNK_LOAD_RADIUS = 2;
  private readonly TICK_RATE = 60; // 60 FPS

  onCreate(options: any) {
    console.log(" SimpleGameRoom created!", options);
    
    this.setState(new GameState());
    
    // Initialize world generator
    const worldConfig: WorldConfig = {
      seed: this.state.worldSeed,
      chunkSize: 32,
      heightScale: 10,
      oreSpawnRate: 0.02, // 2% chance per tile
      maxOreNodes: 10
    };
    
    this.worldGenerator = new WorldGenerator(worldConfig);
    
    // Set up game loop
    this.setSimulationInterval((deltaTime) => this.update(deltaTime), 1000 / this.TICK_RATE);
    
    // Register message handlers
    this.onMessage("move", (client, message) => this.handleMove(client, message));
    this.onMessage("requestChunk", (client, message) => this.handleChunkRequest(client, message));
    this.onMessage("mineOre", (client, message) => this.handleOreMining(client, message));
    
    console.log(` World initialized with seed: ${this.state.worldSeed}`);
  }

  onJoin(client: Client, options: any) {
    console.log(` ${client.sessionId} joined the game room`);
    
    const player = new Player();
    player.id = client.sessionId;
    player.name = options.playerName || `Player${Math.floor(Math.random() * 1000)}`;
    
    // Spawn player at world center
    player.x = 0;
    player.y = 0;
    player.z = 0;
    
    this.state.players.set(client.sessionId, player);
    
    // Load initial chunks around player spawn
    this.loadChunksAroundPlayer(client.sessionId);
    
    console.log(` Player ${player.name} spawned at (${player.x}, ${player.z})`);
  }

  onLeave(client: Client, consented: boolean) {
    console.log(` ${client.sessionId} left the game room`);
    this.state.players.delete(client.sessionId);
  }

  onDispose() {
    console.log(" SimpleGameRoom disposed");
  }

  private update(deltaTime: number) {
    this.state.tick++;
    
    // Update game logic here (mining progress, vehicle movement, etc.)
    // For now, just increment tick counter
  }

  /**
   * Load chunks around a player's position
   */
  private loadChunksAroundPlayer(playerId: string) {
    const player = this.state.players.get(playerId);
    if (!player) return;
    
    const chunkSize = this.worldGenerator.getConfig().chunkSize;
    const playerChunkX = Math.floor(player.x / chunkSize);
    const playerChunkZ = Math.floor(player.z / chunkSize);
    
    // Generate chunks in radius around player
    for (let x = playerChunkX - this.CHUNK_LOAD_RADIUS; x <= playerChunkX + this.CHUNK_LOAD_RADIUS; x++) {
      for (let z = playerChunkZ - this.CHUNK_LOAD_RADIUS; z <= playerChunkZ + this.CHUNK_LOAD_RADIUS; z++) {
        const chunkKey = `${x},${z}`;
        
        if (!this.loadedChunks.has(chunkKey)) {
          this.loadChunk(x, z);
        }
      }
    }
  }

  /**
   * Load a specific chunk and add it to game state
   */
  private loadChunk(chunkX: number, chunkZ: number) {
    const chunkKey = `${chunkX},${chunkZ}`;
    
    if (this.loadedChunks.has(chunkKey)) return;
    
    // Generate chunk data
    const terrainChunk = this.worldGenerator.generateChunk(chunkX, chunkZ);
    
    // Create network chunk
    const networkChunk = new Chunk();
    networkChunk.chunkX = chunkX;
    networkChunk.chunkZ = chunkZ;
    
    // Compress height and biome data for network transmission
    networkChunk.heightData = this.compressHeightMap(terrainChunk.heightMap);
    networkChunk.biomeData = this.compressBiomeMap(terrainChunk.biomeMap);
    
    // Add ore nodes
    terrainChunk.oreNodes.forEach(oreData => {
      const oreNode = new OreNode();
      oreNode.id = oreData.id;
      oreNode.type = oreData.type;
      oreNode.x = oreData.x;
      oreNode.y = oreData.y;
      oreNode.z = oreData.z;
      oreNode.remaining = oreData.remaining;
      oreNode.maxOre = oreData.maxOre;
      oreNode.quality = oreData.quality;
      
      networkChunk.oreNodes.set(oreData.id, oreNode);
    });
    
    // Add to game state
    this.state.chunks.set(chunkKey, networkChunk);
    this.loadedChunks.add(chunkKey);
    
    console.log(` Loaded chunk (${chunkX}, ${chunkZ}) with ${terrainChunk.oreNodes.length} ore nodes`);
  }

  /**
   * Send specific chunk data to a client
   */
  private sendChunkToClient(client: Client, chunkX: number, chunkZ: number) {
    const chunkKey = `${chunkX},${chunkZ}`;
    
    if (!this.loadedChunks.has(chunkKey)) {
      this.loadChunk(chunkX, chunkZ);
    }
    
    const chunk = this.state.chunks.get(chunkKey);
    if (chunk) {
      client.send("chunkData", {
        chunkX,
        chunkZ,
        heightData: chunk.heightData,
        biomeData: chunk.biomeData,
        oreNodes: Array.from(chunk.oreNodes.entries()).map(([id, node]) => ({
          id: node.id,
          type: node.type,
          x: node.x,
          y: node.y,
          z: node.z,
          remaining: node.remaining,
          maxOre: node.maxOre,
          quality: node.quality
        }))
      });
    }
  }

  /**
   * Handle player movement
   */
  private handleMove(client: Client, message: any) {
    const player = this.state.players.get(client.sessionId);
    if (!player) return;

    const { x, y, z } = message;
    
    // Update player position
    player.x = x;
    player.y = y;
    player.z = z;
    
    // Check if we need to load new chunks
    this.loadChunksAroundPlayer(client.sessionId);
    
    console.log(` ${player.name} moved to (${x}, ${y}, ${z})`);
  }

  /**
   * Handle chunk request
   */
  private handleChunkRequest(client: Client, message: any) {
    const { chunkX, chunkZ } = message;
    this.sendChunkToClient(client, chunkX, chunkZ);
  }

  /**
   * Handle ore mining requests
   */
  private handleOreMining(client: Client, message: any) {
    const { oreNodeId, miningPower } = message;
    const player = this.state.players.get(client.sessionId);
    if (!player) return;
    
    // Find the ore node across all chunks
    let targetOreNode: OreNode | null = null;
    let targetChunk: Chunk | null = null;
    
    for (const [chunkKey, chunk] of this.state.chunks.entries()) {
      const oreNode = chunk.oreNodes.get(oreNodeId);
      if (oreNode) {
        targetOreNode = oreNode;
        targetChunk = chunk;
        break;
      }
    }
    
    if (!targetOreNode || !targetChunk || targetOreNode.remaining <= 0) {
      client.send("miningResult", { success: false, reason: "Ore node not found or depleted" });
      return;
    }
    
    // Calculate mining yield
    const minedAmount = Math.min(miningPower || 10, targetOreNode.remaining);
    const creditValue = minedAmount * targetOreNode.quality * this.getOreValue(targetOreNode.type);
    
    // Update ore node
    targetOreNode.remaining -= minedAmount;
    
    // Update player credits
    player.credits += Math.floor(creditValue);
    
    // Remove ore node if depleted
    if (targetOreNode.remaining <= 0) {
      targetChunk.oreNodes.delete(oreNodeId);
    }
    
    client.send("miningResult", {
      success: true,
      minedAmount,
      creditValue: Math.floor(creditValue),
      remainingOre: targetOreNode.remaining,
      newCredits: player.credits
    });
    
    console.log(` ${player.name} mined ${minedAmount} ${targetOreNode.type} for $${Math.floor(creditValue)}`);
  }

  /**
   * Get base value per unit of ore type
   */
  private getOreValue(oreType: string): number {
    const values = {
      iron: 1,
      copper: 2,
      crypto_btc: 50,
      crypto_eth: 30
    };
    return values[oreType as keyof typeof values] || 1;
  }

  /**
   * Compress height map for network transmission
   */
  private compressHeightMap(heightMap: number[][]): string {
    // Simple compression - convert to flat array and JSON stringify
    const flatData = heightMap.flat();
    return JSON.stringify(flatData);
  }

  /**
   * Compress biome map for network transmission
   */
  private compressBiomeMap(biomeMap: string[][]): string {
    // Simple compression - convert to flat array and JSON stringify
    const flatData = biomeMap.flat();
    return JSON.stringify(flatData);
  }
}
