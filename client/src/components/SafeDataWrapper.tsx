import React from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';

interface SafeDataWrapperProps {
  data: any;
  dataName: string;
  children: React.ReactNode;
  requiredArrays?: string[];
}

/**
 * Wrapper component that ensures data is properly loaded before rendering children.
 * Prevents undefined.length errors by validating data structure.
 */
export const SafeDataWrapper: React.FC<SafeDataWrapperProps> = ({ 
  data, 
  dataName, 
  children, 
  requiredArrays = [] 
}) => {
  // Check if data exists
  if (!data) {
    console.warn(`[SafeDataWrapper] ${dataName} is not loaded yet`);
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', p: 2 }}>
        <CircularProgress size={24} />
        <Typography sx={{ ml: 2 }}>Loading {dataName}...</Typography>
      </Box>
    );
  }

  // Validate required arrays
  for (const arrayName of requiredArrays) {
    const arrayData = data[arrayName];
    
    if (arrayData === undefined || arrayData === null) {
      console.error(`[SafeDataWrapper] Required array ${arrayName} is undefined in ${dataName}`);
      return (
        <Box sx={{ p: 2, color: 'error.main' }}>
          <Typography>Error: {arrayName} data not available</Typography>
        </Box>
      );
    }
    
    // Check if it's a valid array or MapSchema
    const isValidArray = Array.isArray(arrayData);
    const isMapSchema = arrayData && typeof arrayData === 'object' && 'forEach' in arrayData;
    
    if (!isValidArray && !isMapSchema) {
      console.error(`[SafeDataWrapper] ${arrayName} in ${dataName} is not a valid array or MapSchema:`, typeof arrayData);
      return (
        <Box sx={{ p: 2, color: 'error.main' }}>
          <Typography>Error: {arrayName} data is invalid</Typography>
        </Box>
      );
    }
  }

  // All checks passed, render children
  return <>{children}</>;
};

// Higher-order component version
export function withSafeData<P extends object>(
  Component: React.ComponentType<P>,
  dataName: string,
  requiredArrays: string[] = []
) {
  return (props: P & { data?: any }) => {
    return (
      <SafeDataWrapper 
        data={props.data} 
        dataName={dataName} 
        requiredArrays={requiredArrays}
      >
        <Component {...props} />
      </SafeDataWrapper>
    );
  };
}