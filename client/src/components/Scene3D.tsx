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

// Isometric Camera Controller
function IsometricCameraController() {
  const { camera, gl } = useThree();
  
  useEffect(() => {
    // Set up isometric camera position and angle
    camera.position.set(10, 10, 10);
    camera.lookAt(0, 0, 0);
    
    // Use orthographic camera for true isometric view
    if (camera instanceof THREE.PerspectiveCamera) {
      const aspect = gl.domElement.clientWidth / gl.domElement.clientHeight;
      const newCamera = new THREE.OrthographicCamera(
        -10 * aspect, 10 * aspect,
        10, -10,
        0.1, 1000
      );
      newCamera.position.copy(camera.position);
      newCamera.lookAt(0, 0, 0);
    }
  }, [camera, gl]);

  return null;
}

// Interactive Ground Plane for Movement
function InteractiveGround() {
  const { movePlayer, isConnected, myPlayerId } = useGameStore();
  const [hovered, setHovered] = useState(false);
  
  const handleClick = (event: ThreeEvent<MouseEvent>) => {
    if (!isConnected || !myPlayerId) return;
    
    const point = event.point;
    if (point) {
      console.log(`Moving player to: ${point.x}, ${point.z}`);
      movePlayer(point.x, point.z, 0);
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
  const { gameState, myPlayerId, isConnected } = useGameStore();

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
        
        {/* Camera Controls */}
        <OrbitControls 
          enablePan={true}
          enableZoom={true}
          enableRotate={true}
          maxPolarAngle={Math.PI / 2}
          minDistance={5}
          maxDistance={50}
          target={[0, 0, 0]}
        />
        
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
