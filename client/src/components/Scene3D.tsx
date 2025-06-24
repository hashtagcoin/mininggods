import React, { useRef, useState, useMemo, useCallback, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import type { ThreeEvent } from '@react-three/fiber';
import { OrbitControls, Text, useGLTF, Grid, Environment, useTexture, Stars } from '@react-three/drei';
import * as THREE from 'three';
import type { Player, Vehicle } from '../services/GameClient';
import { 
  useGameState, 
  useMyPlayerId, 
  useSelectedVehicleId, 
  useGameConnection,
  useVehicleActions,
  usePlayerActions,
  useGameStore
} from '../store/gameStore';
import { loopDetector } from '../utils/infiniteLoopDetector';

// Define the app-specific game state interface
interface AppGameState {
  players: Record<string, Player> | any; // MapSchema or plain object
  vehicles: Record<string, Vehicle> | any; // MapSchema or plain object
  oreNodes?: Record<string, { id: string; x: number; y: number; z: number; remaining: number; type: string }> | any; // MapSchema or plain object
}

// Player Avatar Component
const PlayerAvatar = React.memo(({ 
  player, 
  isMe = false 
}: { 
  player: { id: string; name: string; x: number; y: number; credits: number }, 
  isMe?: boolean 
}) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const groupRef = useRef<THREE.Group>(null);
  
  // Calculate floating position above terrain
  const playerPosition = useMemo(() => {
    const getHeight = (window as any).getTerrainHeight;
    if (getHeight) {
      const terrainHeight = getHeight(player.x, 0); // Use player.x and z=0
      const visualTerrainHeight = terrainHeight - 2.0; // Subtract collision offset
      const floatHeight = 5; // Float 5 units above terrain
      return [player.x, visualTerrainHeight + floatHeight, 0];
    }
    return [player.x, player.y + 5, 0]; // Default float height
  }, [player.x, player.y]);
  
  // Add floating animation
  useFrame((state) => {
    if (groupRef.current) {
      // Gentle floating motion
      const time = state.clock.elapsedTime;
      groupRef.current.position.y = playerPosition[1] + Math.sin(time * 2) * 0.5;
      
      // Slow rotation for visual interest
      groupRef.current.rotation.y = time * 0.5;
    }
  });
  
  return (
    <group ref={groupRef} position={playerPosition as [number, number, number]}>
      {/* Player Cube */}
      <mesh ref={meshRef} castShadow>
        <boxGeometry args={[1, 2, 1]} />
        <meshLambertMaterial 
          color={isMe ? '#ff6b35' : '#4CAF50'} 
          emissive={isMe ? '#ff6b35' : '#4CAF50'} 
          emissiveIntensity={0.2}
        />
      </mesh>
      
      {/* Floating ring effect */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, -1.5, 0]}>
        <torusGeometry args={[1.5, 0.1, 8, 24]} />
        <meshBasicMaterial 
          color={isMe ? '#ff6b35' : '#4CAF50'}
          transparent
          opacity={0.3}
        />
      </mesh>
      
      {/* Energy glow underneath */}
      <pointLight
        color={isMe ? '#ff6b35' : '#4CAF50'}
        intensity={0.5}
        distance={8}
        decay={2}
        position={[0, -2, 0]}
      />
      
      {/* Only show labels for selected/nearby players to reduce text rendering cost */}
      {isMe && (
        <>
          {/* Player Name Label */}
          <Text
            position={[0, 3, 0]}
            fontSize={0.5}
            color="#ffffff"
            anchorX="center"
            anchorY="middle"
          >
            {player.name}
            {isMe && ' (You)'}
          </Text>
          
          {/* Credits Display */}
          <Text
            position={[0, 2.5, 0]}
            fontSize={0.3}
            color="#ffc107"
            anchorX="center"
            anchorY="middle"
          >
            ${player.credits}
          </Text>
        </>
      )}
    </group>
  );
});

