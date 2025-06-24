import React, { useRef, useState, useMemo, useCallback, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import type { ThreeEvent } from '@react-three/fiber';
import { OrbitControls, Text, useGLTF, Grid } from '@react-three/drei';
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
  players: Record<string, Player>;
  vehicles: Record<string, Vehicle>;
  oreNodes?: Record<string, any>;
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
  
  return (
    <group position={[player.x, player.y, 0]}>
      {/* Player Cube */}
      <mesh ref={meshRef} castShadow>
        <boxGeometry args={[1, 2, 1]} />
        <meshLambertMaterial 
          color={isMe ? '#ff6b35' : '#4CAF50'} 
          emissive={isMe ? '#ff6b35' : '#4CAF50'} 
          emissiveIntensity={0.2}
        />
      </mesh>
      
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

// Terrain Component - More mountainous terrain
function Terrain() {
  const meshRef = useRef<THREE.Mesh>(null);
  
  console.log('[Terrain] Component rendering');
  
  // Terrain parameters - more mountainous
  const worldWidth = 128;
  const worldDepth = 128;
  const terrainSize = 200; // Physical size of terrain
  
  // Generate height data using enhanced noise for more mountains
  const generateHeightData = (width: number, height: number) => {
    console.log('[Terrain] Generating height data - width:', width, 'height:', height);
    const size = width * height;
    const data = new Float32Array(size);
    
    // Enhanced noise function with multiple octaves for mountainous terrain
    const noise = (x: number, y: number) => {
      // Multiple octaves for more complex mountainous terrain
      const octave1 = Math.sin(x * 0.05) * Math.cos(y * 0.05) * 1.0;  // Large hills
      const octave2 = Math.sin(x * 0.1) * Math.cos(y * 0.1) * 0.5;    // Medium hills
      const octave3 = Math.sin(x * 0.2) * Math.cos(y * 0.2) * 0.25;   // Small details
      const octave4 = Math.sin(x * 0.4) * Math.cos(y * 0.4) * 0.125;  // Fine details
      
      return octave1 + octave2 + octave3 + octave4;
    };
    
    for (let i = 0; i < size; i++) {
      const x = i % width;
      const y = Math.floor(i / width);
      // More dramatic height variations (max ~12 units high instead of 3)
      data[i] = noise(x, y) * 6.0; // Much more mountainous
    }
    
    console.log('[Terrain] Height data generated - sample values:', data[0], data[100], data[1000]);
    return data;
  };
  
  // Store height data for vehicle sampling
  const heightData = useMemo(() => generateHeightData(worldWidth, worldDepth), []);
  
  // Expose terrain height sampling function globally
  useEffect(() => {
    // Store the height sampling function on window for vehicle access
    (window as any).getTerrainHeight = (x: number, z: number): number => {
      // Convert world coordinates to terrain grid coordinates
      const gridX = Math.floor(((x + terrainSize / 2) / terrainSize) * worldWidth);
      const gridZ = Math.floor(((z + terrainSize / 2) / terrainSize) * worldDepth);
      
      // Clamp to terrain bounds
      const clampedX = Math.max(0, Math.min(worldWidth - 1, gridX));
      const clampedZ = Math.max(0, Math.min(worldDepth - 1, gridZ));
      
      // Get height from data array
      const index = clampedZ * worldWidth + clampedX;
      return heightData[index] || 0;
    };
    
    // Function to calculate terrain normal at a position
    (window as any).getTerrainNormal = (x: number, z: number): THREE.Vector3 => {
      const delta = 1.0; // Sample distance
      
      // Get heights at nearby points
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
      // Cleanup on unmount
      delete (window as any).getTerrainHeight;
      delete (window as any).getTerrainNormal;
    };
  }, [heightData, worldWidth, worldDepth, terrainSize]);
  
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
      
      const vertices = geometry.attributes.position.array as Float32Array;
      console.log('[Terrain] Vertices length:', vertices.length, 'heightData length:', heightData.length);
      
      // Apply height data to vertices
      for (let i = 0, j = 0; i < heightData.length; i++, j += 3) {
        vertices[j + 1] = heightData[i]; // Y coordinate
      }
      
      geometry.computeVertexNormals(); // Recalculate normals for proper lighting
      console.log('[Terrain] Geometry created successfully');
      
      return geometry;
    } catch (error) {
      console.error('[Terrain] Error creating geometry:', error);
      throw error;
    }
  }, [heightData]);

  return (
    <mesh 
      ref={meshRef}
      receiveShadow
      position={[0, 0, 0]}
      onError={(error) => {
        console.error('[Terrain] Mesh rendering error:', error);
      }}
    >
      <primitive object={terrainGeometry} />
      <meshLambertMaterial 
        map={useMemo(() => {
          console.log('[Terrain] Creating terrain texture');
          try {
            const canvas = document.createElement('canvas');
            canvas.width = worldWidth;
            canvas.height = worldDepth;
            const context = canvas.getContext('2d')!;
            
            const imageData = context.createImageData(worldWidth, worldDepth);
            const data = imageData.data;
            
            // Generate a simple dirt/rock texture
            for (let i = 0; i < data.length; i += 4) {
              const noise = Math.random() * 0.3 + 0.4; // Random variation
              data[i] = Math.floor(101 * noise);     // R - brownish
              data[i + 1] = Math.floor(67 * noise);  // G
              data[i + 2] = Math.floor(33 * noise);  // B
              data[i + 3] = 255;                     // A
            }
            
            context.putImageData(imageData, 0, 0);
            
            const texture = new THREE.CanvasTexture(canvas);
            texture.wrapS = THREE.RepeatWrapping;
            texture.wrapT = THREE.RepeatWrapping;
            texture.repeat.set(4, 4); // Tile the texture
            
            console.log('[Terrain] Texture created successfully');
            return texture;
          } catch (error) {
            console.error('[Terrain] Error creating texture:', error);
            throw error;
          }
        }, [])}
        side={THREE.DoubleSide}
      />
    </mesh>
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
        <mesh ref={meshRef} castShadow>
          <octahedronGeometry args={[1]} />
          <meshLambertMaterial color="#8B4513" />
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

// Vehicle Component with Turn-Then-Move Logic
const Vehicle = React.memo(({ 
  vehicle, 
  isSelected = false 
}: { 
  vehicle: { id: string; name: string; x: number; y: number; z: number; type: string; status: string }, 
  isSelected?: boolean 
}) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const groupRef = useRef<THREE.Group>(null);
  const arrowRef = useRef<THREE.Group>(null);
  const { selectVehicle } = useVehicleActions();
  const optimisticPosition = useGameStore(state => state.optimisticVehiclePositions[vehicle.id]);
  const [hovered, setHovered] = useState(false);
  const [isVehicleMoving, setIsVehicleMoving] = useState(false);
  const [isFlashing, setIsFlashing] = useState(false);
  
  // Debug log vehicle data
  console.log(`[Vehicle ${vehicle.id}] Rendering at:`, { x: vehicle.x, y: vehicle.y, z: vehicle.z, type: vehicle.type });
  
  // Load GLB model from public directory
  // Note: useGLTF is a hook and must not be called conditionally
  const gltf = useGLTF('/miner2.glb');
  const scene = gltf?.scene;
  
  // Get vehicle position with optimistic updates
  const vehiclePosition = useMemo(() => {
    const basePos = optimisticPosition 
      ? { x: optimisticPosition.x, y: vehicle.y, z: optimisticPosition.z }
      : { x: vehicle.x, y: vehicle.y, z: vehicle.z };
    
    // Get terrain height at vehicle position
    const getHeight = (window as any).getTerrainHeight;
    if (getHeight) {
      const terrainHeight = getHeight(basePos.x, basePos.z);
      basePos.y = terrainHeight + 0.07; // Small offset to keep vehicle above ground
    }
    
    return basePos;
  }, [vehicle.x, vehicle.y, vehicle.z, optimisticPosition]);
  
  // Memoize vehicle color calculation
  const vehicleColor = useMemo(() => {
    switch (vehicle.type) {
      case 'miner': return '#FF6B35';
      case 'hauler': return '#2196F3';
      case 'scout': return '#9C27B0';
      default: return '#757575';
    }
  }, [vehicle.type]);
  
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
      const terrainHeight = getHeight(vehiclePosition.x, vehiclePosition.z);
      currentPos.current.set(vehiclePosition.x, terrainHeight + 0.07, vehiclePosition.z);
    }
  }, []); // Only on mount
  
  // Update current position ref when vehicle position changes
  useEffect(() => {
    const newTargetPos = new THREE.Vector3(vehiclePosition.x, vehiclePosition.y, vehiclePosition.z);
    const currentPosVec = new THREE.Vector3(currentPos.current.x, currentPos.current.y, currentPos.current.z);
    
    // Calculate distance and rotation to target
    const dx = newTargetPos.x - currentPosVec.x;
    const dz = newTargetPos.z - currentPosVec.z;
    const distance = Math.sqrt(dx * dx + dz * dz);
    
    if (distance > 0.1) { // Only move if distance is significant
      isMoving.current = true;
      moveStartTime.current = Date.now();
      moveDistance.current = distance;
      
      // Calculate target rotation (facing direction of movement)
      targetRotation.current = Math.atan2(dx, dz);
    }
  }, [vehiclePosition.x, vehiclePosition.y, vehiclePosition.z]);
  
  useFrame((state, delta) => {
    if (!groupRef.current) return;
    
    const targetPos = new THREE.Vector3(vehiclePosition.x, vehiclePosition.y, vehiclePosition.z);
    
    // Update moving state for particles
    setIsVehicleMoving(isMoving.current);
    
    if (isMoving.current) {
      // Realistic vehicle movement parameters
      const ROTATION_SPEED = 2.0; // radians per second
      const ACCELERATION = 3.0; // units per second squared
      const MAX_SPEED = 8.0; // units per second
      const DECELERATION = 5.0; // units per second squared
      
      // First rotate towards target
      const rotationDiff = targetRotation.current - currentRotation.current;
      const normalizedDiff = ((rotationDiff + Math.PI) % (2 * Math.PI)) - Math.PI;
      
      if (Math.abs(normalizedDiff) > 0.05) {
        // Still rotating
        currentRotation.current += Math.sign(normalizedDiff) * Math.min(ROTATION_SPEED * delta, Math.abs(normalizedDiff));
      } else {
        // Rotation complete, now move
        currentRotation.current = targetRotation.current;
        
        // Calculate current speed based on distance to target
        const distanceToTarget = currentPos.current.distanceTo(targetPos);
        const timeMoving = (Date.now() - moveStartTime.current) / 1000;
        
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
            currentPos.current.y = getHeight(currentPos.current.x, currentPos.current.z) + 0.07;
          }
        } else {
          // Reached destination
          isMoving.current = false;
          currentPos.current.copy(targetPos);
        }
      }
    }
    
    // Apply position and rotation
    groupRef.current.position.copy(currentPos.current);
    groupRef.current.rotation.y = currentRotation.current;
    
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
    
    // Animate arrow indicator
    if (arrowRef.current) {
      // Bounce animation - higher and more visible
      arrowRef.current.position.y = 30 + Math.sin(state.clock.elapsedTime * 2) * 5;
      // Rotation animation
      arrowRef.current.rotation.y = state.clock.elapsedTime * 0.5;
      // Pulse scale animation
      const scale = 1 + Math.sin(state.clock.elapsedTime * 3) * 0.1;
      arrowRef.current.scale.set(scale, scale, scale);
    }
  });

  const handleClick = useCallback((event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation();
    selectVehicle(vehicle.id);
    
    // Trigger flash effect
    setIsFlashing(true);
    setTimeout(() => setIsFlashing(false), 300);
    
    console.log(`[Vehicle ${vehicle.id}] Clicked - selected`);
  }, [selectVehicle, vehicle.id]);

  return (
    <group ref={groupRef} position={[vehiclePosition.x, vehiclePosition.y, vehiclePosition.z]}>
      {/* Vehicle Model */}
      {scene ? (
        <primitive 
          ref={meshRef}
          object={scene}
          scale={[2, 2, 2]}
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
            emissiveIntensity={isFlashing ? 1 : 0.2}
            metalness={0.6}
            roughness={0.4}
          />
        </mesh>
      )}
      
      {/* Selection Ring - render on ground level - larger for 4x vehicle */}
      {(isSelected || hovered) && (
        <mesh position={[0, -4, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[14, 18, 64]} />
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
      
      {/* Status indicator - only for selected vehicles - positioned higher for larger vehicle */}
      {isSelected && (
        <>
          <Text
            position={[0, 12, 0]}
            fontSize={1.6}
            color="#ffffff"
            anchorX="center"
            anchorY="middle"
          >
            {vehicle.name}
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
      
      {/* Animated Arrow Indicator - Always visible */}
      <group ref={arrowRef} position={[0, 25, 0]}>
        <mesh rotation={[Math.PI, 0, 0]}>
          <coneGeometry args={[5, 10, 8]} />
          <meshBasicMaterial 
            color="#00ff00"
            transparent
            opacity={0.9}
          />
        </mesh>
        <mesh position={[0, 6, 0]}>
          <cylinderGeometry args={[2.5, 2.5, 12, 8]} />
          <meshBasicMaterial 
            color="#00ff00"
            transparent
            opacity={0.9}
          />
        </mesh>
        {/* Add brighter glow effect */}
        <pointLight 
          color="#00ff00"
          intensity={5}
          distance={50}
          decay={1}
        />
        {/* Add outer glow mesh */}
        <mesh>
          <sphereGeometry args={[8, 16, 16]} />
          <meshBasicMaterial 
            color="#00ff00"
            transparent
            opacity={0.2}
          />
        </mesh>
      </group>
    </group>
  );
});

// Dynamic Time-of-Day Lighting Component
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
const InteractiveGround = React.memo(() => {
  const isConnected = useGameConnection();
  const myPlayerId = useMyPlayerId();
  const selectedVehicleId = useSelectedVehicleId();
  const { moveVehicle } = useVehicleActions();
  const { movePlayer } = usePlayerActions();

  const handleClick = useCallback((event: ThreeEvent<MouseEvent>) => {
    console.log('[InteractiveGround] Clicked at:', event.point);
    console.log('[InteractiveGround] Connected:', isConnected, 'PlayerId:', myPlayerId, 'SelectedVehicle:', selectedVehicleId);
    
    if (!isConnected || !myPlayerId) {
      console.log('[InteractiveGround] Not connected or no player ID');
      return;
    }
    
    const point = event.point;
    if (point) {
      if (selectedVehicleId) {
        console.log(`[InteractiveGround] Moving vehicle ${selectedVehicleId} to:`, point.x, point.z);
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
      <Terrain />
      
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
    </>
  );
});

// Scattered Ores Component
function ScatteredOres() {
  const [ores, setOres] = useState<Array<{id: string, position: [number, number, number], rotation: [number, number, number]}>>([]);
  
  // Generate clumped ore positions on terrain
  useEffect(() => {
    const generateOres = () => {
      const clumpCount = 5; // Number of ore clumps
      const oresPerClump = 8; // Number of ores in each clump
      const clumpRadius = 6; // Radius of each clump
      const newOres = [];
      let oreId = 0;
      
      for (let clump = 0; clump < clumpCount; clump++) {
        // Random center position for each clump within terrain bounds
        const centerX = (Math.random() - 0.5) * 160; // Keep clumps away from edges
        const centerZ = (Math.random() - 0.5) * 160;
        
        // Generate ores within this clump
        for (let ore = 0; ore < oresPerClump; ore++) {
          // Position ores in a circular pattern around the center
          const angle = (ore / oresPerClump) * Math.PI * 2;
          const distance = Math.random() * clumpRadius;
          
          // Add some randomness to avoid perfect circles
          const randomOffset = (Math.random() - 0.5) * 2;
          
          const x = centerX + Math.cos(angle) * distance + randomOffset;
          const z = centerZ + Math.sin(angle) * distance + randomOffset;
          
          // Get terrain height at this position
          const getHeight = (window as any).getTerrainHeight;
          const y = getHeight ? getHeight(x, z) + 0.5 : 0.5;
          
          // Generate random rotation for variety
          const rotationX = Math.random() * Math.PI * 2;
          const rotationY = Math.random() * Math.PI * 2;
          const rotationZ = Math.random() * Math.PI * 2;
          
          newOres.push({
            id: `ore_${oreId++}`,
            position: [x, y, z] as [number, number, number],
            rotation: [rotationX, rotationY, rotationZ] as [number, number, number]
          });
        }
      }
      
      setOres(newOres);
    };
    
    // Wait a bit for terrain to initialize
    const timer = setTimeout(generateOres, 1000);
    return () => clearTimeout(timer);
  }, []);
  
  // Remove mined ore
  const handleOreMined = (oreId: string) => {
    setOres(prev => prev.filter(ore => ore.id !== oreId));
  };
  
  return (
    <>
      {ores.map(ore => (
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
    if (!gameState?.players) {
      console.log(`[SCENE3D-${currentRender}] No players in gameState`);
      return [];
    }
    
    // Handle MapSchema properly
    const playerArray = [];
    if (gameState.players.forEach) {
      // It's a MapSchema
      gameState.players.forEach((player, playerId) => {
        playerArray.push([playerId, player]);
      });
    } else {
      // Fallback to Object.entries
      Object.entries(gameState.players).forEach(([playerId, player]) => {
        playerArray.push([playerId, player]);
      });
    }
    
    console.log(`[SCENE3D-${currentRender}] Total players found: ${playerArray.length}`);
    return playerArray;
  }, [gameState?.players]);
  
  const vehicles = useMemo(() => {
    if (!gameState?.vehicles) {
      console.log(`[SCENE3D-${currentRender}] No vehicles in gameState`);
      return [];
    }
    
    console.log(`[SCENE3D-${currentRender}] Processing vehicles, type:`, typeof gameState.vehicles);
    
    // Handle MapSchema properly
    const vehicleArray = [];
    if (gameState.vehicles.forEach) {
      // It's a MapSchema
      gameState.vehicles.forEach((vehicle, vehicleId) => {
        console.log(`[SCENE3D-${currentRender}] Vehicle ${vehicleId}:`, vehicle);
        vehicleArray.push([vehicleId, vehicle]);
      });
    } else {
      // Fallback to Object.entries
      Object.entries(gameState.vehicles).forEach(([vehicleId, vehicle]) => {
        console.log(`[SCENE3D-${currentRender}] Vehicle ${vehicleId}:`, vehicle);
        vehicleArray.push([vehicleId, vehicle]);
      });
    }
    
    console.log(`[SCENE3D-${currentRender}] Total vehicles found: ${vehicleArray.length}`);
    return vehicleArray;
  }, [gameState?.vehicles]);
  
  // Track when component effects run
  useEffect(() => {
    console.log(`[SCENE3D-${currentRender}] Component mounted`);
    return () => {
      console.log(`[SCENE3D-${currentRender}] Component unmounting`);
    };
  }, []);
  
  console.log(`[SCENE3D-${currentRender}] Rendering Canvas with ${players.length} players, ${vehicles.length} vehicles`);

  return (
    <div style={{ width: '100%', height: '100%' }}>
      <Canvas
        shadows
        camera={{ 
          position: [10, 10, 10], 
          fov: 50
        }}
        style={{ background: 'linear-gradient(to bottom, #1a1a2e 0%, #0f0f23 100%)' }}
        onCreated={(state) => {
          console.log('[Scene3D] Canvas created - renderer:', state.gl);
        }}
        onError={(error) => {
          console.error('[Scene3D] Canvas error:', error);
        }}
      >
        {/* Dynamic Time-of-Day Lighting */}
        <DynamicLighting />
        
        {/* Isometric Camera Controller */}
        <IsometricCameraController />
        
        {/* Grid */}
        <Grid 
          args={[100, 100]} 
          position={[0, 0, 0]}
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

        {/* Interactive Ground */}
        <InteractiveGround />
        
        {/* Scattered Ores */}
        <ScatteredOres />
        
        {/* Render All Players */}
        {players.map(([playerId, playerData]) => {
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
        {vehicles.map(([vehicleId, vehicleData]) => {
          const vehicle = vehicleData as Vehicle;
          return (
            <Vehicle
              key={vehicleId}
              vehicle={vehicle}
              isSelected={vehicleId === selectedVehicleId}
            />
          );
        })}
        
        {/* Debug: Show test vehicle when connected but no vehicles */}
        {isConnected && vehicles.length === 0 && (
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
    </div>
  );
});

// Log when Scene3D is exported
console.log('[SCENE3D] Module loaded and Scene3D component defined');

export default Scene3D;
