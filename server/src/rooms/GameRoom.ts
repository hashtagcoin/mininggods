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
  @type("number") rotation: number = 0; // Rotation in radians
  @type("number") fuel: number = 100;
  @type("number") maxFuel: number = 100;
  @type("number") cargo: number = 0;
  @type("number") maxCargo: number = 50;
  @type("string") status: string = "idle"; // idle, mining, moving, transporting, rotating
  @type("string") targetId: string = ""; // For assignments (ore node ID, base ID, etc.)
  @type("boolean") isAI: boolean = false; // Flag for AI-controlled vehicles
  @type("number") miningStartTime: number = 0; // Track when mining started
  @type("number") targetX: number = 0; // Movement target coordinates
  @type("number") targetZ: number = 0;
  @type("number") targetRotation: number = 0; // Target rotation for smooth turning
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
    
    // Create AI miners
    this.createAIMiners();
    
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
      // Update AI vehicles
      if (vehicle.isAI && vehicle.status === "idle") {
        this.updateAIVehicle(vehicle);
      }
      
      // Process vehicle states
      switch (vehicle.status) {
        case "mining":
          this.processVehicleMining(vehicle, deltaTime);
          break;
        case "moving":
          // Process movement for both AI and player vehicles
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
      vehicle.miningStartTime = 0;
      return;
    }

    // Check distance to ore node - must be within 5 units (touching distance)
    const distance = Math.sqrt(
      Math.pow(oreNode.x - vehicle.x, 2) + 
      Math.pow(oreNode.z - vehicle.z, 2)
    );
    
    if (distance > 5) {
      // Too far away, stop mining and move closer
      console.log(`⚠️ Vehicle ${vehicle.name} too far from ore (${distance.toFixed(1)} units), moving closer`);
      vehicle.status = "moving";
      vehicle.targetX = oreNode.x;
      vehicle.targetZ = oreNode.z;
      vehicle.miningStartTime = 0;
      return;
    }

    // Check if this is the start of mining
    if (vehicle.miningStartTime === 0) {
      vehicle.miningStartTime = Date.now();
      console.log(`⛏️ ${vehicle.isAI ? 'AI' : 'Player'} miner ${vehicle.name} started mining ore node ${oreNode.id}`);
    }

    // For AI vehicles, mine for exactly 2 seconds
    if (vehicle.isAI) {
      const miningDuration = Date.now() - vehicle.miningStartTime;
      if (miningDuration >= 2000) { // 2 seconds
        vehicle.status = "idle";
        vehicle.targetId = "";
        vehicle.miningStartTime = 0;
        console.log(`🤖 AI miner ${vehicle.name} finished mining (cargo: ${vehicle.cargo.toFixed(1)}/${vehicle.maxCargo})`);
        return;
      }
    }

    // Mine ore at 10 units per second
    const mineRate = 10 * (deltaTime / 1000);
    const minedAmount = Math.min(mineRate, oreNode.remaining, vehicle.maxCargo - vehicle.cargo);
    
    oreNode.remaining -= minedAmount;
    vehicle.cargo += minedAmount;
    
    // If ore is depleted, remove it from the game
    if (oreNode.remaining <= 0) {
      console.log(`⛏️ Ore node ${oreNode.id} depleted and removed from game`);
      this.state.oreNodes.delete(oreNode.id);
    }
    
    // For player vehicles, stop when cargo full or ore depleted
    if (!vehicle.isAI && (vehicle.cargo >= vehicle.maxCargo || oreNode.remaining <= 0)) {
      vehicle.status = "idle";
      vehicle.targetId = "";
      vehicle.miningStartTime = 0;
    }
  }

  private processVehicleMovement(vehicle: Vehicle, deltaTime: number) {
    // Movement parameters
    const rotationSpeed = 2.0; // Radians per second
    const speed = vehicle.isAI ? 5 : 8; // Units per second - player vehicles move faster
    const moveDistance = speed * (deltaTime / 1000);
    
    // Calculate direction to target
    const dx = vehicle.targetX - vehicle.x;
    const dz = vehicle.targetZ - vehicle.z;
    const distance = Math.sqrt(dx * dx + dz * dz);
    
    // For player vehicles, the target rotation is already set by handleVehicleMove
    // For AI vehicles, calculate it now
    if (vehicle.isAI) {
      vehicle.targetRotation = Math.atan2(dx, dz);
    }
    
    // Normalize current rotation to 0 to 2*PI range
    while (vehicle.rotation < 0) vehicle.rotation += 2 * Math.PI;
    while (vehicle.rotation > 2 * Math.PI) vehicle.rotation -= 2 * Math.PI;
    
    // Calculate rotation difference
    let rotationDiff = vehicle.targetRotation - vehicle.rotation;
    // Normalize to -PI to PI range
    while (rotationDiff > Math.PI) rotationDiff -= 2 * Math.PI;
    while (rotationDiff < -Math.PI) rotationDiff += 2 * Math.PI;
    
    // First, rotate towards target
    if (Math.abs(rotationDiff) > 0.05) { // More precise rotation threshold
      // Still need to rotate
      const rotationStep = rotationSpeed * (deltaTime / 1000);
      if (Math.abs(rotationDiff) <= rotationStep) {
        // Finish rotation
        vehicle.rotation = vehicle.targetRotation;
        console.log(`✅ AI miner ${vehicle.name} completed rotation - now facing ${vehicle.rotation.toFixed(2)} rad`);
      } else {
        // Continue rotating
        vehicle.rotation += Math.sign(rotationDiff) * rotationStep;
        if (Math.random() < 0.1) { // Log occasionally
          console.log(`🔄 AI miner ${vehicle.name} rotating... current: ${vehicle.rotation.toFixed(2)}, target: ${vehicle.targetRotation.toFixed(2)}, diff: ${rotationDiff.toFixed(2)}`);
        }
      }
      
      // Don't move while rotating (turn-then-move behavior)
      // This ensures the vehicle ALWAYS turns before driving
      return;
    }
    
    // Rotation complete, now move
    // Check if close enough to ore node (touching distance - 2 units)
    const touchingDistance = 2;
    
    // Check if we should stop moving
    let shouldStop = false;
    
    if (vehicle.targetId) {
      // If we have a target ore, check if we're close enough to mine
      const oreNode = this.state.oreNodes.get(vehicle.targetId);
      if (oreNode) {
        const oreDistance = Math.sqrt(
          Math.pow(oreNode.x - vehicle.x, 2) + 
          Math.pow(oreNode.z - vehicle.z, 2)
        );
        
        if (oreDistance <= touchingDistance) {
          // Touching the ore - start mining
          shouldStop = true;
          vehicle.status = "mining";
          vehicle.miningStartTime = 0;
          console.log(`🤖 AI miner ${vehicle.name} reached ore node ${oreNode.id} and started mining (distance: ${oreDistance.toFixed(1)})`);
        }
      } else {
        // Ore node no longer exists
        shouldStop = true;
        vehicle.status = "idle";
        vehicle.targetId = "";
      }
    } else if (distance <= touchingDistance) {
      // No target ore, just exploring - stop when we reach the exploration point
      shouldStop = true;
      vehicle.status = "idle";
    }
    
    if (!shouldStop) {
      if (distance <= moveDistance) {
        // Move the full remaining distance
        vehicle.x = vehicle.targetX;
        vehicle.z = vehicle.targetZ;
      } else {
        // Move towards target
        const moveX = (dx / distance) * moveDistance;
        const moveZ = (dz / distance) * moveDistance;
        vehicle.x += moveX;
        vehicle.z += moveZ;
        
        // Log movement progress occasionally
        if (Math.random() < 0.05) { // 5% chance to log
          const vehicleType = vehicle.isAI ? "AI miner" : "Player vehicle";
          console.log(`🚗 ${vehicleType} ${vehicle.name} moving - Pos: (${vehicle.x.toFixed(1)}, ${vehicle.z.toFixed(1)}), Target: (${vehicle.targetX.toFixed(1)}, ${vehicle.targetZ.toFixed(1)}), Distance: ${distance.toFixed(1)}, Move: (${moveX.toFixed(2)}, ${moveZ.toFixed(2)})`);
        }
      }
    } else {
      // Reached destination - set idle for player vehicles
      if (!vehicle.isAI) {
        vehicle.status = "idle";
        console.log(`✅ Player vehicle ${vehicle.name} reached destination`);
      }
    }
  }

  private processVehicleTransport(vehicle: Vehicle, deltaTime: number) {
    // Simplified transport logic
    // Real implementation would move to base and deliver cargo
    vehicle.status = "idle";
  }

  private generateInitialOreNodes() {
    // Create more ore nodes for AI miners to work with
    const oreCount = 50; // Increased to 50 for more mining opportunities
    
    for (let i = 0; i < oreCount; i++) {
      const oreNode = new OreNode();
      oreNode.id = `ore_${i}`;
      
      // Vary ore types
      const rand = Math.random();
      if (rand < 0.5) {
        oreNode.type = "iron";
      } else if (rand < 0.8) {
        oreNode.type = "copper";
      } else if (rand < 0.95) {
        oreNode.type = "crypto_eth";
      } else {
        oreNode.type = "crypto_btc";
      }
      
      // Spread ore nodes over a larger area
      oreNode.x = (Math.random() - 0.5) * 200;
      oreNode.y = 0;
      oreNode.z = (Math.random() - 0.5) * 200;
      oreNode.remaining = 1000 + Math.random() * 2000;
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
    console.log(`   Position: x=${vehicle.x.toFixed(2)}, y=${vehicle.y}, z=${vehicle.z.toFixed(2)}`);
    console.log(`   Total vehicles: ${this.state.vehicles.size}`);
    
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
    if (vehicle && vehicle.ownerId === playerId && !vehicle.isAI) {
      console.log(`🚗 Player vehicle ${vehicle.name} move command to (${data.x.toFixed(2)}, ${data.z.toFixed(2)})`);
      
      // Set target position for movement
      vehicle.targetX = data.x;
      vehicle.targetZ = data.z;
      vehicle.status = "moving";
      
      // Calculate target rotation
      const dx = data.x - vehicle.x;
      const dz = data.z - vehicle.z;
      vehicle.targetRotation = Math.atan2(dx, dz);
      
      console.log(`🎯 Vehicle ${vehicle.name} targeting position (${data.x.toFixed(2)}, ${data.z.toFixed(2)}) with rotation ${vehicle.targetRotation.toFixed(2)} rad`);
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

  // AI Vehicle Methods

  private createAIMiners() {
    console.log("🤖 Creating AI miners...");
    
    for (let i = 0; i < 10; i++) {
      const vehicleId = `ai_miner_${i}`;
      const vehicle = new Vehicle();
      
      vehicle.id = vehicleId;
      vehicle.ownerId = "AI";
      vehicle.type = "miner";
      vehicle.name = `AI Miner ${i + 1}`;
      vehicle.isAI = true;
      vehicle.status = "idle"; // Ensure they start idle
      
      // Spawn AI miners in a circle around the origin
      const angle = (i / 10) * Math.PI * 2;
      const radius = 50 + Math.random() * 20;
      vehicle.x = Math.cos(angle) * radius;
      vehicle.y = 0;
      vehicle.z = Math.sin(angle) * radius;
      
      // Give AI miners infinite fuel for now
      vehicle.fuel = 999999;
      vehicle.maxFuel = 999999;
      
      // Set initial rotation facing outward from center
      vehicle.rotation = angle;
      vehicle.targetRotation = angle;
      
      this.state.vehicles.set(vehicleId, vehicle);
      console.log(`   Created ${vehicle.name} at (${vehicle.x.toFixed(1)}, ${vehicle.z.toFixed(1)})`);
    }
    
    console.log(`🤖 Created ${10} AI miners`);
  }

  private updateAIVehicle(vehicle: Vehicle) {
    console.log(`🤖 Updating AI vehicle ${vehicle.name} - Status: ${vehicle.status}, Position: (${vehicle.x.toFixed(1)}, ${vehicle.z.toFixed(1)})`);
    
    // Check if cargo is full
    if (vehicle.cargo >= vehicle.maxCargo * 0.9) {
      console.log(`🤖 AI miner ${vehicle.name} cargo full (${vehicle.cargo.toFixed(1)}/${vehicle.maxCargo}), needs to return to base`);
      // In a full implementation, would return to base
      // For now, just reset cargo
      vehicle.cargo = 0;
    }
    
    // Simulate radar sweep - search in expanding circles
    console.log(`📡 AI miner ${vehicle.name} activating radar sweep...`);
    
    // Try different search radii to simulate radar sweep
    const searchRadii = [20, 40, 60, 80, 100, 150];
    let nearestOre: OreNode | null = null;
    
    for (const radius of searchRadii) {
      nearestOre = this.findNearestOreNodeWithinRadius(vehicle, radius);
      if (nearestOre) {
        console.log(`📡 Radar detected ore at ${radius}m range!`);
        break;
      }
    }
    
    if (nearestOre) {
      // Set target and start moving
      vehicle.targetId = nearestOre.id;
      vehicle.targetX = nearestOre.x;
      vehicle.targetZ = nearestOre.z;
      vehicle.status = "moving";
      
      const distance = Math.sqrt(
        Math.pow(nearestOre.x - vehicle.x, 2) + 
        Math.pow(nearestOre.z - vehicle.z, 2)
      );
      
      console.log(`🎯 AI miner ${vehicle.name} locked onto ore node ${nearestOre.id} (${nearestOre.type}) at distance ${distance.toFixed(1)}`);
      console.log(`   Moving from (${vehicle.x.toFixed(1)}, ${vehicle.z.toFixed(1)}) to (${nearestOre.x.toFixed(1)}, ${nearestOre.z.toFixed(1)})`);
    } else {
      // No ore found in radar range, explore new area
      console.log(`📡 AI miner ${vehicle.name} radar sweep complete - no ore detected, exploring new sector...`);
      
      // Move to a random location to search for more ore
      const searchAngle = Math.random() * Math.PI * 2;
      const searchDistance = 50 + Math.random() * 100; // Explore further
      vehicle.targetX = vehicle.x + Math.cos(searchAngle) * searchDistance;
      vehicle.targetZ = vehicle.z + Math.sin(searchAngle) * searchDistance;
      vehicle.targetId = "";
      vehicle.status = "moving";
      
      console.log(`🚗 AI miner ${vehicle.name} exploring new sector at (${vehicle.targetX.toFixed(1)}, ${vehicle.targetZ.toFixed(1)})`);
    }
  }

  private findNearestOreNodeWithinRadius(vehicle: Vehicle, maxRadius: number): OreNode | null {
    let nearestOre: OreNode | null = null;
    let minDistance = maxRadius;
    
    this.state.oreNodes.forEach((ore) => {
      // Skip depleted nodes
      if (ore.remaining <= 0) return;
      
      // Skip if another vehicle is already mining this node
      let isOccupied = false;
      this.state.vehicles.forEach((otherVehicle) => {
        if (otherVehicle.id !== vehicle.id && 
            otherVehicle.targetId === ore.id && 
            (otherVehicle.status === "mining" || otherVehicle.status === "moving")) {
          isOccupied = true;
        }
      });
      
      if (isOccupied) return;
      
      // Calculate distance
      const distance = Math.sqrt(
        Math.pow(ore.x - vehicle.x, 2) + 
        Math.pow(ore.z - vehicle.z, 2)
      );
      
      // Only consider if within radar range
      if (distance <= maxRadius && distance < minDistance) {
        minDistance = distance;
        nearestOre = ore;
      }
    });
    
    return nearestOre;
  }

  private findNearestOreNode(vehicle: Vehicle): OreNode | null {
    let nearestOre: OreNode | null = null;
    let minDistance = Infinity;
    
    this.state.oreNodes.forEach((ore) => {
      // Skip depleted nodes
      if (ore.remaining <= 0) return;
      
      // Skip if another vehicle is already mining this node
      let isOccupied = false;
      this.state.vehicles.forEach((otherVehicle) => {
        if (otherVehicle.id !== vehicle.id && 
            otherVehicle.targetId === ore.id && 
            (otherVehicle.status === "mining" || otherVehicle.status === "moving")) {
          isOccupied = true;
        }
      });
      
      if (isOccupied) return;
      
      // Calculate distance
      const distance = Math.sqrt(
        Math.pow(ore.x - vehicle.x, 2) + 
        Math.pow(ore.z - vehicle.z, 2)
      );
      
      if (distance < minDistance) {
        minDistance = distance;
        nearestOre = ore;
      }
    });
    
    return nearestOre;
  }
}
