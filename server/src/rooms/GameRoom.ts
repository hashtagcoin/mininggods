import { Room, Client } from "colyseus";
import { Schema, MapSchema, type } from "@colyseus/schema";

// Core game state schemas
export class Player extends Schema {
  @type("string") id: string = "";
  @type("string") name: string = "";
  @type("number") x: number = 0;
  @type("number") y: number = 0;
  @type("number") z: number = 0;
  @type("number") credits: number = 1000;
  @type("number") bashCoin: number = 50;
}

export class Vehicle extends Schema {
  @type("string") id: string = "";
  @type("string") ownerId: string = "";
  @type("string") type: string = "miner"; // miner, transporter, scout, armoury
  @type("string") name: string = "";
  @type("number") x: number = 0;
  @type("number") y: number = 0;
  @type("number") z: number = 0;
  @type("number") fuel: number = 100;
  @type("number") maxFuel: number = 100;
  @type("number") cargo: number = 0;
  @type("number") maxCargo: number = 50;
  @type("string") status: string = "idle"; // idle, mining, moving, transporting
  @type("string") targetId: string = ""; // For assignments (ore node ID, base ID, etc.)
}

export class OreNode extends Schema {
  @type("string") id: string = "";
  @type("string") type: string = "iron"; // iron, copper, crypto_btc, crypto_eth
  @type("number") x: number = 0;
  @type("number") y: number = 0;
  @type("number") z: number = 0;
  @type("number") remaining: number = 1000;
  @type("number") maxOre: number = 1000;
  @type("number") quality: number = 1.0; // Multiplier for ore value
}

export class GameState extends Schema {
  @type({ map: Player }) players = new MapSchema<Player>();
  @type({ map: Vehicle }) vehicles = new MapSchema<Vehicle>();
  @type({ map: OreNode }) oreNodes = new MapSchema<OreNode>();
  @type("number") worldSeed: number = 12345;
  @type("number") tick: number = 0;
}

export class GameRoom extends Room<GameState> {
  maxClients = 10; // For now, small multiplayer rooms
  
  onCreate(options: any) {
    this.setState(new GameState());
    
    // Set world seed (could be from options or random)
    this.state.worldSeed = options.seed || Math.floor(Math.random() * 999999);
    
    console.log(`🌍 GameRoom created with seed: ${this.state.worldSeed}`);
    
    // Initialize some test ore nodes
    this.generateInitialOreNodes();
    
    // Game loop - 20 FPS server tick rate
    this.setSimulationInterval((deltaTime) => this.update(deltaTime), 1000 / 20);

    // Register message handlers
    this.onMessage("move_player", (client, message) => {
      this.handlePlayerMove(client.sessionId, message);
    });

    this.onMessage("move_vehicle", (client, message) => {
      this.handleVehicleMove(client.sessionId, message);
    });

    this.onMessage("assign_vehicle", (client, message) => {
      this.handleVehicleAssignment(client.sessionId, message);
    });

    this.onMessage("create_vehicle", (client, message) => {
      this.handleCreateVehicle(client.sessionId, message);
    });
  }

  onJoin(client: Client, options: any) {
    console.log(`👤 Player ${client.sessionId} joined`);
    
    // Create new player
    const player = new Player();
    player.id = client.sessionId;
    player.name = options.name || `Player_${client.sessionId.slice(0, 6)}`;
    
    // Spawn player at origin with slight randomization
    player.x = Math.random() * 10 - 5;
    player.y = 0;
    player.z = Math.random() * 10 - 5;
    
    this.state.players.set(client.sessionId, player);
    
    // Give player a starting vehicle
    this.createVehicle(client.sessionId, "miner", "Starter Rig");
  }

  onLeave(client: Client, consented: boolean) {
    console.log(`👋 Player ${client.sessionId} left`);
    
    // Clean up player and their vehicles
    this.state.players.delete(client.sessionId);
    
    // Remove player's vehicles
    this.state.vehicles.forEach((vehicle, vehicleId) => {
      if (vehicle.ownerId === client.sessionId) {
        this.state.vehicles.delete(vehicleId);
      }
    });
  }

  onDispose() {
    console.log("🗑️  GameRoom disposed");
  }

  // Game Logic Methods

  private update(deltaTime: number) {
    this.state.tick++;
    
    // Update vehicle logic every tick
    this.updateVehicles(deltaTime);
    
    // Sync state to clients happens automatically via Colyseus
  }

