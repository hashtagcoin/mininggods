import { useRef, useState, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import type { ThreeEvent } from '@react-three/fiber';
import { OrbitControls, Grid, Text } from '@react-three/drei';
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

// Vehicle Component
function Vehicle({ 
  vehicle, 
  isSelected = false 
}: { 
  vehicle: { id: string; name: string; x: number; y: number; z: number; type: string; status: string }, 
  isSelected?: boolean 
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const { selectVehicle, selectedVehicleId } = useGameStore();
  const [hovered, setHovered] = useState(false);
  
  // Animate the vehicle slightly for visual feedback
  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.position.y = vehicle.y + Math.sin(state.clock.elapsedTime * 3) * 0.05;
    }
  });

  const handleClick = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation();
    selectVehicle(isSelected ? null : vehicle.id);
  };

  // Vehicle colors by type
  const getVehicleColor = () => {
    switch (vehicle.type) {
      case 'miner': return '#ff6b35';
      case 'hauler': return '#2196f3';
      case 'scout': return '#9c27b0';
      default: return '#4caf50';
    }
  };

  return (
    <group position={[vehicle.x, vehicle.y, vehicle.z]}>
      {/* Vehicle Body */}
      <mesh 
        ref={meshRef} 
        castShadow
        onClick={handleClick}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        <boxGeometry args={[2, 1, 3]} />
        <meshLambertMaterial 
          color={getVehicleColor()} 
          emissive={isSelected ? '#ffffff' : hovered ? '#333333' : '#000000'} 
          emissiveIntensity={isSelected ? 0.3 : hovered ? 0.1 : 0}
        />
      </mesh>
      
      {/* Selection Ring */}
      {isSelected && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.4, 0]}>
          <ringGeometry args={[2, 2.5, 16]} />
          <meshBasicMaterial color="#ff6b35" transparent opacity={0.8} />
        </mesh>
      )}
      
      {/* Vehicle Name Label */}
      <Text
        position={[0, 2, 0]}
        fontSize={0.4}
        color={isSelected ? '#ff6b35' : '#ffffff'}
        anchorX="center"
        anchorY="middle"
      >
        {vehicle.name}
      </Text>
      
      {/* Status Indicator */}
      <Text
        position={[0, 1.5, 0]}
        fontSize={0.25}
        color={vehicle.status === 'mining' ? '#4caf50' : vehicle.status === 'moving' ? '#ff9800' : '#757575'}
        anchorX="center"
        anchorY="middle"
      >
        {vehicle.status.toUpperCase()}
      </Text>
    </group>
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
  const { movePlayer, moveVehicle, isConnected, myPlayerId, selectedVehicleId } = useGameStore();
  const [hovered, setHovered] = useState(false);
  
  const handleClick = (event: ThreeEvent<MouseEvent>) => {
    if (!isConnected || !myPlayerId) return;
    
    const point = event.point;
    if (point) {
      if (selectedVehicleId) {
        // Move selected vehicle
        console.log(`Moving vehicle ${selectedVehicleId} to: ${point.x}, ${point.z}`);
        moveVehicle(selectedVehicleId, point.x, point.z, 0);
      } else {
        // Move player
        console.log(`Moving player to: ${point.x}, ${point.z}`);
        movePlayer(point.x, point.z, 0);
      }
    }
  };

  return (
    <mesh 
      rotation={[-Math.PI / 2, 0, 0]} 
      position={[0, -0.5, 0]}
      onClick={handleClick}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
    >
      <planeGeometry args={[100, 100]} />
      <meshLambertMaterial 
        color={hovered ? '#2a5934' : '#1a4d23'} 
        transparent 
        opacity={0.8}
      />
    </mesh>
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
        {/* Lighting Setup */}
        <ambientLight intensity={0.3} color="#404040" />
        <directionalLight 
          position={[10, 10, 5]} 
          intensity={1}
          color="#ffffff"
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
          shadow-camera-near={0.1}
          shadow-camera-far={50}
          shadow-camera-left={-20}
          shadow-camera-right={20}
          shadow-camera-top={20}
          shadow-camera-bottom={-20}
        />
        
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
        />
        
        {/* Interactive Ground */}
        <InteractiveGround />
        
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