// Terrain Component - Lunar surface with PBR materials
function Terrain({ onClick, showCollisionMesh = false }: { onClick?: (event: ThreeEvent<MouseEvent>) => void; showCollisionMesh?: boolean }) {
  const meshRef = useRef<THREE.Mesh>(null);
  
  console.log('[Terrain] Component rendering');
  
  // Terrain parameters - lunar surface
  const worldWidth = 256; // Increased resolution for better bump mapping
  const worldDepth = 256;
  const terrainSize = 200; // Physical size of terrain
  
  // Load PBR textures
  const textureLoader = new THREE.TextureLoader();
  const textures = useMemo(() => {
    console.log('[Terrain] Loading PBR textures...');
    
    // Load all PBR textures with error handling
    const diffuseMap = textureLoader.load(
      '/textures/aerial_rocks_01_diff_4k.jpg',
      undefined,
      undefined,
      (err) => console.error('[Terrain] Failed to load diffuse map:', err)
    );
    
    const roughnessMap = textureLoader.load(
      '/textures/aerial_rocks_01_rough_4k.jpg',
      undefined,
      undefined,
      (err) => console.error('[Terrain] Failed to load roughness map:', err)
    );
    
    const displacementMap = textureLoader.load(
      '/textures/aerial_rocks_01_disp_4k.png',
      undefined,
      undefined,
      (err) => console.error('[Terrain] Failed to load displacement map:', err)
    );
    
    // For now, use displacement map directly as normal map
    // In production, you'd convert displacement to normal map
    const normalMap = displacementMap;
    
    // Configure textures for seamless tiling
    [diffuseMap, roughnessMap, displacementMap, normalMap].forEach(texture => {
      if (texture) {
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(12, 12); // More tiling for detailed terrain
        texture.anisotropy = 16; // Better texture filtering at angles
        // Enable mipmapping for better performance at distance
        texture.generateMipmaps = true;
        texture.minFilter = THREE.LinearMipmapLinearFilter;
        texture.magFilter = THREE.LinearFilter;
      }
    });
    
    console.log('[Terrain] Textures configured');
    return { diffuseMap, normalMap, roughnessMap, displacementMap };
  }, []);
  
  // Generate height data using enhanced noise for lunar craters and mountains
  const generateHeightData = (width: number, height: number) => {
    console.log('[Terrain] Generating height data - width:', width, 'height:', height);
    const size = width * height;
    const data = new Float32Array(size);
    
    // Enhanced noise function for lunar-like terrain
    const noise = (x: number, y: number) => {
      // Multiple octaves for complex lunar terrain
      const octave1 = Math.sin(x * 0.03) * Math.cos(y * 0.03) * 1.2;  // Large craters
      const octave2 = Math.sin(x * 0.08) * Math.cos(y * 0.08) * 0.6;  // Medium features
      const octave3 = Math.sin(x * 0.2) * Math.cos(y * 0.2) * 0.3;    // Small details
      const octave4 = Math.sin(x * 0.4) * Math.cos(y * 0.4) * 0.125;  // Fine details
      
      return octave1 + octave2 + octave3 + octave4;
    };
    
    // Add crater function
    const crater = (x: number, y: number, cx: number, cy: number, radius: number, depth: number) => {
      const dist = Math.sqrt((x - cx) * (x - cx) + (y - cy) * (y - cy));
      if (dist < radius) {
        const t = dist / radius;
        return -depth * (1 - t * t); // Parabolic crater shape
      }
      return 0;
    };
    
    for (let i = 0; i < size; i++) {
      const x = i % width;
      const y = Math.floor(i / width);
      
      // Base terrain noise
      let height = noise(x, y) * 4.0;
      
      // Add several craters of different sizes
      height += crater(x, y, 64, 64, 20, 8);    // Large crater
      height += crater(x, y, 96, 32, 15, 6);    // Medium crater
      height += crater(x, y, 32, 96, 12, 5);    // Medium crater
      height += crater(x, y, 80, 80, 8, 3);     // Small crater
      height += crater(x, y, 48, 48, 10, 4);    // Small crater
      
      data[i] = height;
    }
    
    console.log('[Terrain] Height data generated - sample values:', data[0], data[100], data[1000]);
    return data;
  };
  
  // Store height data for vehicle sampling
  const heightData = useMemo(() => generateHeightData(worldWidth, worldDepth), []);
  
  // Generate terrain geometry
  const terrainGeometry = useMemo(() => {
    console.log('[Terrain] Creating terrain geometry');
    try {
      const geometry = new THREE.PlaneGeometry(
        terrainSize, 
        terrainSize, 
        worldWidth - 1, 
        worldDepth - 1
      );
      
      geometry.rotateX(-Math.PI / 2); // Make it horizontal
      
      const positionAttribute = geometry.attributes.position;
      if (!positionAttribute) {
        console.error('[Terrain] No position attribute in geometry');
        return geometry;
      }
      
      const vertices = positionAttribute.array as Float32Array;
      console.log('[Terrain] Vertices length:', vertices?.length || 0, 'heightData length:', heightData?.length || 0);
      
      // Apply height data to vertices
      // Note: both are Float32Arrays, not regular arrays
      if ((heightData instanceof Float32Array || Array.isArray(heightData)) && heightData.length > 0 && 
          vertices && vertices.length > 0) {
        for (let i = 0, j = 0; i < heightData.length; i++, j += 3) {
          if (j + 1 < vertices.length) {
            vertices[j + 1] = heightData[i]; // Y coordinate
          }
        }
      } else {
        console.error('[Terrain] heightData or vertices not valid:', {
          heightData: !!heightData,
          heightDataLength: heightData?.length,
          vertices: !!vertices,
          verticesLength: vertices?.length
        });
      }
      
      geometry.computeVertexNormals(); // Recalculate normals for proper lighting
      console.log('[Terrain] Geometry created successfully');
      
      return geometry;
    } catch (error) {
      console.error('[Terrain] Error creating geometry:', error);
      throw error;
    }
  }, [heightData]);

  // Create collision mesh geometry (clone of terrain but elevated)
  const collisionGeometry = useMemo(() => {
    if (!terrainGeometry) return null;
    
    // Clone the terrain geometry
    const collisionGeo = terrainGeometry.clone();
    
    // Elevate all vertices by the maximum displacement amount plus buffer
    // With displacementScale=1.5 and displacementBias=-0.75:
    // Displacement range is [-1.5, 1.5], so max upward displacement is 1.5
    // Add buffer for normal map visual effects and safety
    const collisionOffset = 2.0; // 1.5 (max upward displacement) + 0.5 (buffer)
    
    const vertices = collisionGeo.attributes.position.array as Float32Array;
    for (let i = 1; i < vertices.length; i += 3) {
      vertices[i] += collisionOffset; // Elevate Y coordinate
    }
    
    // Recompute normals for the collision mesh
    collisionGeo.computeVertexNormals();
    
    return collisionGeo;
  }, [terrainGeometry]);
  
  // Update the global terrain height function to use collision mesh height
  useEffect(() => {
    // Store the height sampling function with collision offset
    (window as any).getTerrainHeight = (x: number, z: number): number => {
      // Convert world coordinates to terrain grid coordinates (with fractional parts)
      const gridX = ((x + terrainSize / 2) / terrainSize) * worldWidth;
      const gridZ = ((z + terrainSize / 2) / terrainSize) * worldDepth;
      
      // Get integer grid coordinates
      const x0 = Math.floor(gridX);
      const z0 = Math.floor(gridZ);
      const x1 = Math.min(x0 + 1, worldWidth - 1);
      const z1 = Math.min(z0 + 1, worldDepth - 1);
      
      // Get fractional parts for interpolation
      const fx = gridX - x0;
      const fz = gridZ - z0;
      
      // Clamp coordinates
      const clampX0 = Math.max(0, Math.min(worldWidth - 1, x0));
      const clampZ0 = Math.max(0, Math.min(worldDepth - 1, z0));
      const clampX1 = Math.max(0, Math.min(worldWidth - 1, x1));
      const clampZ1 = Math.max(0, Math.min(worldDepth - 1, z1));
      
      // Get heights at four corners
      const h00 = heightData[clampZ0 * worldWidth + clampX0] || 0;
      const h10 = heightData[clampZ0 * worldWidth + clampX1] || 0;
      const h01 = heightData[clampZ1 * worldWidth + clampX0] || 0;
      const h11 = heightData[clampZ1 * worldWidth + clampX1] || 0;
      
      // Bilinear interpolation
      const h0 = h00 * (1 - fx) + h10 * fx;
      const h1 = h01 * (1 - fx) + h11 * fx;
      const interpolatedHeight = h0 * (1 - fz) + h1 * fz;
      
      // Add offset for collision mesh
      // Account for displacement that can go both up and down
      // displacementScale=1.5, displacementBias=-0.75 means displacement range is [-1.5, 1.5]
      // So maximum height variation is 1.5 units up from base
      return interpolatedHeight + 2.0; // Add max displacement + buffer for safety
    };
    
    // Function to calculate terrain normal at a position
    (window as any).getTerrainNormal = (x: number, z: number): THREE.Vector3 => {
      const delta = 1.0; // Sample distance
      
      // Get heights at nearby points (already includes collision offset)
      const hL = (window as any).getTerrainHeight(x - delta, z);
      const hR = (window as any).getTerrainHeight(x + delta, z);
      const hD = (window as any).getTerrainHeight(x, z - delta);
      const hU = (window as any).getTerrainHeight(x, z + delta);
      
      // Calculate normal vector
      const normal = new THREE.Vector3(hL - hR, 2.0 * delta, hD - hU);
      normal.normalize();
      
      return normal;
    };
    
    return () => {
      delete (window as any).getTerrainHeight;
      delete (window as any).getTerrainNormal;
    };
  }, [heightData, terrainSize, worldWidth, worldDepth]);

  return (
    <group>
      {/* Visual terrain mesh with textures and displacement */}
      <mesh 
        ref={meshRef}
        receiveShadow
        castShadow
        position={[0, 0, 0]}
        onClick={onClick}
        onError={(error) => {
          console.error('[Terrain] Mesh rendering error:', error);
        }}
      >
        <primitive object={terrainGeometry} />
        <meshStandardMaterial 
          map={textures.diffuseMap}
          normalMap={textures.normalMap}
          normalScale={new THREE.Vector2(1.5, 1.5)}
          roughnessMap={textures.roughnessMap}
          roughness={0.9}
          metalness={0.05}
          bumpMap={textures.displacementMap}
          bumpScale={0.3} // Reduced to minimize visual-only height variations
          displacementMap={textures.displacementMap}
          displacementScale={1.5} // Reduced to minimize clipping issues
          displacementBias={-0.75} // Center the displacement (range: -1.5 to 1.5)
          side={THREE.DoubleSide}
          // Lunar surface color tint - slightly gray
          color={new THREE.Color(0.8, 0.8, 0.82)}
        />
      </mesh>
      
      {/* Invisible collision mesh - elevated above visual terrain */}
      {collisionGeometry && (
        <mesh 
          position={[0, 0, 0]}
          visible={showCollisionMesh} // Can be toggled for debugging
        >
          <primitive object={collisionGeometry} />
          <meshBasicMaterial 
            color="#00ff00"
            wireframe={true}
            transparent
            opacity={showCollisionMesh ? 0.3 : 0}
          />
        </mesh>
      )}
    </group>
  );
}

