import React, { useState, useEffect } from 'react';
import Scene3D from './Scene3D';
import { Box, CircularProgress } from '@mui/material';

/**
 * Wrapper to ensure React Three Fiber is properly initialized before rendering Scene3D
 */
const Scene3DWrapper: React.FC = () => {
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  useEffect(() => {
    // Delay rendering to ensure all dependencies are loaded
    const timer = setTimeout(() => {
      try {
        // Check if WebGL is available
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        
        if (!gl) {
          throw new Error('WebGL not supported');
        }
        
        // Ensure window.devicePixelRatio is defined
        if (typeof window.devicePixelRatio === 'undefined') {
          (window as any).devicePixelRatio = 1;
        }
        
        setIsReady(true);
      } catch (err) {
        console.error('[Scene3DWrapper] Initialization error:', err);
        setError(err as Error);
      }
    }, 100); // Small delay to ensure DOM is ready
    
    return () => clearTimeout(timer);
  }, []);
  
  if (error) {
    return (
      <Box sx={{ 
        width: '100%', 
        height: '100%', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        bgcolor: '#000',
        color: '#fff'
      }}>
        <div>
          <h2>3D Scene Error</h2>
          <p>{error.message}</p>
        </div>
      </Box>
    );
  }
  
  if (!isReady) {
    return (
      <Box sx={{ 
        width: '100%', 
        height: '100%', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        bgcolor: '#000'
      }}>
        <CircularProgress />
      </Box>
    );
  }
  
  return <Scene3D />;
};

export default Scene3DWrapper;