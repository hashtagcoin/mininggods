import React from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { useGameState, useGameConnection } from '../store/gameStore';

const Scene3DMinimal = React.memo(() => {
  const isConnected = useGameConnection();
  const gameState = useGameState();
  
  console.log('[Scene3DMinimal] Rendering with connection:', isConnected);
  
  return (
    <div style={{ width: '100%', height: '100%', background: '#000' }}>
      <Canvas>
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 5]} intensity={1} />
        <OrbitControls />
        
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial color="orange" />
        </mesh>
        
        <mesh position={[0, -50, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[200, 200]} />
          <meshStandardMaterial color="#222" />
        </mesh>
      </Canvas>
    </div>
  );
});

export default Scene3DMinimal;