// Ore Component - Mineable resources
function Ore({ 
  id, 
  position, 
  rotation,
  onMined 
}: { 
  id: string;
  position: [number, number, number];
  rotation: [number, number, number];
  onMined: (id: string) => void;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const groupRef = useRef<THREE.Group>(null);
  const [miningProgress, setMiningProgress] = useState(1.0); // 1.0 = full, 0.0 = depleted
  const [isMining, setIsMining] = useState(false);
  
  // Load ore model
  // Note: useGLTF is a hook and must not be called conditionally
  const gltf = useGLTF('/ore1.glb');
  const scene = gltf?.scene;
  
  // Throttle collision detection to every 10 frames (~6 times per second at 60fps)
  const collisionCheckCounter = useRef(0);
  
  // Get gameState outside of the callback to avoid store access in render loop
  const gameState = useGameState();
  
  // Store gameState vehicles in a ref to avoid dependency changes
  const gameStateRef = useRef(gameState);
  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);
  
  // Check for miner collision - THROTTLED for performance
  const checkMinerCollision = useCallback(() => {
    const currentGameState = gameStateRef.current;
    if (!currentGameState || !currentGameState.vehicles) return;
    
    const vehicles = Object.values(currentGameState.vehicles);
    const miners = vehicles.filter(v => v.type === 'miner');
    
    for (const miner of miners) {
      const distance = Math.sqrt(
        Math.pow(miner.x - position[0], 2) + 
        Math.pow(miner.z - position[2], 2)
      );
      
      if (distance < 3.0) { // Mining range
        setIsMining(true);
        return;
      }
    }
    setIsMining(false);
  }, [position]);
  
  // Use refs to avoid state updates in render loop
  const miningProgressRef = useRef(miningProgress);
  const isMiningRef = useRef(isMining);
  
  useEffect(() => {
    miningProgressRef.current = miningProgress;
  }, [miningProgress]);
  
  useEffect(() => {
    isMiningRef.current = isMining;
  }, [isMining]);
  
  // Optimized useFrame - only check collision every 10 frames
  useFrame((_state, delta) => {
    // Throttle collision detection
    collisionCheckCounter.current++;
    if (collisionCheckCounter.current >= 10) {
      checkMinerCollision();
      collisionCheckCounter.current = 0;
    }
    
    // Only process mining if actually mining - use refs to avoid state updates
    if (isMiningRef.current && miningProgressRef.current > 0) {
      const newProgress = Math.max(0, miningProgressRef.current - delta * 0.1); // 10 seconds to mine
      miningProgressRef.current = newProgress;
      
      // Only update state every 0.5 seconds to avoid too many re-renders
      if (Math.floor(newProgress * 10) !== Math.floor(miningProgress * 10)) {
        setMiningProgress(newProgress);
      }
      
      if (newProgress <= 0) {
        onMined(id);
        setIsMining(false);
      }
    }
  });

  const clonedScene = useMemo(() => scene?.clone(), [scene]);
  
  // Fallback if model doesn't load
  if (!scene) {
    console.warn('[Ore] Using fallback mesh as model failed to load');
    return (
      <group ref={groupRef} position={position} rotation={rotation}>
        <mesh ref={meshRef} castShadow receiveShadow>
          <octahedronGeometry args={[1]} />
          <meshStandardMaterial 
            color="#8B4513" 
            metalness={0.7}
            roughness={0.3}
            emissive="#442211"
            emissiveIntensity={0.1}
          />
        </mesh>
      </group>
    );
  }
  
  return (
    <group 
      ref={groupRef}
      position={position}
      rotation={rotation}
    >
      <primitive 
        ref={meshRef}
        object={clonedScene}
        castShadow
        receiveShadow
      />
      
      {/* Mining progress indicator */}
      {isMining && (
        <Text
          position={[0, 2, 0]}
          fontSize={0.3}
          color="#ffeb3b"
          anchorX="center"
          anchorY="middle"
        >
          {`Mining: ${Math.round(miningProgress * 100)}%`}
        </Text>
      )}
      
      {/* Mining effect particles */}
      {isMining && (
        <mesh position={[0, 1, 0]}>
          <sphereGeometry args={[0.1, 8, 8]} />
          <meshBasicMaterial color="#ff9800" transparent opacity={0.6} />
        </mesh>
      )}
    </group>
  );
}

// Radar Sweep Component for AI vehicles
const RadarSweep = React.memo(() => {
  const meshRef = useRef<THREE.Mesh>(null);
  const mesh2Ref = useRef<THREE.Mesh>(null);
  
  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.z = state.clock.elapsedTime * 0.5;
    }
    if (mesh2Ref.current) {
      mesh2Ref.current.rotation.z = state.clock.elapsedTime * 0.5;
    }
  });
  
  return (
    <group position={[0, 0.5, 0]}>
      <mesh ref={meshRef} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0, 20, 32, 1, 0, Math.PI / 4]} />
        <meshBasicMaterial 
          color="#00ffff"
          transparent
          opacity={0.3}
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh ref={mesh2Ref} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[15, 20, 32, 1, 0, Math.PI / 8]} />
        <meshBasicMaterial 
          color="#00ffff"
          transparent
          opacity={0.5}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
});

