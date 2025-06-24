import React from 'react';
import { Canvas } from '@react-three/fiber';
import { Box } from '@react-three/drei';

const MinimalCanvas: React.FC = () => {
  console.log('[MinimalCanvas] Rendering');
  
  try {
    return (
      <div style={{ width: '100%', height: '400px', background: '#000' }}>
        <Canvas>
          <ambientLight intensity={0.5} />
          <directionalLight position={[10, 10, 5]} intensity={1} />
          <Box position={[0, 0, 0]}>
            <meshStandardMaterial color="orange" />
          </Box>
        </Canvas>
      </div>
    );
  } catch (error) {
    console.error('[MinimalCanvas] Error:', error);
    return <div>Error in MinimalCanvas: {error?.message}</div>;
  }
};

export default MinimalCanvas;