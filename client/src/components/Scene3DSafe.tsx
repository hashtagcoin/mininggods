import React, { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { ErrorBoundary } from 'react-error-boundary';
import { Box, CircularProgress } from '@mui/material';

// Fallback component for loading
const LoadingFallback = () => (
  <Box sx={{ 
    width: '100%', 
    height: '100%', 
    display: 'flex', 
    alignItems: 'center', 
    justifyContent: 'center',
    bgcolor: '#000',
    color: '#fff'
  }}>
    <CircularProgress />
  </Box>
);

// Error fallback component
const ErrorFallback = ({ error, resetErrorBoundary }: any) => (
  <Box sx={{ 
    width: '100%', 
    height: '100%', 
    display: 'flex', 
    alignItems: 'center', 
    justifyContent: 'center',
    bgcolor: '#000',
    color: '#fff',
    flexDirection: 'column',
    gap: 2,
    p: 4
  }}>
    <h2>3D Scene Error</h2>
    <pre style={{ color: '#ff6b35' }}>{error.message}</pre>
    <button onClick={resetErrorBoundary}>Try again</button>
  </Box>
);

// Safe Canvas wrapper
export const Scene3DSafe: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <ErrorBoundary
      FallbackComponent={ErrorFallback}
      onError={(error, errorInfo) => {
        console.error('[Scene3DSafe] Error caught:', error);
        console.error('[Scene3DSafe] Error info:', errorInfo);
      }}
    >
      <Suspense fallback={<LoadingFallback />}>
        <Canvas
          shadows
          camera={{ 
            position: [10, 10, 10], 
            fov: 50
          }}
          onCreated={(state) => {
            console.log('[Scene3DSafe] Canvas created');
          }}
          onError={(error) => {
            console.error('[Scene3DSafe] Canvas error:', error);
          }}
        >
          {children}
        </Canvas>
      </Suspense>
    </ErrorBoundary>
  );
};