// Vehicle Component with Turn-Then-Move Logic
const Vehicle = React.memo(({ 
  vehicle, 
  isSelected = false,
  isOwnedByPlayer = false
}: { 
  vehicle: { id: string; name: string; x: number; y: number; z: number; rotation?: number; type: string; status: string; isAI?: boolean; ownerId?: string }, 
  isSelected?: boolean,
  isOwnedByPlayer?: boolean
}) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const groupRef = useRef<THREE.Group>(null);
  const arrowRef = useRef<THREE.Group>(null);
  const { selectVehicle } = useVehicleActions();
  const optimisticPosition = useGameStore(state => state.optimisticVehiclePositions[vehicle.id]);
  const [hovered, setHovered] = useState(false);
  const [isVehicleMoving, setIsVehicleMoving] = useState(false);
  const [isFlashing, setIsFlashing] = useState(false);
  const [showBoundingBox] = useState(false); // Debug: show bounding box
  const [forceUseBox] = useState(false); // Debug: force use box instead of model
  const [manualOffset, setManualOffset] = useState(0.5); // Debug: manual offset adjustment - increased to prevent clipping
  
  // Debug: Keyboard controls for offset adjustment
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp') {
        setManualOffset(prev => {
          const newOffset = prev + 0.1;
          console.log(`[Vehicle ${vehicle.id}] Manual offset increased to: ${newOffset.toFixed(2)}`);
          return newOffset;
        });
      } else if (e.key === 'ArrowDown') {
        setManualOffset(prev => {
          const newOffset = prev - 0.1;
          console.log(`[Vehicle ${vehicle.id}] Manual offset decreased to: ${newOffset.toFixed(2)}`);
          return newOffset;
        });
      }
    };
    
    if (isSelected) {
      window.addEventListener('keydown', handleKeyPress);
      return () => window.removeEventListener('keydown', handleKeyPress);
    }
  }, [isSelected, vehicle.id]);
  
  // Load GLB model from public directory
  // Note: useGLTF is a hook and must not be called conditionally
  const gltf = useGLTF('/miner2.glb');
  const scene = gltf?.scene;
  
  // Calculate vehicle height offset and adjust pivot point
  const [vehicleHeightOffset, boundingBoxData, adjustedScene] = useMemo(() => {
    if (scene) {
      // Clone the scene to avoid modifying the original
      const tempScene = scene.clone();
      tempScene.scale.set(2, 2, 2); // Apply the same scale as we use for rendering
      
      // Calculate bounding box of the scaled model
      const box = new THREE.Box3().setFromObject(tempScene);
      const size = box.getSize(new THREE.Vector3());
      const center = box.getCenter(new THREE.Vector3());
      
      // Calculate the bottom center point of the bounding box
      const bottomCenterX = center.x;
      const bottomCenterY = box.min.y;
      const bottomCenterZ = center.z;
      
      // Create a new group to act as the adjusted pivot point
      const pivotGroup = new THREE.Group();
      
      // Clone the original scene for our adjusted version
      const adjustedModel = scene.clone();
      adjustedModel.scale.set(2, 2, 2);
      
      // Move the model so its bottom center is at the origin
      adjustedModel.position.set(-bottomCenterX, -bottomCenterY, -bottomCenterZ);
      
      // Add the adjusted model to the pivot group
      pivotGroup.add(adjustedModel);
      
      console.log(`[Vehicle ${vehicle.id}] Model dimensions:`, {
        width: size.x.toFixed(2),
        height: size.y.toFixed(2),
        depth: size.z.toFixed(2),
        bottomY: box.min.y.toFixed(2),
        centerY: center.y.toFixed(2),
        adjustmentX: (-bottomCenterX).toFixed(2),
        adjustmentY: (-bottomCenterY).toFixed(2),
        adjustmentZ: (-bottomCenterZ).toFixed(2)
      });
      
      // Now the pivot is at the bottom center, so no additional offset needed
      return [0 + manualOffset, { size, min: box.min, max: box.max, center }, pivotGroup];
    }
    // Fallback for box geometry (height is 8)
    // Box is centered at origin, so bottom is at -4
    return [4 + manualOffset, { 
      size: new THREE.Vector3(12, 8, 16), 
      min: new THREE.Vector3(-6, -4, -8),
      max: new THREE.Vector3(6, 4, 8),
      center: new THREE.Vector3(0, 0, 0)
    }, null];
  }, [scene, vehicle.id, manualOffset]);
  
  // Get vehicle position with optimistic updates
  const vehiclePosition = useMemo(() => {
    const basePos = optimisticPosition 
      ? { x: optimisticPosition.x, y: vehicle.y, z: optimisticPosition.z }
      : { x: vehicle.x, y: vehicle.y, z: vehicle.z };
    
    // Get terrain height at vehicle position
    const getHeight = (window as any).getTerrainHeight;
    if (getHeight) {
      const collisionHeight = getHeight(basePos.x, basePos.z);
      // Subtract collision offset to get visual terrain height
      const visualTerrainHeight = collisionHeight - 2.0;
      basePos.y = visualTerrainHeight + vehicleHeightOffset; // Position on visual terrain
    }
    
    return basePos;
  }, [vehicle.x, vehicle.y, vehicle.z, optimisticPosition, vehicleHeightOffset]);
  
  // Debug log vehicle data (after vehiclePosition is defined)
  console.log(`[Vehicle ${vehicle.id}] Rendering at:`, { 
    serverPos: { x: vehicle.x, y: vehicle.y, z: vehicle.z }, 
    optimisticPos: optimisticPosition,
    calculatedPos: { x: vehiclePosition.x, y: vehiclePosition.y, z: vehiclePosition.z },
    isOwnedByPlayer,
    type: vehicle.type 
  });
  
  // Memoize vehicle color calculation
  const vehicleColor = useMemo(() => {
    // AI miners have a different color scheme
    if (vehicle.isAI) {
      return '#00FF00'; // Bright green for AI miners
    }
    
    switch (vehicle.type) {
      case 'miner': return '#FF6B35';
      case 'hauler': return '#2196F3';
      case 'scout': return '#9C27B0';
      default: return '#757575';
    }
  }, [vehicle.type, vehicle.isAI]);
  
  // Throttled position and rotation updates (reduced from every frame to ~20fps)
  const lastUpdateTime = useRef(0);
  const currentPos = useRef(new THREE.Vector3(vehiclePosition.x, vehiclePosition.y, vehiclePosition.z));
  const currentRotation = useRef(0);
  const targetRotation = useRef(0);
  const isMoving = useRef(false);
  const moveStartTime = useRef(0);
  const moveDistance = useRef(0);
  
  // Initialize position with terrain height
  useEffect(() => {
    const getHeight = (window as any).getTerrainHeight;
    if (getHeight) {
      const collisionHeight = getHeight(vehiclePosition.x, vehiclePosition.z);
      // Subtract 10 to get visual terrain height
      const visualTerrainHeight = collisionHeight - 2.0;
      currentPos.current.set(vehiclePosition.x, visualTerrainHeight + vehicleHeightOffset, vehiclePosition.z);
      console.log(`[Vehicle ${vehicle.id}] Initial position set:`, {
        x: vehiclePosition.x,
        y: visualTerrainHeight + vehicleHeightOffset,
        z: vehiclePosition.z,
        vehicleHeightOffset
      });
    }
    
    // For AI vehicles, also initialize rotation
    if (vehicle.isAI && vehicle.rotation !== undefined) {
      currentRotation.current = vehicle.rotation;
    }
  }, []); // Only run once on mount
  
  // Update current position ref when vehicle position changes
  useEffect(() => {
    console.log(`[Vehicle ${vehicle.id}] Position update triggered:`, {
      old: { x: currentPos.current.x, z: currentPos.current.z },
      new: { x: vehiclePosition.x, z: vehiclePosition.z },
      hasOptimistic: !!optimisticPosition,
      isOwnedByPlayer
    });
    
    const newTargetPos = new THREE.Vector3(vehiclePosition.x, vehiclePosition.y, vehiclePosition.z);
    const currentPosVec = new THREE.Vector3(currentPos.current.x, currentPos.current.y, currentPos.current.z);
    
    // Calculate distance and rotation to target
    const dx = newTargetPos.x - currentPosVec.x;
    const dz = newTargetPos.z - currentPosVec.z;
    const distance = Math.sqrt(dx * dx + dz * dz);
    
    console.log(`[Vehicle ${vehicle.id}] Movement calculation:`, {
      dx, dz, distance,
      willMove: distance > 0.1,
      vehicleHeightOffset
    });
    
    // For player vehicles with optimistic updates, always trigger movement
    if (distance > 0.1 || (isOwnedByPlayer && optimisticPosition)) { // Move if distance is significant OR it's our vehicle with optimistic update
      isMoving.current = true;
      moveStartTime.current = Date.now();
      moveDistance.current = distance;
      
      // For AI vehicles, use server rotation
      if (vehicle.isAI && vehicle.rotation !== undefined) {
        targetRotation.current = vehicle.rotation;
        currentRotation.current = vehicle.rotation;
      } else {
        // Calculate target rotation for player vehicles
        targetRotation.current = Math.atan2(dx, dz);
      }
      console.log(`[Vehicle ${vehicle.id}] Starting movement, distance: ${distance}, optimistic: ${!!optimisticPosition}`);
    }
  }, [vehiclePosition.x, vehiclePosition.y, vehiclePosition.z, vehicle.id, vehicle.rotation, vehicle.isAI, optimisticPosition, isOwnedByPlayer]);
  
  useFrame((state, delta) => {
    if (!groupRef.current) return;
    
    const targetPos = new THREE.Vector3(vehiclePosition.x, vehiclePosition.y, vehiclePosition.z);
    
    // Update moving state for particles
    // For AI vehicles, check their status
    if (vehicle.isAI) {
      setIsVehicleMoving(vehicle.status === 'moving');
    } else {
      setIsVehicleMoving(isMoving.current);
    }
    
    // For AI vehicles, always interpolate to server position
    if (vehicle.isAI) {
      const distance = currentPos.current.distanceTo(targetPos);
      
      // Only update if there's significant movement
      if (distance > 0.1) {
        const lerpFactor = 0.15; // Slightly faster for more responsive movement
        currentPos.current.x = THREE.MathUtils.lerp(currentPos.current.x, targetPos.x, lerpFactor);
        currentPos.current.z = THREE.MathUtils.lerp(currentPos.current.z, targetPos.z, lerpFactor);
        
        // Update terrain height at new position
        const getHeight = (window as any).getTerrainHeight;
        if (getHeight) {
          const collisionHeight = getHeight(currentPos.current.x, currentPos.current.z);
          currentPos.current.y = (collisionHeight - 2.5) + vehicleHeightOffset; // Subtract collision offset for visual terrain
        }
      }
    } else if (isMoving.current) {
      // Debug movement
      if (Math.random() < 0.02) { // Log occasionally to avoid spam
        console.log(`[Vehicle ${vehicle.id}] Moving:`, {
          currentPos: { x: currentPos.current.x, z: currentPos.current.z },
          targetPos: { x: targetPos.x, z: targetPos.z },
          distance: currentPos.current.distanceTo(targetPos)
        });
      }
      
      // Realistic vehicle movement parameters
      const ROTATION_SPEED = 2.0; // radians per second
      const ACCELERATION = 3.0; // units per second squared
      const MAX_SPEED = 8.0; // units per second
      const DECELERATION = 5.0; // units per second squared
      
      // For player vehicles, handle rotation
      if (!vehicle.isAI) {
        // First rotate towards target
        const rotationDiff = targetRotation.current - currentRotation.current;
        const normalizedDiff = ((rotationDiff + Math.PI) % (2 * Math.PI)) - Math.PI;
        
        if (Math.abs(normalizedDiff) > 0.05) {
          // Still rotating
          currentRotation.current += Math.sign(normalizedDiff) * Math.min(ROTATION_SPEED * delta, Math.abs(normalizedDiff));
        } else {
          // Rotation complete, now move
          currentRotation.current = targetRotation.current;
        }
      }
      
      // Movement logic for both AI and player vehicles
      const distanceToTarget = currentPos.current.distanceTo(targetPos);
      const timeMoving = (Date.now() - moveStartTime.current) / 1000;
      
      // Check if we should continue moving (player vehicles wait for rotation, AI vehicles move from server)
      const rotationDiff = Math.abs(targetRotation.current - currentRotation.current);
      const canMove = vehicle.isAI || (!vehicle.isAI && rotationDiff <= 0.05);
      
      if (Math.random() < 0.1 && !vehicle.isAI) { // Log player vehicles more frequently
        console.log(`[Vehicle ${vehicle.id}] Movement state:`, {
          isMoving: isMoving.current,
          canMove,
          rotationDiff,
          distanceToTarget,
          currentPos: { x: currentPos.current.x, z: currentPos.current.z },
          targetPos: { x: targetPos.x, z: targetPos.z }
        });
      }
      
      if (canMove) {
        // Acceleration and deceleration phases
        let currentSpeed = 0;
        if (distanceToTarget > moveDistance.current * 0.3) {
          // Accelerating
          currentSpeed = Math.min(MAX_SPEED, timeMoving * ACCELERATION);
        } else {
          // Decelerating as we approach target
          currentSpeed = Math.max(0.5, MAX_SPEED * (distanceToTarget / (moveDistance.current * 0.3)));
        }
        
        // Move towards target
        if (distanceToTarget > 0.1) {
          const moveAmount = Math.min(currentSpeed * delta, distanceToTarget);
          const direction = targetPos.clone().sub(currentPos.current).normalize();
          currentPos.current.add(direction.multiplyScalar(moveAmount));
          
          // Update terrain height at new position
          const getHeight = (window as any).getTerrainHeight;
          if (getHeight) {
            const collisionHeight = getHeight(currentPos.current.x, currentPos.current.z);
            currentPos.current.y = (collisionHeight - 2.5) + vehicleHeightOffset; // Subtract collision offset for visual terrain
          }
        } else {
          // Reached destination
          isMoving.current = false;
          currentPos.current.copy(targetPos);
        }
      }
    }
    
    // Apply position
    groupRef.current.position.copy(currentPos.current);
    
    // Apply rotation - for AI vehicles, use server rotation directly
    if (vehicle.isAI && vehicle.rotation !== undefined) {
      groupRef.current.rotation.y = vehicle.rotation;
    } else {
      groupRef.current.rotation.y = currentRotation.current;
    }
    
    // Apply terrain angle rotation
    const getTerrainNormal = (window as any).getTerrainNormal;
    if (getTerrainNormal) {
      const normal = getTerrainNormal(currentPos.current.x, currentPos.current.z);
      
      // Calculate pitch and roll from terrain normal
      const pitch = Math.atan2(normal.z, normal.y); // Rotation around X axis
      const roll = Math.atan2(-normal.x, normal.y);  // Rotation around Z axis
      
      // Apply terrain tilt with some damping for smooth transitions
      const dampingFactor = 0.1;
      groupRef.current.rotation.x = THREE.MathUtils.lerp(groupRef.current.rotation.x, pitch, dampingFactor);
      groupRef.current.rotation.z = THREE.MathUtils.lerp(groupRef.current.rotation.z, roll, dampingFactor);
    }
    
    // Add slight bobbing motion when moving
    if (isMoving.current && vehicle.status === 'moving') {
      const bobAmount = Math.sin(state.clock.elapsedTime * 5) * 0.2; // Larger bob for bigger vehicle
      groupRef.current.position.y += bobAmount;
    }
    
    // Animate arrow indicator (only if player owns the vehicle)
    if (arrowRef.current && isOwnedByPlayer) {
      // Bounce animation - closer to vehicle
      arrowRef.current.position.y = 10 + Math.sin(state.clock.elapsedTime * 2) * 1;
      // Rotation animation
      arrowRef.current.rotation.y = state.clock.elapsedTime * 0.5;
      // Pulse scale animation
      const scale = 1 + Math.sin(state.clock.elapsedTime * 3) * 0.1;
      arrowRef.current.scale.set(scale, scale, scale);
    }
  });

  const handleClick = useCallback((event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation();
    
    // Don't allow selecting AI vehicles
    if (vehicle.isAI) {
      console.log(`[Vehicle ${vehicle.id}] AI vehicle - cannot select`);
      return;
    }
    
    // Only allow selecting vehicles owned by the current player
    if (!isOwnedByPlayer) {
      console.log(`[Vehicle ${vehicle.id}] Not owned by player - cannot select`);
      return;
    }
    
    selectVehicle(vehicle.id);
    
    // Trigger flash effect
    setIsFlashing(true);
    setTimeout(() => setIsFlashing(false), 300);
    
    console.log(`[Vehicle ${vehicle.id}] Clicked - selected`);
  }, [selectVehicle, vehicle.id, vehicle.isAI, isOwnedByPlayer]);

  return (
    <group ref={groupRef} position={[vehiclePosition.x, vehiclePosition.y, vehiclePosition.z]}>
      {/* Vehicle Model */}
      {adjustedScene ? (
        <primitive 
          ref={meshRef}
          object={adjustedScene}
          onClick={handleClick}
          onPointerOver={() => setHovered(true)}
          onPointerOut={() => setHovered(false)}
        />
      ) : (
        // Fallback mesh if model doesn't load - 4x larger
        <mesh 
          ref={meshRef}
          castShadow
          receiveShadow
          onClick={handleClick}
          onPointerOver={() => setHovered(true)}
          onPointerOut={() => setHovered(false)}
        >
          <boxGeometry args={[12, 8, 16]} />
          <meshStandardMaterial 
            color={isFlashing ? "#ffff00" : vehicleColor} 
            emissive={isFlashing ? "#ffff00" : vehicleColor}
            emissiveIntensity={isFlashing ? 1 : 0.1}
            metalness={0.8}
            roughness={0.3}
            envMapIntensity={1.0}
            // Add procedural bump for vehicle surface detail
            bumpScale={0.02}
          />
        </mesh>
      )}
      
      {/* Selection Ring - render on ground level - sized to 1.2x vehicle length */}
      {(isSelected || hovered) && (
        <mesh position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[
            boundingBoxData.size.z * 0.6,  // Inner radius: 60% of vehicle depth (length)
            boundingBoxData.size.z * 0.72, // Outer radius: 72% of vehicle depth (20% larger diameter)
            64
          ]} />
          <meshBasicMaterial 
            color={isSelected ? "#ff6b35" : "#ffff00"} 
            transparent 
            opacity={1}
            side={THREE.DoubleSide}
            depthTest={false}
            depthWrite={false}
          />
        </mesh>
      )}
      
      {/* Status indicator - show for selected vehicles or AI vehicles */}
      {(isSelected || vehicle.isAI) && (
        <>
          <Text
            position={[0, 12, 0]}
            fontSize={1.6}
            color="#ffffff"
            anchorX="center"
            anchorY="middle"
          >
            {vehicle.name} {vehicle.isAI ? '(AI)' : ''}
          </Text>
          
          <Text
            position={[0, 10, 0]}
            fontSize={1.2}
            color={vehicleColor}
            anchorX="center"
            anchorY="middle"
          >
            {vehicle.status.toUpperCase()}
          </Text>
        </>
      )}
      
      {/* Exhaust Smoke Effect - scaled for larger vehicle */}
      {isVehicleMoving && (
        <group position={[-6, 4, 0]}>
          {[...Array(5)].map((_, i) => (
            <mesh
              key={`smoke-${i}`}
              position={[
                Math.random() * 2 - 1,
                i * 1.2,
                Math.random() * 2 - 1
              ]}
            >
              <sphereGeometry args={[0.8 + i * 0.4, 8, 8]} />
              <meshBasicMaterial
                color="#333333"
                transparent
                opacity={0.4 - i * 0.08}
              />
            </mesh>
          ))}
        </group>
      )}
      
      {/* Dust Cloud Effect - scaled for larger vehicle */}
      {isVehicleMoving && (
        <group position={[0, 0.8, -8]}>
          {[...Array(8)].map((_, i) => (
            <mesh
              key={`dust-${i}`}
              position={[
                Math.sin(i * 0.8) * 6,
                Math.random() * 2,
                Math.cos(i * 0.8) * 6
              ]}
              rotation={[-Math.PI / 2, 0, 0]}
            >
              <planeGeometry args={[3.2, 3.2]} />
              <meshBasicMaterial
                color="#8B7355"
                transparent
                opacity={0.3 - i * 0.03}
                side={THREE.DoubleSide}
              />
            </mesh>
          ))}
        </group>
      )}
      
      {/* Debug: Visual Bounding Box */}
      {showBoundingBox && boundingBoxData && adjustedScene && (
        <mesh position={[0, boundingBoxData.size.y / 2, 0]}>
          <boxGeometry args={[boundingBoxData.size.x, boundingBoxData.size.y, boundingBoxData.size.z]} />
          <meshBasicMaterial color="#00ff00" wireframe transparent opacity={0.5} />
        </mesh>
      )}
      
      {/* Debug: Ground Contact Line */}
      {showBoundingBox && (
        <>
          {/* Green sphere shows pivot point (should be at ground level) */}
          <mesh position={[0, 0, 0]}>
            <sphereGeometry args={[0.5, 16, 16]} />
            <meshBasicMaterial color="#00ff00" />
          </mesh>
          
          {/* Yellow plane shows actual ground level */}
          <mesh position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[20, 0.1]} />
            <meshBasicMaterial color="#ffff00" />
          </mesh>
          
          {/* Text labels */}
          <Text
            position={[0, 3, 0]}
            fontSize={0.5}
            color="#00ff00"
            anchorX="center"
            anchorY="middle"
          >
            Pivot Point (Bottom Center)
          </Text>
          
          {/* Debug info text */}
          <Text
            position={[0, 20, 0]}
            fontSize={0.8}
            color="#ffffff"
            anchorX="center"
            anchorY="middle"
          >
            {`Pivot at Bottom Center | Manual Offset: ${manualOffset.toFixed(2)}`}
          </Text>
        </>
      )}
      
      {/* Animated Arrow Indicator - Only for player's own vehicles */}
      {isOwnedByPlayer && (
        <group ref={arrowRef} position={[0, 10, 0]}>
          <mesh rotation={[Math.PI, 0, 0]}>
            <coneGeometry args={[0.5, 1, 8]} />
            <meshBasicMaterial 
              color="#00ff00"
              transparent
              opacity={0.9}
            />
          </mesh>
          <mesh position={[0, 0.6, 0]}>
            <cylinderGeometry args={[0.25, 0.25, 1.2, 8]} />
            <meshBasicMaterial 
              color="#00ff00"
              transparent
              opacity={0.9}
            />
          </mesh>
          {/* Add subtle glow effect */}
          <pointLight 
            color="#00ff00"
            intensity={0.5} // Reduced to prevent light pollution
            distance={5} // Reduced range
            decay={2}
          />
          {/* Add smaller outer glow mesh */}
          <mesh>
            <sphereGeometry args={[0.8, 16, 16]} />
            <meshBasicMaterial 
              color="#00ff00"
              transparent
              opacity={0.2}
            />
          </mesh>
        </group>
      )}
      
      {/* Radar sweep effect for AI vehicles when idle (searching) */}
      {vehicle.isAI && vehicle.status === 'idle' && (
        <RadarSweep />
      )}
    </group>
  );
});

