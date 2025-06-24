import type { GameState } from '../services/GameClient';

/**
 * Helper function to get vehicle position with optimistic updates
 * Returns safe default position instead of null to prevent crashes
 */
export const getVehiclePosition = (
  vehicleId: string, 
  gameState: GameState | null, 
  optimisticPositions: Record<string, { x: number; z: number }>
) => {
  // Check optimistic positions first
  const optimistic = optimisticPositions[vehicleId];
  if (optimistic && gameState?.vehicles?.[vehicleId]) {
    return {
      x: optimistic.x,
      y: gameState.vehicles[vehicleId].y ?? 0,
      z: optimistic.z
    };
  }
  
  // Check game state for vehicle
  const vehicle = gameState?.vehicles?.[vehicleId];
  if (vehicle) {
    return {
      x: vehicle.x ?? 0,
      y: vehicle.y ?? 0,
      z: vehicle.z ?? 0
    };
  }
  
  // Return safe default position instead of null to prevent crashes
  return {
    x: 0,
    y: 0,
    z: 0
  };
};

/**
 * Helper function to get player position with optimistic updates
 */
export const getPlayerPosition = (
  playerId: string, 
  gameState: GameState | null, 
  optimisticPositions: Record<string, { x: number; z: number }>
) => {
  // Check optimistic positions first
  const optimistic = optimisticPositions[playerId];
  if (optimistic && gameState?.players?.[playerId]) {
    return {
      x: optimistic.x,
      y: gameState.players[playerId].y ?? 0,
      z: optimistic.z
    };
  }
  
  // Check game state for player
  const player = gameState?.players?.[playerId];
  if (player) {
    return {
      x: player.x ?? 0,
      y: player.y ?? 0,
      z: 0  // Players are always at z=0
    };
  }
  
  // Return safe default position
  return {
    x: 0,
    y: 0,
    z: 0
  };
};
