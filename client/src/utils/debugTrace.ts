// Debug utility to trace undefined.length errors

export const safeLength = (arr: any, name: string): number => {
  if (arr === undefined) {
    console.error(`[DEBUG] ${name} is undefined`);
    return 0;
  }
  if (arr === null) {
    console.error(`[DEBUG] ${name} is null`);
    return 0;
  }
  if (!Array.isArray(arr)) {
    // Check if it's a MapSchema or similar object with length property
    if (arr && typeof arr === 'object' && 'length' in arr) {
      return arr.length;
    }
    console.error(`[DEBUG] ${name} is not an array, type: ${typeof arr}`);
    return 0;
  }
  return arr.length;
};

// Safe array check
export const isValidArray = (arr: any): arr is Array<any> => {
  return Array.isArray(arr) && arr !== null && arr !== undefined;
};

// Safe object keys
export const safeObjectKeys = (obj: any, name: string): string[] => {
  if (!obj || typeof obj !== 'object') {
    console.error(`[DEBUG] ${name} is not a valid object:`, obj);
    return [];
  }
  try {
    return Object.keys(obj);
  } catch (e) {
    console.error(`[DEBUG] Error getting keys from ${name}:`, e);
    return [];
  }
};

// Safe filter operation
export const safeFilter = <T>(arr: T[] | undefined | null, name: string, predicate: (item: T) => boolean): T[] => {
  if (!isValidArray(arr)) {
    console.error(`[DEBUG] Cannot filter ${name} - not a valid array:`, arr);
    return [];
  }
  try {
    return arr.filter(predicate);
  } catch (e) {
    console.error(`[DEBUG] Error filtering ${name}:`, e);
    return [];
  }
};

// Wrap array operations with error handling
export const safeMap = <T, R>(arr: T[] | undefined | null, name: string, fn: (item: T, index: number) => R): R[] => {
  if (!arr) {
    console.error(`[DEBUG] Cannot map over ${name} - it is ${arr}`);
    return [];
  }
  if (!Array.isArray(arr)) {
    console.error(`[DEBUG] Cannot map over ${name} - not an array, type: ${typeof arr}`);
    return [];
  }
  try {
    return arr.map(fn);
  } catch (e) {
    console.error(`[DEBUG] Error mapping ${name}:`, e);
    return [];
  }
};

// Debug wrapper for components
export const debugComponent = (name: string, renderFn: () => JSX.Element | null): JSX.Element | null => {
  try {
    console.log(`[DEBUG] Rendering component: ${name}`);
    return renderFn();
  } catch (e) {
    console.error(`[DEBUG] Error in component ${name}:`, e);
    return null;
  }
};