// PBR Environment Lighting Component - Optimized for lunar surface
function PBRLighting() {
  return (
    <>
      {/* HDR Environment Map for reflections and subtle ambient lighting */}
      <Environment
        files="/lighting/qwantani_dusk_2_4k.exr"
        background={false} // Don't use as background, keep space black
        blur={0.02}
        resolution={256} // Lower resolution for performance
        intensity={0.3} // Reduced intensity to act as ambient fill only
      />
      
      {/* Main sun light - strong directional light for lunar surface */}
      {/* Single strong light source like the sun on the moon */}
      <directionalLight
        position={[50, 100, 30]}
        intensity={1.5} // Reduced from 2 to avoid overexposure with HDRI
        color="#ffdd66" // Warm yellow sunlight
        castShadow
        shadow-mapSize={[4096, 4096]}
        shadow-camera-near={0.1}
        shadow-camera-far={500}
        shadow-camera-left={-100}
        shadow-camera-right={100}
        shadow-camera-top={100}
        shadow-camera-bottom={-100}
        shadow-bias={-0.0005}
      />
      
      {/* Very subtle fill light to soften harsh shadows */}
      <directionalLight
        position={[-30, 50, -20]}
        intensity={0.15} // Much lower to avoid double shadows
        color="#8899ff"
        castShadow={false} // No shadows from fill light
      />
      
      {/* Minimal ambient for complete darkness prevention */}
      <ambientLight intensity={0.05} color="#404060" /> {/* Lower and slightly blue for space feel */}
    </>
  );
}

