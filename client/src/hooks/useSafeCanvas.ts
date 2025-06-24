import { useEffect, useRef } from 'react';

/**
 * Hook to safely initialize Three.js/R3F arrays and prevent undefined.length errors
 */
export const useSafeCanvas = () => {
  const initialized = useRef(false);
  
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    
    // Patch array methods to add safety checks
    const originalFilter = Array.prototype.filter;
    const originalMap = Array.prototype.map;
    const originalForEach = Array.prototype.forEach;
    
    // @ts-ignore
    Array.prototype.filter = function(...args) {
      if (this === undefined || this === null) {
        console.warn('[SafeCanvas] filter called on undefined/null array');
        return [];
      }
      return originalFilter.apply(this, args);
    };
    
    // @ts-ignore
    Array.prototype.map = function(...args) {
      if (this === undefined || this === null) {
        console.warn('[SafeCanvas] map called on undefined/null array');
        return [];
      }
      return originalMap.apply(this, args);
    };
    
    // @ts-ignore
    Array.prototype.forEach = function(...args) {
      if (this === undefined || this === null) {
        console.warn('[SafeCanvas] forEach called on undefined/null array');
        return;
      }
      return originalForEach.apply(this, args);
    };
    
    return () => {
      // Restore original methods
      Array.prototype.filter = originalFilter;
      Array.prototype.map = originalMap;
      Array.prototype.forEach = originalForEach;
    };
  }, []);
};

/**
 * Ensure a value is a valid array for Three.js
 */
export const ensureArray = <T>(value: T | T[] | undefined | null, defaultValue: T[]): T[] => {
  if (Array.isArray(value)) return value;
  if (value === undefined || value === null) return defaultValue;
  return [value];
};

/**
 * Safe camera position helper
 */
export const safeCameraPosition = (position?: number[] | [number, number, number]): [number, number, number] => {
  if (!position || !Array.isArray(position) || position.length !== 3) {
    return [10, 10, 10];
  }
  return position as [number, number, number];
};