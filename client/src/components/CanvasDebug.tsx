import React from 'react';
import { Canvas } from '@react-three/fiber';

export const CanvasDebug: React.FC = () => {
  console.log('[CanvasDebug] Starting render');
  
  // Test 1: Minimal canvas
  try {
    console.log('[CanvasDebug] Test 1: Empty canvas');
    return (
      <div style={{ width: '100%', height: '400px' }}>
        <Canvas>
          <ambientLight />
        </Canvas>
      </div>
    );
  } catch (e) {
    console.error('[CanvasDebug] Test 1 failed:', e);
  }
  
  // Test 2: Canvas with camera
  try {
    console.log('[CanvasDebug] Test 2: Canvas with camera prop');
    return (
      <div style={{ width: '100%', height: '400px' }}>
        <Canvas camera={{ position: [0, 0, 5] }}>
          <ambientLight />
        </Canvas>
      </div>
    );
  } catch (e) {
    console.error('[CanvasDebug] Test 2 failed:', e);
  }
  
  // Test 3: Canvas with position array
  try {
    console.log('[CanvasDebug] Test 3: Canvas with position array');
    const position = [0, 0, 5];
    return (
      <div style={{ width: '100%', height: '400px' }}>
        <Canvas camera={{ position }}>
          <ambientLight />
        </Canvas>
      </div>
    );
  } catch (e) {
    console.error('[CanvasDebug] Test 3 failed:', e);
  }
  
  return <div>All Canvas tests failed</div>;
};