// Dynamic Time-of-Day Lighting Component (keeping for reference but not using)
function DynamicLighting() {
  const lightRef = useRef<THREE.DirectionalLight>(null);
  const [timeOfDay] = useState(0.5); // Fixed at midday (0.5) for permanent daylight
  
  // Automatic time cycling disabled - keeping it permanently at midday
  /*
  useFrame((state, delta) => {
    setTimeOfDay(prev => {
      const dayDuration = 600; // 10 minutes in seconds
      const nightDuration = 60; // 1 minute in seconds
      const totalCycle = dayDuration + nightDuration; // 11 minutes total
      
      // Calculate current progress in the asymmetric cycle
      const cycleProgress = (prev + delta / totalCycle) % 1;
      
      // Map the asymmetric cycle to timeOfDay (0-1)
      const nightStart = dayDuration / totalCycle; // 10/11 = 0.909
      
      if (cycleProgress < nightStart) {
        // Day period: map 0 to 0.909 → 0 to 0.8 (day phases)
        return (cycleProgress / nightStart) * 0.8;
      } else {
        // Night period: map 0.909 to 1.0 → 0.8 to 1.0 (night phase)
        const nightProgress = (cycleProgress - nightStart) / (1 - nightStart);
        return 0.8 + nightProgress * 0.2;
      }
    });
  });
  */
  
  // Calculate sun position based on time of day
  const sunPosition = useMemo(() => {
    const angle = timeOfDay * Math.PI * 2 - Math.PI / 2; // Start at dawn
    const height = Math.sin(angle) * 0.8 + 0.2; // Keep sun slightly above horizon
    const x = Math.cos(angle) * 15;
    const y = Math.max(height * 20, 2); // Minimum height of 2
    const z = Math.sin(angle) * 8;
    return [x, y, z];
  }, [timeOfDay]);
  
  // Calculate lighting colors based on time of day
  const lightingColors = useMemo(() => {
    const progress = timeOfDay;
    
    // Define color periods
    let sunColor = '#ffffff';
    let ambientColor = '#606060';
    let intensity = 1;
    let ambientIntensity = 0.3;
    
    if (progress < 0.2) {
      // Dawn (0-0.2) - Warm orange/pink
      const t = progress / 0.2;
      sunColor = `hsl(${20 + t * 20}, 80%, ${50 + t * 30}%)`; // Orange to yellow
      ambientColor = `hsl(240, 40%, ${15 + t * 15}%)`; // Dark blue to lighter
      intensity = (0.4 + t * 0.8) * 5; // 5x brighter
      ambientIntensity = (0.2 + t * 0.2) * 5; // 5x brighter
    } else if (progress < 0.4) {
      // Morning (0.2-0.4) - Bright yellow/white
      const t = (progress - 0.2) / 0.2;
      sunColor = `hsl(${40 + t * 20}, ${80 - t * 30}%, ${80 + t * 20}%)`; // Yellow to white
      ambientColor = `hsl(${240 - t * 40}, ${40 - t * 20}%, ${30 + t * 20}%)`; // Blue to neutral
      intensity = (1.2 + t * 0.3) * 5; // 5x brighter
      ambientIntensity = (0.4 + t * 0.2) * 5; // 5x brighter
    } else if (progress < 0.6) {
      // Midday (0.4-0.6) - Bright white
      sunColor = '#ffffff';
      ambientColor = '#606060';
      intensity = 1.5 * 5; // 5x brighter
      ambientIntensity = 0.6 * 5; // 5x brighter
    } else if (progress < 0.8) {
      // Evening (0.6-0.8) - Warm orange/red
      const t = (progress - 0.6) / 0.2;
      sunColor = `hsl(${60 - t * 40}, ${50 + t * 40}%, ${100 - t * 30}%)`; // White to orange
      ambientColor = `hsl(${200 + t * 40}, ${20 + t * 30}%, ${50 - t * 20}%)`; // Neutral to purple
      intensity = (1.5 - t * 0.8) * 5; // 5x brighter
      ambientIntensity = (0.6 - t * 0.2) * 5; // 5x brighter
    } else { 
      // Night (0.8-1.0) - Cool blue/purple
      const t = (progress - 0.8) / 0.2;
      sunColor = `hsl(240, 60%, ${40 - t * 25}%)`; // Blue moon light
      ambientColor = `hsl(${240 + t * 20}, ${50 + t * 30}%, ${30 - t * 20}%)`; // Deep blue
      intensity = (0.7 - t * 0.4) * 5; // 5x brighter
      ambientIntensity = (0.4 - t * 0.2) * 5; // 5x brighter
    }
    
    return { sunColor, ambientColor, intensity, ambientIntensity };
  }, [timeOfDay]);
  
  // Update light reference when position changes
  useEffect(() => {
    if (lightRef.current) {
      lightRef.current.position.set(sunPosition[0], sunPosition[1], sunPosition[2]);
    }
  }, [sunPosition]);
  
  return (
    <>
      {/* Dynamic Ambient Light */}
      <ambientLight 
        intensity={lightingColors.ambientIntensity} 
        color={lightingColors.ambientColor} 
      />
      
      {/* Dynamic Sun/Moon Light */}
      <directionalLight 
        ref={lightRef}
        position={sunPosition as [number, number, number]}
        intensity={lightingColors.intensity}
        color={lightingColors.sunColor}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-near={0.1}
        shadow-camera-far={50}
        shadow-camera-left={-25}
        shadow-camera-right={25}
        shadow-camera-top={25}
        shadow-camera-bottom={-25}
      />
      
      {/* Secondary fill light for better visibility */}
      <directionalLight 
        position={[-5, 8, -5]}
        intensity={1.5} // 5x brighter (was 0.3)
        color="#b8d4ff"
        castShadow={false}
      />
      
      {/* Atmospheric Point Lights for Mining Theme */}
      <pointLight 
        position={[10, 3, 10]} 
        intensity={4.0} // 5x brighter (was 0.8)
        color="#ff6b35" 
        distance={20} 
        decay={2}
      />
      <pointLight 
        position={[-8, 3, -8]} 
        intensity={3.0} // 5x brighter (was 0.6)
        color="#4ecdc4" 
        distance={15} 
        decay={2}
      />
      
      {/* Debug: Time indicator (remove if not needed) */}
      <Text
        position={[0, 15, 0]}
        fontSize={2}
        color={lightingColors.sunColor}
        anchorX="center"
        anchorY="middle"
      >
        {`Time: ${Math.floor(timeOfDay * 24)}:${Math.floor((timeOfDay * 24 % 1) * 60).toString().padStart(2, '0')}`}
      </Text>
    </>
  );
}