  private updateVehicles(deltaTime: number) {
    this.state.vehicles.forEach((vehicle) => {
      switch (vehicle.status) {
        case "mining":
          this.processVehicleMining(vehicle, deltaTime);
          break;
        case "moving":
          this.processVehicleMovement(vehicle, deltaTime);
          break;
        case "transporting":
          this.processVehicleTransport(vehicle, deltaTime);
          break;
      }
      
      // Consume fuel when active
      if (vehicle.status !== "idle" && vehicle.fuel > 0) {
        vehicle.fuel = Math.max(0, vehicle.fuel - (deltaTime / 1000) * 0.1);
      }
    });
  }

  private processVehicleMining(vehicle: Vehicle, deltaTime: number) {
    const oreNode = this.state.oreNodes.get(vehicle.targetId);
    if (!oreNode || oreNode.remaining <= 0) {
      vehicle.status = "idle";
      vehicle.targetId = "";
      return;
    }

    // Mine ore at 10 units per second
    const mineRate = 10 * (deltaTime / 1000);
    const minedAmount = Math.min(mineRate, oreNode.remaining, vehicle.maxCargo - vehicle.cargo);
    
    oreNode.remaining -= minedAmount;
    vehicle.cargo += minedAmount;
    
    // If cargo full or ore depleted, stop mining
    if (vehicle.cargo >= vehicle.maxCargo || oreNode.remaining <= 0) {
      vehicle.status = "idle";
      vehicle.targetId = "";
    }
  }

  private processVehicleMovement(vehicle: Vehicle, deltaTime: number) {
    // Simplified movement - just set to destination for now
    // In real implementation, this would interpolate over time
    vehicle.status = "idle";
  }

  private processVehicleTransport(vehicle: Vehicle, deltaTime: number) {
    // Simplified transport logic
    // Real implementation would move to base and deliver cargo
    vehicle.status = "idle";
  }

  private generateInitialOreNodes() {
    // Create some test ore nodes around the spawn area
    for (let i = 0; i < 5; i++) {
      const oreNode = new OreNode();
      oreNode.id = `ore_${i}`;
      oreNode.type = i < 3 ? "iron" : "copper";
      oreNode.x = (Math.random() - 0.5) * 100;
      oreNode.y = 0;
      oreNode.z = (Math.random() - 0.5) * 100;
      oreNode.remaining = 500 + Math.random() * 1000;
      oreNode.maxOre = oreNode.remaining;
      oreNode.quality = 0.8 + Math.random() * 0.4;
      
      this.state.oreNodes.set(oreNode.id, oreNode);
    }
    
    console.log(`⛏️  Generated ${this.state.oreNodes.size} ore nodes`);
  }

  private createVehicle(playerId: string, type: string, name: string): string {
    const vehicleId = `vehicle_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const vehicle = new Vehicle();
    
    vehicle.id = vehicleId;
    vehicle.ownerId = playerId;
    vehicle.type = type;
    vehicle.name = name;
    
    // Spawn near player
    const player = this.state.players.get(playerId);
    if (player) {
      vehicle.x = player.x + (Math.random() - 0.5) * 10;
      vehicle.y = 0;
      vehicle.z = player.z + (Math.random() - 0.5) * 10;
    }
    
    this.state.vehicles.set(vehicleId, vehicle);
    console.log(`🚛 Created vehicle ${name} (${type}) for player ${playerId}`);
    
    return vehicleId;
  }

  // Message Handlers

  private handlePlayerMove(playerId: string, data: any) {
    const player = this.state.players.get(playerId);
    if (player && data.x !== undefined && data.z !== undefined) {
      player.x = data.x;
      player.z = data.z;
      player.y = data.y || 0;
    }
  }

  private handleVehicleMove(playerId: string, data: any) {
    const vehicle = this.state.vehicles.get(data.vehicleId);
    if (vehicle && vehicle.ownerId === playerId) {
      vehicle.x = data.x;
      vehicle.z = data.z;
      vehicle.y = data.y || 0;
      vehicle.status = "moving";
    }
  }

  private handleVehicleAssignment(playerId: string, data: any) {
    const vehicle = this.state.vehicles.get(data.vehicleId);
    if (vehicle && vehicle.ownerId === playerId) {
      vehicle.targetId = data.targetId;
      vehicle.status = data.action || "mining";
    }
  }

  private handleCreateVehicle(playerId: string, data: any) {
    const player = this.state.players.get(playerId);
    if (player && player.credits >= 1000) { // Cost 1000 credits
      player.credits -= 1000;
      this.createVehicle(playerId, data.type || "miner", data.name || "New Vehicle");
    }
  }
}
