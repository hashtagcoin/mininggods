import { createNoise2D } from 'simplex-noise';

export interface TerrainChunk {
  chunkX: number;
  chunkZ: number;
  heightMap: number[][];
  biomeMap: string[][];
  oreNodes: OreNodeData[];
}

export interface OreNodeData {
  id: string;
  type: string;
  x: number;
  y: number;
  z: number;
  remaining: number;
  maxOre: number;
  quality: number;
}

export interface WorldConfig {
  seed: number;
  chunkSize: number;
  heightScale: number;
  oreSpawnRate: number;
  maxOreNodes: number;
}

export class WorldGenerator {
  private noise2D: (x: number, y: number) => number;
  private config: WorldConfig;
  private generatedChunks: Map<string, TerrainChunk> = new Map();

  constructor(config: WorldConfig) {
    this.config = config;
    // Create seeded noise function for deterministic world generation
    const seedRandom = this.createSeededRandom(config.seed);
    this.noise2D = createNoise2D(seedRandom);
  }

  /**
   * Create a seeded random number generator for deterministic noise
   */
  private createSeededRandom(seed: number): () => number {
    let state = seed;
    return () => {
      state = (state * 9301 + 49297) % 233280;
      return state / 233280;
    };
  }

  /**
   * Generate a terrain chunk at given coordinates
   */
  generateChunk(chunkX: number, chunkZ: number): TerrainChunk {
    const chunkKey = `${chunkX},${chunkZ}`;
    
    // Return cached chunk if already generated
    if (this.generatedChunks.has(chunkKey)) {
      return this.generatedChunks.get(chunkKey)!;
    }

    const { chunkSize, heightScale } = this.config;
    const heightMap: number[][] = [];
    const biomeMap: string[][] = [];
    const oreNodes: OreNodeData[] = [];

    // Generate height and biome maps
    for (let x = 0; x < chunkSize; x++) {
      heightMap[x] = [];
      biomeMap[x] = [];
      
      for (let z = 0; z < chunkSize; z++) {
        const worldX = chunkX * chunkSize + x;
        const worldZ = chunkZ * chunkSize + z;
        
        // Generate height using multiple octaves of Perlin noise
        const height = this.generateHeight(worldX, worldZ);
        heightMap[x][z] = height;
        
        // Determine biome based on height and additional noise
        const biome = this.generateBiome(worldX, worldZ, height);
        biomeMap[x][z] = biome;
      }
    }

    // Generate ore nodes for this chunk
    this.generateOreNodes(chunkX, chunkZ, heightMap, biomeMap, oreNodes);

    const chunk: TerrainChunk = {
      chunkX,
      chunkZ,
      heightMap,
      biomeMap,
      oreNodes
    };

    // Cache the generated chunk
    this.generatedChunks.set(chunkKey, chunk);
    
    console.log(`🌍 Generated chunk (${chunkX}, ${chunkZ}) with ${oreNodes.length} ore nodes`);
    
    return chunk;
  }

  /**
   * Generate height using multi-octave Perlin noise
   */
  private generateHeight(x: number, z: number): number {
    const { heightScale } = this.config;
    
    // Multiple octaves for more realistic terrain
    let height = 0;
    let amplitude = 1;
    let frequency = 0.01;
    
    // Base terrain (large features)
    height += this.noise2D(x * frequency, z * frequency) * amplitude;
    
    // Hills and valleys (medium features)
    amplitude *= 0.5;
    frequency *= 2;
    height += this.noise2D(x * frequency, z * frequency) * amplitude;
    
    // Surface detail (small features)
    amplitude *= 0.5;
    frequency *= 2;
    height += this.noise2D(x * frequency, z * frequency) * amplitude;
    
    return height * heightScale;
  }

  /**
   * Generate biome based on height and moisture
   */
  private generateBiome(x: number, z: number, height: number): string {
    // Generate moisture using different noise offset
    const moisture = this.noise2D((x + 1000) * 0.005, (z + 1000) * 0.005);
    
    // Determine biome based on height and moisture
    if (height < -2) return "deep_valley";
    if (height < 0) return "plains";
    if (height < 3) {
      return moisture > 0 ? "forest" : "desert";
    }
    if (height < 6) return "hills";
    return "mountains";
  }