// Isometric Camera Controller
function IsometricCameraController() {
  const { camera, gl } = useThree();
  
  useEffect(() => {
    // Set initial camera position for isometric view
    camera.position.set(25, 25, 25);
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
  }, [camera]);

  return (
    <OrbitControls
      camera={camera}
      domElement={gl.domElement}
      enablePan={true}
      enableZoom={true}
      enableRotate={true}
      // Constrain rotation for isometric feel
      minPolarAngle={Math.PI / 6}  // 30 degrees
      maxPolarAngle={Math.PI / 3}  // 60 degrees
      // Zoom limits
      minDistance={10}
      maxDistance={100}
      // Smooth controls with performance optimizations
      enableDamping={true}
      dampingFactor={0.05}
      // Performance optimizations
      screenSpacePanning={true}
      // Reduce update frequency for better performance
      rotateSpeed={0.5}
      zoomSpeed={0.8}
      panSpeed={0.8}
      // Add touch support optimizations
      touches={{
        ONE: 2, // ROTATE
        TWO: 1  // DOLLY_PAN
      }}
      // Passive event listeners configuration
      listenToKeyEvents={false} // Disable keyboard listeners for performance
    />
  );
}

// Interactive Ground Plane for Movement
const InteractiveGround = React.memo(({ showCollisionMesh }: { showCollisionMesh: boolean }) => {
  const isConnected = useGameConnection();
  const myPlayerId = useMyPlayerId();
  const selectedVehicleId = useSelectedVehicleId();
  const { moveVehicle } = useVehicleActions();
  const { movePlayer } = usePlayerActions();
  const [clickMarker, setClickMarker] = useState<{ x: number; z: number } | null>(null);

  const handleClick = useCallback((event: ThreeEvent<MouseEvent>) => {
    console.log('[InteractiveGround] ===== TERRAIN CLICKED =====');
    console.log('[InteractiveGround] Click point:', event.point);
    console.log('[InteractiveGround] Connected:', isConnected, 'PlayerId:', myPlayerId, 'SelectedVehicle:', selectedVehicleId);
    
    if (!isConnected || !myPlayerId) {
      console.log('[InteractiveGround] Not connected or no player ID');
      return;
    }
    
    const point = event.point;
    if (point) {
      // Show click marker
      setClickMarker({ x: point.x, z: point.z });
      setTimeout(() => setClickMarker(null), 1000);
      
      if (selectedVehicleId) {
        console.log(`[InteractiveGround] MOVING VEHICLE ${selectedVehicleId} to:`, point.x, point.z);
        // Move selected vehicle (Y=0 for ground level, Z for forward/back movement)
        moveVehicle(selectedVehicleId, point.x, 0, point.z);
      } else {
        console.log(`[InteractiveGround] Moving player to:`, point.x, point.z);
        // Move player (Y=0 for ground level, Z for forward/back movement)
        movePlayer(point.x, 0, point.z);
      }
    }
  }, [isConnected, myPlayerId, selectedVehicleId, moveVehicle, movePlayer]);

  return (
    <>
      {/* Terrain */}
      <Terrain onClick={handleClick} showCollisionMesh={showCollisionMesh} />
      
      {/* Invisible click plane for movement (above terrain) */}
      <mesh 
        rotation={[-Math.PI / 2, 0, 0]} 
        position={[0, 5, 0]}
        onClick={handleClick}
        visible={false}
      >
        <planeGeometry args={[400, 400]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>
      
      {/* Click marker */}
      {clickMarker && (
        <mesh position={[
          clickMarker.x, 
          (window as any).getTerrainHeight ? (window as any).getTerrainHeight(clickMarker.x, clickMarker.z) + 2 : 2, 
          clickMarker.z
        ]}>
          <sphereGeometry args={[1, 16, 16]} />
          <meshBasicMaterial color="#00ff00" emissive="#00ff00" emissiveIntensity={0.5} />
        </mesh>
      )}
    </>
  );
});

// Server Synced Ores Component
function ServerOres() {
  const gameState = useGameState() as AppGameState | null;
  const [localOres, setLocalOres] = useState<Array<{id: string, position: [number, number, number], rotation: [number, number, number]}>>([]);
  
  // Convert server ore nodes to local format
  useEffect(() => {
    if (!gameState?.oreNodes) {
      return;
    }
    
    const ores: Array<{id: string, position: [number, number, number], rotation: [number, number, number]}> = [];
    
    // Handle MapSchema properly
    if (gameState.oreNodes.forEach) {
      // It's a MapSchema
      gameState.oreNodes.forEach((ore: any, oreId: string) => {
        // Get terrain height at ore position
        const getHeight = (window as any).getTerrainHeight;
        const y = getHeight ? getHeight(ore.x, ore.z) + 0.5 : ore.y + 0.5;
        
        // Generate random rotation for variety
        const seed = oreId.charCodeAt(0) + oreId.charCodeAt(1) * 256;
        const rotationX = (seed % 100) / 100 * Math.PI * 2;
        const rotationY = ((seed * 7) % 100) / 100 * Math.PI * 2;
        const rotationZ = ((seed * 13) % 100) / 100 * Math.PI * 2;
        
        ores.push({
          id: oreId,
          position: [ore.x, y, ore.z] as [number, number, number],
          rotation: [rotationX, rotationY, rotationZ] as [number, number, number]
        });
      });
    } else {
      // Fallback to Object.entries
      Object.entries(gameState.oreNodes).forEach(([oreId, ore]) => {
        // Get terrain height at ore position
        const getHeight = (window as any).getTerrainHeight;
        const y = getHeight ? getHeight(ore.x, ore.z) + 0.5 : ore.y + 0.5;
        
        // Generate random rotation for variety
        const seed = oreId.charCodeAt(0) + oreId.charCodeAt(1) * 256;
        const rotationX = (seed % 100) / 100 * Math.PI * 2;
        const rotationY = ((seed * 7) % 100) / 100 * Math.PI * 2;
        const rotationZ = ((seed * 13) % 100) / 100 * Math.PI * 2;
        
        ores.push({
          id: oreId,
          position: [ore.x, y, ore.z] as [number, number, number],
          rotation: [rotationX, rotationY, rotationZ] as [number, number, number]
        });
      });
    }
    
    setLocalOres(ores);
    console.log(`[ServerOres] Synced ${ores.length} ore nodes from server`);
  }, [gameState?.oreNodes]);
  
  // Remove mined ore
  const handleOreMined = (oreId: string) => {
    // For server-synced ores, we don't handle removal locally
    // The server will update the ore state
    console.log(`[ServerOres] Ore ${oreId} mined - waiting for server update`);
  };
  
  return (
    <>
      {localOres && Array.isArray(localOres) && localOres.map(ore => (
        <Ore 
          key={ore.id}
          id={ore.id}
          position={ore.position}
          rotation={ore.rotation}
          onMined={handleOreMined}
        />
      ))}
    </>
  );
}

// Scene render counter
let sceneRenderCount = 0;

// Main Scene Component with better memoization
const Scene3D = React.memo(() => {
  const currentRender = ++sceneRenderCount;
  console.log(`\n[SCENE3D-${currentRender}] ========== Scene3D render START ==========`);
  
  // Track renders for infinite loop detection
  loopDetector.track('Scene3D');
  
  const isConnected = useGameConnection();
  const gameState = useGameState() as AppGameState | null;
  const myPlayerId = useMyPlayerId();
  const selectedVehicleId = useSelectedVehicleId();
  
  // Debug state for collision mesh visibility
  const [showCollisionMesh, setShowCollisionMesh] = useState(false);
  
  // Debug keyboard controls
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'c' || e.key === 'C') {
        setShowCollisionMesh(prev => !prev);
        console.log('[Scene3D] Collision mesh visibility toggled');
      }
    };
    
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  console.log(`[SCENE3D-${currentRender}] Props:`, {
    isConnected,
    hasGameState: !!gameState,
    myPlayerId,
    selectedVehicleId,
    playerCount: gameState?.players ? Object.keys(gameState.players).length : 0,
    vehicleCount: gameState?.vehicles ? Object.keys(gameState.vehicles).length : 0
  });

  // Memoize players and vehicles to prevent re-renders
  const players = useMemo(() => {
    try {
      if (!gameState?.players) {
        console.log(`[SCENE3D] No players in gameState`);
        return [];
      }
      
      // Handle MapSchema properly
      const playerArray: Array<[string, any]> = [];
      if (gameState.players.forEach) {
        // It's a MapSchema
        gameState.players.forEach((player: any, playerId: string) => {
          playerArray.push([playerId, player]);
        });
      } else {
        // Fallback to Object.entries
        Object.entries(gameState.players).forEach(([playerId, player]) => {
          playerArray.push([playerId, player]);
        });
      }
      
      console.log(`[SCENE3D] Total players found: ${playerArray.length}`);
      return playerArray;
    } catch (error) {
      console.error('[SCENE3D] Error processing players:', error);
      return [];
    }
  }, [gameState?.players]);
  
  const vehicles = useMemo(() => {
    try {
      if (!gameState?.vehicles) {
        console.log(`[SCENE3D] No vehicles in gameState`);
        return [];
      }
      
      console.log(`[SCENE3D] Processing vehicles, type:`, typeof gameState.vehicles);
      
      // Handle MapSchema properly
      const vehicleArray: Array<[string, any]> = [];
      if (gameState.vehicles.forEach) {
        // It's a MapSchema
        gameState.vehicles.forEach((vehicle: any, vehicleId: string) => {
          console.log(`[SCENE3D] Vehicle ${vehicleId}:`, vehicle);
          vehicleArray.push([vehicleId, vehicle]);
        });
      } else {
        // Fallback to Object.entries
        Object.entries(gameState.vehicles).forEach(([vehicleId, vehicle]) => {
          console.log(`[SCENE3D] Vehicle ${vehicleId}:`, vehicle);
          vehicleArray.push([vehicleId, vehicle]);
        });
      }
      
      console.log(`[SCENE3D] Total vehicles found: ${vehicleArray.length}`);
      return vehicleArray;
    } catch (error) {
      console.error('[SCENE3D] Error processing vehicles:', error);
      return [];
    }
  }, [gameState?.vehicles]);
  
  // Track when component effects run
  useEffect(() => {
    console.log(`[SCENE3D-${currentRender}] Component mounted`);
    return () => {
      console.log(`[SCENE3D-${currentRender}] Component unmounting`);
    };
  }, []);
  
  console.log(`[SCENE3D-${currentRender}] Rendering Canvas with ${Array.isArray(players) ? players.length : 0} players, ${Array.isArray(vehicles) ? vehicles.length : 0} vehicles`);

  // Ensure arrays are initialized
  const safePlayers = players || [];
  const safeVehicles = vehicles || [];

  // Add error boundary for Canvas
  try {
    return (
      <div style={{ width: '100%', height: '100%' }}>
        <Canvas
        shadows
        camera={{ 
          position: [10, 10, 10] as [number, number, number], 
          fov: 50
        }}
        style={{ background: 'linear-gradient(to bottom, #000000 0%, #0a0a0a 100%)' }}
        gl={{ preserveDrawingBuffer: true }}
        dpr={[1, 2]}
        onCreated={(state) => {
          console.log('[Scene3D] Canvas created - renderer:', state.gl);
        }}
        onError={(error) => {
          console.error('[Scene3D] Canvas error:', error);
        }}
      >
        {/* PBR Environment Lighting */}
        <PBRLighting />
        
        {/* Add fog for lunar atmosphere effect */}
        <fog attach="fog" args={['#000000', 50, 300] as [string, number, number]} />
        
        {/* Starfield background */}
        {typeof Stars !== 'undefined' && (
          <Stars 
            radius={300} 
            depth={50} 
            count={5000} 
            factor={4} 
            saturation={0} 
            fade 
            speed={0.5}
          />
        )}
        
        {/* Isometric Camera Controller */}
        <IsometricCameraController />
        
        {/* Grid */}
        {typeof Grid !== 'undefined' && (
          <Grid 
            args={[100, 100] as [number, number]} 
            position={[0, 0, 0] as [number, number, number]}
            cellSize={1}
            cellThickness={0.5}
            cellColor="#404040"
            sectionSize={10}
            sectionThickness={1}
            sectionColor="#606060"
            fadeDistance={50}
            fadeStrength={1}
            followCamera={false}
            infiniteGrid={true}
          />
        )}

        {/* Interactive Ground */}
        <InteractiveGround showCollisionMesh={showCollisionMesh} />
        
        {/* Server Synced Ores */}
        <ServerOres />
        
        {/* Render All Players */}
        {safePlayers && Array.isArray(safePlayers) && safePlayers.map(([playerId, playerData]) => {
          const player = playerData as Player;
          return (
            <PlayerAvatar
              key={playerId}
              player={player}
              isMe={playerId === myPlayerId}
            />
          );
        })}
        
        {/* Render All Vehicles */}
        {safeVehicles && Array.isArray(safeVehicles) && safeVehicles.map(([vehicleId, vehicleData]) => {
          const vehicle = vehicleData as Vehicle;
          const isMyVehicle = vehicle.ownerId === myPlayerId;
          return (
            <Vehicle
              key={vehicleId}
              vehicle={vehicle}
              isSelected={vehicleId === selectedVehicleId}
              isOwnedByPlayer={isMyVehicle}
            />
          );
        })}
        
        {/* Debug: Show test vehicle when connected but no vehicles */}
        {isConnected && Array.isArray(safeVehicles) && safeVehicles.length === 0 && (
          <group position={[0, 1, 0]}>
            <mesh castShadow receiveShadow>
              <boxGeometry args={[4, 2, 5]} />
              <meshStandardMaterial 
                color="#ff0000" 
                emissive="#ff0000"
                emissiveIntensity={0.5}
              />
            </mesh>
            <Text
              position={[0, 3, 0]}
              fontSize={0.5}
              color="#ffffff"
              anchorX="center"
              anchorY="middle"
            >
              DEBUG: No vehicles found!
            </Text>
          </group>
        )}
        
        {/* Demo Objects when not connected */}
        {!isConnected && (
          <>
            {/* Demo Mining Rig */}
            <mesh position={[5, 1, 5]} castShadow>
              <boxGeometry args={[2, 2, 3]} />
              <meshLambertMaterial color="#FFB000" />
            </mesh>
            
            {/* Demo Ore Node */}
            <mesh position={[-5, 0.5, -5]} castShadow>
              <octahedronGeometry args={[1]} />
              <meshLambertMaterial color="#8B4513" />
            </mesh>
            
            {/* Demo Text */}
            <Text
              position={[0, 5, 0]}
              fontSize={1}
              color="#ff6b35"
              anchorX="center"
              anchorY="middle"
            >
              Mining Gods MVP
            </Text>
            
            <Text
              position={[0, 3, 0]}
              fontSize={0.5}
              color="#ffffff"
              anchorX="center"
              anchorY="middle"
            >
              Connect to server to begin
            </Text>
          </>
        )}
      </Canvas>
      
      {/* Debug Overlay */}
      <div style={{
        position: 'absolute',
        top: 10,
        right: 10,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        color: 'white',
        padding: '10px',
        borderRadius: '5px',
        fontSize: '12px',
        fontFamily: 'monospace',
        pointerEvents: 'none'
      }}>
        <div>Debug Controls:</div>
        <div>Press 'C' - Toggle Collision Mesh {showCollisionMesh ? '(ON)' : '(OFF)'}</div>
        <div>Collision Offset: 2.0 units</div>
        <div>Displacement Scale: 1.5</div>
        <div>Manual Offset: 0.5</div>
      </div>
    </div>
  );
  } catch (error) {
    console.error('[SCENE3D] Error rendering Canvas:', error);
    return (
      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
        <div>
          <h2>Error loading 3D scene</h2>
          <p>{error?.message || 'Unknown error'}</p>
        </div>
      </div>
    );
  }
});

// Log when Scene3D is exported
console.log('[SCENE3D] Module loaded and Scene3D component defined');

export default Scene3D;
