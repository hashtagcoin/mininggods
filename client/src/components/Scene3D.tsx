import { useRef, useState, useEffect, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import type { ThreeEvent } from '@react-three/fiber';
import { OrbitControls, Grid, Text, useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { useGameStore } from '../store/gameStore';

// Player Avatar Component
function PlayerAvatar({ 
  player, 
  isMe = false 
}: { 
  player: { id: string; name: string; x: number; y: number; credits: number }, 
  isMe?: boolean 
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  
  // Animate the player slightly for visual feedback
  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.position.y = player.y + Math.sin(state.clock.elapsedTime * 2) * 0.1;
    }
  });

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
      
      {/* Player Name Label */}
      <Text
        position={[0, 3, 0]}
        fontSize={0.5}
        color={isMe ? '#ff6b35' : '#ffffff'}
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
    </group>
  );
}

// Terrain Component - More mountainous terrain
function Terrain() {
  const meshRef = useRef<THREE.Mesh>(null);
  
  // Terrain parameters - more mountainous
  const worldWidth = 128;
  const worldDepth = 128;
  const terrainSize = 200; // Physical size of terrain
  
  // Generate height data using enhanced noise for more mountains
  const generateHeightData = (width: number, height: number) => {
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
    
    return () => {
      // Cleanup on unmount
      delete (window as any).getTerrainHeight;
    };
  }, [heightData, worldWidth, worldDepth, terrainSize]);
  
  // Generate terrain geometry
  const terrainGeometry = useMemo(() => {
    const geometry = new THREE.PlaneGeometry(
      terrainSize, 
      terrainSize, 
      worldWidth - 1, 
      worldDepth - 1
    );
    
    geometry.rotateX(-Math.PI / 2); // Make it horizontal
    
    const vertices = geometry.attributes.position.array as Float32Array;
    
    // Apply height data to vertices
    for (let i = 0, j = 0; i < heightData.length; i++, j += 3) {
      vertices[j + 1] = heightData[i]; // Y coordinate
    }
    
    geometry.computeVertexNormals(); // Recalculate normals for proper lighting
    
    return geometry;
  }, [heightData]);

  return (
    <mesh 
      ref={meshRef}
      receiveShadow
      position={[0, 0, 0]}
    >
      <primitive object={terrainGeometry} />
      <meshLambertMaterial 
        map={useMemo(() => {
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
          
          return texture;
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
  onMined 
}: { 
  id: string;
  position: [number, number, number];
  onMined: (id: string) => void;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const groupRef = useRef<THREE.Group>(null);
  const [miningProgress, setMiningProgress] = useState(1.0); // 1.0 = full, 0.0 = depleted
  const [isMining, setIsMining] = useState(false);
  
  // Load ore model
  const { scene } = useGLTF('/ore1.glb');
  
  // Mine the ore when touched by miner
  useFrame((state, delta) => {
    if (isMining && miningProgress > 0) {
      setMiningProgress(prev => {
        const newProgress = Math.max(0, prev - delta * 0.2); // Mine at 20% per second
        if (newProgress <= 0) {
          onMined(id); // Notify parent to remove this ore
        }
        return newProgress;
      });
    }
    
    // Update visual scale based on mining progress
    if (groupRef.current) {
      const scale = 0.5 + (miningProgress * 0.5); // Scale from 0.5 to 1.0
      groupRef.current.scale.set(scale, scale, scale);
    }
  });
  
  // Check for miner collision
  const checkMinerCollision = () => {
    const vehicles = useGameStore.getState().vehicles;
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
  };
  
  useFrame(() => {
    checkMinerCollision();
  });
  
  const clonedScene = useMemo(() => scene.clone(), [scene]);
  
  return (
    <group 
      ref={groupRef}
      position={position}
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
          Billboard
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
function Vehicle({ 
  vehicle, 
  isSelected = false 
}: { 
  vehicle: { id: string; name: string; x: number; y: number; z: number; type: string; status: string }, 
  isSelected?: boolean 
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const groupRef = useRef<THREE.Group>(null);
  const { selectVehicle, selectedVehicleId } = useGameStore();
  const [hovered, setHovered] = useState(false);
  
  // Load GLB model from public directory
  const { scene } = useGLTF('/miner2.glb');
  
  // Get terrain height at vehicle position
  const getTerrainHeightAt = (x: number, z: number): number => {
    const getHeight = (window as any).getTerrainHeight;
    if (getHeight) {
      return getHeight(x, z);
    }
    return 0; // Fallback if terrain not ready
  };
  
  // Local position and rotation state for smooth interpolation
  const [currentPos, setCurrentPos] = useState(() => ({
    x: vehicle.x,
    y: getTerrainHeightAt(vehicle.x, vehicle.z) + 0.5, // Hug terrain with small offset
    z: vehicle.z
  }));
  
  const [currentRotation, setCurrentRotation] = useState(0);
  const [targetRotation, setTargetRotation] = useState(0);
  const [isRotating, setIsRotating] = useState(false);
  const [movementPhase, setMovementPhase] = useState<'idle' | 'rotating' | 'moving'>('idle');

  // Calculate target rotation when vehicle position changes
  useEffect(() => {
    const deltaX = vehicle.x - currentPos.x;
    const deltaZ = vehicle.z - currentPos.z;
    
    // Only update rotation if vehicle is actually moving
    if (Math.abs(deltaX) > 0.1 || Math.abs(deltaZ) > 0.1) {
      const angle = Math.atan2(deltaX, deltaZ);
      setTargetRotation(angle);
      setMovementPhase('rotating'); // Start with rotation phase
    } else {
      setMovementPhase('idle');
    }
  }, [vehicle.x, vehicle.z]);

  // Turn-then-move logic with constant velocity
  useFrame((state, delta) => {
    if (groupRef.current) {
      const rotationLerpFactor = 0.12; // Faster rotation for crisp turning
      const movementSpeed = 8.0; // Constant movement speed (units per second)
      
      // Sample terrain height at current vehicle position
      const terrainHeight = getTerrainHeightAt(currentPos.x, currentPos.z);
      const targetY = terrainHeight + 0.5; // Small offset to sit on terrain surface
      
      if (movementPhase === 'rotating') {
        // Phase 1: Rotate on the spot until facing destination
        setCurrentRotation(prev => {
          let angleDiff = targetRotation - prev;
          
          // Handle angle wrapping (shortest path)
          if (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
          if (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;
          
          const newRotation = prev + angleDiff * rotationLerpFactor;
          
          // Check if rotation is complete (within 0.1 radians)
          if (Math.abs(angleDiff) < 0.1) {
            setMovementPhase('moving'); // Switch to movement phase
          }
          
          return newRotation;
        });
        
        // Don't move position while rotating
        setCurrentPos(prev => ({
          ...prev,
          y: THREE.MathUtils.lerp(prev.y, targetY, 0.05) // Still follow terrain height
        }));
        
      } else if (movementPhase === 'moving') {
        // Phase 2: Move forward at constant velocity
        const deltaX = vehicle.x - currentPos.x;
        const deltaZ = vehicle.z - currentPos.z;
        const distance = Math.sqrt(deltaX * deltaX + deltaZ * deltaZ);
        
        if (distance > 0.1) {
          // Move at constant velocity toward target
          const moveDistance = movementSpeed * delta;
          const normalizedDeltaX = (deltaX / distance) * moveDistance;
          const normalizedDeltaZ = (deltaZ / distance) * moveDistance;
          
          setCurrentPos(prev => ({
            x: prev.x + normalizedDeltaX,
            y: THREE.MathUtils.lerp(prev.y, targetY, 0.05),
            z: prev.z + normalizedDeltaZ
          }));
        } else {
          // Arrived at destination
          setCurrentPos(prev => ({
            x: vehicle.x,
            y: THREE.MathUtils.lerp(prev.y, targetY, 0.05),
            z: vehicle.z
          }));
          setMovementPhase('idle');
        }
      } else {
        // Phase 3: Idle - just follow terrain height
        setCurrentPos(prev => ({
          x: vehicle.x,
          y: THREE.MathUtils.lerp(prev.y, targetY, 0.05),
          z: vehicle.z
        }));
      }
      
      groupRef.current.position.set(currentPos.x, currentPos.y, currentPos.z);
      groupRef.current.rotation.y = currentRotation;
    }
  });

  const handleClick = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation();
    selectVehicle(vehicle.id);
  };

  // Vehicle type colors
  const getVehicleColor = (type: string) => {
    switch (type.toLowerCase()) {
      case 'miner': return '#ff9800'; // Orange
      case 'hauler': return '#2196f3'; // Blue  
      case 'scout': return '#9c27b0'; // Purple
      default: return '#4caf50'; // Green
    }
  };

  // Clone the scene to avoid modifying the original
  const clonedScene = useMemo(() => scene.clone(), [scene]);

  return (
    <group 
      ref={groupRef}
      onClick={handleClick}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
      scale={[2, 2, 2]} // Double the size (2x larger)
    >
      {/* Vehicle Model */}
      <primitive 
        ref={meshRef}
        object={clonedScene}
        castShadow
        receiveShadow
      />
      
      {/* Selection Ring */}
      {(isSelected || selectedVehicleId === vehicle.id) && (
        <mesh position={[0, -0.1, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[1.5, 2, 32]} />
          <meshBasicMaterial color="#00ff00" transparent opacity={0.5} />
        </mesh>
      )}
      
      {/* Hover Ring */}
      {hovered && (
        <mesh position={[0, -0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[1.2, 1.8, 32]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.3} />
        </mesh>
      )}
      
      {/* Vehicle Name Label */}
      <Text
        position={[0, 3, 0]} // Higher up since vehicle is 2x larger
        fontSize={0.4} // Slightly larger text
        color={getVehicleColor(vehicle.type)}
        anchorX="center"
        anchorY="middle"
        Billboard
      >
        {vehicle.name}
      </Text>
      
      {/* Status Indicator */}
      <Text
        position={[0, 2.5, 0]} // Adjusted for larger vehicle
        fontSize={0.25}
        color={vehicle.status === 'idle' ? '#ffeb3b' : '#4caf50'}
        anchorX="center"
        anchorY="middle"
        Billboard
      >
        {vehicle.status}
      </Text>
    </group>
  );
}

// Dynamic Time-of-Day Lighting Component
function DynamicLighting() {
  const lightRef = useRef<THREE.DirectionalLight>(null);
  const [timeOfDay, setTimeOfDay] = useState(0); // 0-1 representing 24 hour cycle
  
  // Automatically cycle through time of day (11 minute cycle: 10 min day + 1 min night)
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
    let ambientColor = '#404040';
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
      lightRef.current.position.set(...sunPosition);
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
        position={sunPosition}
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
      // Smooth controls
      enableDamping={true}
      dampingFactor={0.05}
      // Disable auto-rotate
      autoRotate={false}
    />
  );
}

// Interactive Ground Plane for Movement
function InteractiveGround() {
  const { moveVehicle, movePlayer, selectedVehicleId, isConnected, myPlayerId } = useGameStore();
  
  const handleClick = (event: ThreeEvent<MouseEvent>) => {
    if (!isConnected || !myPlayerId) return;
    
    const point = event.point;
    if (point) {
      if (selectedVehicleId) {
        // Move selected vehicle (Y=0 for ground level, Z for forward/back movement)
        moveVehicle(selectedVehicleId, point.x, 0, point.z);
      } else {
        // Move player (Y=0 for ground level, Z for forward/back movement)
        movePlayer(point.x, 0, point.z);
      }
    }
  };

  return (
    <>
      {/* Terrain */}
      <Terrain />
      
      {/* Invisible click plane for movement (above terrain) */}
      <mesh 
        rotation={[-Math.PI / 2, 0, 0]} 
        position={[0, 0.1, 0]}
        onClick={handleClick}
        visible={false}
      >
        <planeGeometry args={[200, 200]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>
    </>
  );
}

// Scattered Ores Component
function ScatteredOres() {
  const [ores, setOres] = useState<Array<{id: string, position: [number, number, number]}>>([]);
  
  // Generate random ore positions on terrain
  useEffect(() => {
    const generateOres = () => {
      const oreCount = 15; // Number of ore deposits
      const newOres = [];
      
      for (let i = 0; i < oreCount; i++) {
        // Random position within terrain bounds
        const x = (Math.random() - 0.5) * 180; // Slightly within terrain bounds
        const z = (Math.random() - 0.5) * 180;
        
        // Get terrain height at this position
        const getHeight = (window as any).getTerrainHeight;
        const y = getHeight ? getHeight(x, z) + 0.5 : 0.5;
        
        newOres.push({
          id: `ore_${i}`,
          position: [x, y, z] as [number, number, number]
        });
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
          onMined={handleOreMined}
        />
      ))}
    </>
  );
}

// Main Scene Component
function Scene3D() {
  const { gameState, myPlayerId, isConnected, selectedVehicleId } = useGameStore();

  return (
    <div style={{ width: '100%', height: '100%' }}>
      <Canvas
        shadows
        camera={{ 
          position: [10, 10, 10], 
          fov: 50
        }}
        style={{ background: 'linear-gradient(to bottom, #1a1a2e 0%, #0f0f23 100%)' }}
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
        {isConnected && gameState?.players && Array.from(gameState.players.entries()).map(([playerId, player]) => (
          <PlayerAvatar 
            key={playerId}
            player={player}
            isMe={playerId === myPlayerId}
          />
        ))}
        
        {/* Render All Vehicles */}
        {isConnected && gameState?.vehicles && Array.from(gameState.vehicles.entries()).map(([vehicleId, vehicle]) => (
          <Vehicle 
            key={vehicleId}
            vehicle={vehicle}
            isSelected={vehicleId === selectedVehicleId}
          />
        ))}
        
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
              position={[0, 3.5, 0]}
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
}

export default Scene3D;