  /**
   * Generate ore nodes within a chunk
   */
  private generateOreNodes(
    chunkX: number, 
    chunkZ: number, 
    heightMap: number[][], 
    biomeMap: string[][], 
    oreNodes: OreNodeData[]
  ): void {
    const { chunkSize, oreSpawnRate, maxOreNodes } = this.config;
    
    // Determine number of ore nodes for this chunk
    const baseOreCount = Math.floor(chunkSize * chunkSize * oreSpawnRate);
    const oreCount = Math.min(baseOreCount + Math.floor(Math.random() * 3), maxOreNodes);
    
    for (let i = 0; i < oreCount; i++) {
      const localX = Math.floor(Math.random() * chunkSize);
      const localZ = Math.floor(Math.random() * chunkSize);
      const worldX = chunkX * chunkSize + localX;
      const worldZ = chunkZ * chunkSize + localZ;
      
      const height = heightMap[localX][localZ];
      const biome = biomeMap[localX][localZ];
      
      // Determine ore type based on height and biome
      const oreType = this.determineOreType(height, biome, worldX, worldZ);
      
      if (oreType) {
        const oreNode: OreNodeData = {
          id: `ore_${chunkX}_${chunkZ}_${i}`,
          type: oreType,
          x: worldX,
          y: height + 0.5, // Slightly above ground
          z: worldZ,
          remaining: this.generateOreAmount(oreType),
          maxOre: 0, // Will be set after remaining is calculated
          quality: this.generateOreQuality(oreType, height)
        };
        
        oreNode.maxOre = oreNode.remaining;
        oreNodes.push(oreNode);
      }
    }
  }

  /**
   * Determine ore type based on environmental factors
   */
  private determineOreType(height: number, biome: string, x: number, z: number): string | null {
    // Use noise to add randomness to ore distribution
    const oreNoise = this.noise2D(x * 0.02, z * 0.02);
    
    // Biome-based ore preferences
    if (biome === "mountains") {
      if (oreNoise > 0.3) return "crypto_btc"; // Rare crypto in mountains
      if (oreNoise > 0) return "copper";
      return "iron";
    }
    
    if (biome === "hills") {
      if (oreNoise > 0.4) return "crypto_eth"; // Rare crypto in hills
      if (oreNoise > 0.1) return "copper";
      return "iron";
    }
    
    if (biome === "deep_valley") {
      if (oreNoise > 0.2) return "copper"; // More copper in valleys
      return "iron";
    }
    
    // Default distribution for other biomes
    if (oreNoise > 0.5) return "copper";
    if (oreNoise > -0.2) return "iron";
    
    return null; // No ore node
  }

  /**
   * Generate ore amount based on type
   */
  private generateOreAmount(oreType: string): number {
    const baseAmounts = {
      iron: 800,
      copper: 600,
      crypto_btc: 100,
      crypto_eth: 150
    };
    
    const base = baseAmounts[oreType as keyof typeof baseAmounts] || 500;
    return base + Math.floor(Math.random() * base * 0.5);
  }

  /**
   * Generate ore quality multiplier
   */
  private generateOreQuality(oreType: string, height: number): number {
    let quality = 0.8 + Math.random() * 0.4; // Base 0.8-1.2
    
    // Height affects quality - higher areas have better quality
    if (height > 3) quality += 0.1;
    if (height > 6) quality += 0.2;
    
    // Crypto ores have naturally higher base quality
    if (oreType.startsWith("crypto_")) {
      quality += 0.3;
    }
    
    return Math.min(quality, 2.0); // Cap at 2.0x quality
  }

  /**
   * Get chunks around a center point (for loading/unloading)
   */
  getChunksInRadius(centerX: number, centerZ: number, radius: number): TerrainChunk[] {
    const chunks: TerrainChunk[] = [];
    const chunkCenterX = Math.floor(centerX / this.config.chunkSize);
    const chunkCenterZ = Math.floor(centerZ / this.config.chunkSize);
    
    for (let x = chunkCenterX - radius; x <= chunkCenterX + radius; x++) {
      for (let z = chunkCenterZ - radius; z <= chunkCenterZ + radius; z++) {
        chunks.push(this.generateChunk(x, z));
      }
    }
    
    return chunks;
  }

  /**
   * Get world configuration
   */
  getConfig(): WorldConfig {
    return { ...this.config };
  }
}
