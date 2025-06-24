import React, { useRef, useMemo, useCallback } from 'react';
import { Canvas } from '@react-three/fiber';
import { Box, Card, styled, IconButton, Typography } from '@mui/material';
import { Add as ZoomInIcon, Remove as ZoomOutIcon } from '@mui/icons-material';
import { Text } from '@react-three/drei';
import * as THREE from 'three';
import type { Player, Vehicle } from '../services/GameClient';
import { 
  useGameState, 
  useMyPlayerId, 
  useSelectedVehicleId, 
  useVehicleActions,
  usePlayerActions
} from '../store/gameStore';
import { CanvasErrorBoundary } from './ErrorBoundary';

// Type for the actual game state structure used in the app
interface AppGameState {
  players: Record<string, Player> | any; // Can be MapSchema or plain object
  vehicles: Record<string, Vehicle> | any; // Can be MapSchema or plain object
  oreNodes: Record<string, any> | any;
  worldSeed?: number;
  tick: number;
}

// Styled components for consistent UI
const MinimapContainer = styled(Card)(() => ({
  position: 'fixed',
  top: 20,
  right: 20,
  width: 350,
  height: 400,
  backgroundColor: 'rgba(0, 0, 0, 0.9)',
  backdropFilter: 'blur(10px)',
  border: '2px solid rgba(255, 255, 255, 0.2)',
  borderRadius: '12px',
  overflow: 'hidden',
  zIndex: 1000,
  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
}));

const MinimapHeader = styled(Box)(() => ({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '8px 16px',
  background: 'rgba(255, 255, 255, 0.05)',
  borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
}));

const MinimapCanvas = styled(Box)(() => ({
  height: '280px',
  position: 'relative',
  overflow: 'hidden',
  background: 'radial-gradient(ellipse at center, rgba(20, 20, 40, 0.8) 0%, rgba(10, 10, 20, 0.95) 100%)',
}));

const MinimapControls = styled(Box)(() => ({
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  padding: '8px',
  background: 'rgba(255, 255, 255, 0.05)',
  borderTop: '1px solid rgba(255, 255, 255, 0.1)',
}));

// Minimap Vehicle Component
const MinimapVehicle = React.memo(({ 
  vehicle, 
  isSelected = false, 
  worldBounds,
  onClick 
}: { 
  vehicle: Vehicle,
  isSelected?: boolean,
  worldBounds: { minX: number; maxX: number; minZ: number; maxZ: number },
  onClick: (vehicleId: string) => void
}) => {
  const meshRef = useRef<THREE.Mesh>(null);
  
  // Get vehicle position with optimistic updates
  const vehiclePosition = useMemo(() => {
    return { x: vehicle.x || 0, y: vehicle.y || 0, z: vehicle.z || 0 };
  }, [vehicle.x, vehicle.y, vehicle.z]);

  // Convert world position to minimap coordinates
  const minimapPosition = useMemo(() => {
    // Ensure bounds are valid
    const xRange = worldBounds.maxX - worldBounds.minX;
    const zRange = worldBounds.maxZ - worldBounds.minZ;
    
    if (xRange === 0 || zRange === 0) {
      console.warn('[Minimap] Invalid world bounds, using default position');
      return [0, 0.2, 0] as [number, number, number];
    }
    
    const normalizedX = (vehiclePosition.x - worldBounds.minX) / xRange;
    const normalizedZ = (vehiclePosition.z - worldBounds.minZ) / zRange;
    
    const mapX = (normalizedX - 0.5) * 9;
    const mapZ = (normalizedZ - 0.5) * 9;
    
    // Debug log occasionally to avoid spam
    if (Math.random() < 0.01) {
      console.log(`[Minimap Vehicle ${vehicle.id}] World pos: (${vehiclePosition.x}, ${vehiclePosition.z}) -> Minimap pos: (${mapX}, ${mapZ})`);
    }
    
    return [mapX, 0.2, mapZ] as [number, number, number];
  }, [vehiclePosition, worldBounds, vehicle.id]);

  const handleClick = useCallback((event: any) => {
    event.stopPropagation();
    onClick(vehicle.id);
  }, [onClick, vehicle.id]);

  // Get color based on vehicle type and AI status
  const getVehicleColor = (type: string) => {
    // AI vehicles have a distinct color
    if (vehicle.isAI) {
      return '#00ff00'; // Bright green for AI
    }
    
    switch (type) {
      case 'miner': return '#ff6b35';
      case 'hauler': return '#4dabf7';
      case 'scout': return '#ae3ec9';
      default: return '#69db7c';
    }
  };

  // Get vehicle shape based on type
  const getVehicleGeometry = (type: string) => {
    switch (type) {
      case 'miner':
        return <boxGeometry args={[0.6, 0.3, 0.6]} />; // Square for miners
      case 'hauler':
        return <cylinderGeometry args={[0.4, 0.4, 0.3, 6]} />; // Hexagon for haulers
      case 'scout':
        return <coneGeometry args={[0.4, 0.4, 4]} />; // Diamond for scouts
      default:
        return <sphereGeometry args={[0.4, 8, 8]} />; // Sphere for others
    }
  };

  return (
    <group position={minimapPosition}>
      {/* Glow effect for better visibility */}
      <mesh position={[0, 0, 0]}>
        <sphereGeometry args={[0.8, 16, 16]} />
        <meshBasicMaterial 
          color={getVehicleColor(vehicle.type)} 
          transparent 
          opacity={0.2} 
        />
      </mesh>
      
      {/* Main vehicle shape */}
      <mesh 
        ref={meshRef}
        onClick={handleClick}
        onPointerOver={() => document.body.style.cursor = 'pointer'}
        onPointerOut={() => document.body.style.cursor = 'default'}
      >
        {getVehicleGeometry(vehicle.type)}
        <meshStandardMaterial 
          color={getVehicleColor(vehicle.type)} 
          emissive={getVehicleColor(vehicle.type)}
          emissiveIntensity={isSelected ? 0.8 : 0.4}
          metalness={0.8}
          roughness={0.2}
        />
      </mesh>
      
      {/* Selection indicator - pulsing ring */}
      {isSelected && (
        <mesh position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.6, 0.8, 32]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.9} />
        </mesh>
      )}
      
      {/* Status indicator - larger and clearer */}
      <mesh position={[0.4, 0.4, 0]}>
        <sphereGeometry args={[0.15, 16, 16]} />
        <meshBasicMaterial 
          color={vehicle.status === 'active' ? '#00ff00' : '#ffaa00'} 
        />
      </mesh>
      
      {/* Vehicle name label */}
      <Text
        position={[0, 0.8, 0]}
        fontSize={0.25}
        color="#ffffff"
        anchorX="center"
        anchorY="middle"
        strokeWidth={'2%'}
        strokeColor="#000000"
        outlineWidth={0.1}
        outlineColor="#000000"
      >
        {vehicle.name} {vehicle.isAI ? '(AI)' : ''}
      </Text>
    </group>
  );
});

// Minimap Player Component
const MinimapPlayer = React.memo(({ 
  player, 
  isMe = false,
  worldBounds 
}: { 
  player: Player,
  isMe?: boolean,
  worldBounds: { minX: number; maxX: number; minZ: number; maxZ: number }
}) => {
  // Convert world position to minimap coordinates
  const minimapPosition = useMemo(() => {
    const playerX = player.x || 0;
    const playerZ = 0; // Players are always at ground level (z=0)
    
    const normalizedX = (playerX - worldBounds.minX) / (worldBounds.maxX - worldBounds.minX);
    const normalizedZ = (playerZ - worldBounds.minZ) / (worldBounds.maxZ - worldBounds.minZ);
    
    return [
      (normalizedX - 0.5) * 9,
      0.1,
      (normalizedZ - 0.5) * 9
    ] as [number, number, number];
  }, [player.x, worldBounds]);

  return (
    <group position={minimapPosition}>
      <mesh>
        <cylinderGeometry args={[0.15, 0.15, 0.3, 8]} />
        <meshStandardMaterial 
          color={isMe ? '#00ff00' : '#0099ff'} 
          emissive={isMe ? '#004400' : '#000044'}
          emissiveIntensity={0.2}
        />
      </mesh>
      
      {/* Player indicator ring */}
      <mesh position={[0, 0.2, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.18, 0.25, 16]} />
        <meshBasicMaterial 
          color={isMe ? '#00ff00' : '#0099ff'} 
          transparent 
          opacity={0.6} 
        />
      </mesh>
    </group>
  );
});

// Interactive Minimap Ground
function MinimapGround({ 
  worldBounds,
  onGroundClick 
}: { 
  worldBounds: { minX: number; maxX: number; minZ: number; maxZ: number },
  onGroundClick: (x: number, z: number) => void
}) {
  const handleClick = useCallback((event: any) => {
    event.stopPropagation();
    if (!event.point) return;
    
    // Convert minimap coordinates back to world coordinates
    const worldX = ((event.point.x / 4.5 + 1) / 2) * (worldBounds.maxX - worldBounds.minX) + worldBounds.minX;
    const worldZ = ((event.point.z / 4.5 + 1) / 2) * (worldBounds.maxZ - worldBounds.minZ) + worldBounds.minZ;
    
    console.log(`[Minimap] Ground click at minimap (${event.point.x.toFixed(2)}, ${event.point.z.toFixed(2)}) -> world (${worldX.toFixed(2)}, ${worldZ.toFixed(2)})`);
    onGroundClick(worldX, worldZ);
  }, [worldBounds, onGroundClick]);

  return (
    <>
      {/* Grid lines for better spatial reference */}
      <gridHelper args={[9, 9, '#333344', '#222233']} position={[0, 0, 0]} />
      
      {/* Ground plane */}
      <mesh 
        rotation={[-Math.PI / 2, 0, 0]} 
        position={[0, -0.1, 0]}
        onClick={handleClick}
        receiveShadow
      >
        <planeGeometry args={[9, 9]} />
        <meshStandardMaterial 
          color="#0a0a14" 
          transparent 
          opacity={0.5}
          metalness={0.1}
          roughness={0.9}
        />
      </mesh>
    </>
  );
}

// Main Minimap Scene
const MinimapScene = React.memo(() => {
  const gameState = useGameState() as AppGameState | null;
  const myPlayerId = useMyPlayerId();
  const selectedVehicleId = useSelectedVehicleId();
  const { moveVehicle, selectVehicle } = useVehicleActions();
  const { movePlayer } = usePlayerActions();
  
  if (!gameState) return null;

  // Calculate world bounds from all entities - memoized
  const { worldBounds } = useMemo(() => {
    const positions: Array<{ x: number; z: number }> = [];
    
    // Safe iteration over players
    if (gameState.players) {
      if (gameState.players.forEach) {
        // Handle MapSchema
        gameState.players.forEach((player: Player) => {
          positions.push({ x: player.x || 0, z: 0 }); // Players are at ground level
        });
      } else if (typeof gameState.players === 'object') {
        // Fallback to Object.values
        try {
          Object.values(gameState.players).forEach((player: Player) => {
            positions.push({ x: player.x || 0, z: 0 }); // Players are at ground level
          });
        } catch (e) {
          console.error('[Minimap] Error iterating players:', e);
        }
      }
    }
    
    // Safe iteration over vehicles
    if (gameState.vehicles) {
      if (gameState.vehicles.forEach) {
        // Handle MapSchema
        gameState.vehicles.forEach((vehicle: Vehicle) => {
          positions.push({ x: vehicle.x || 0, z: vehicle.z || 0 });
        });
      } else {
        // Fallback to Object.values
        Object.values(gameState.vehicles).forEach((vehicle: Vehicle) => {
          positions.push({ x: vehicle.x || 0, z: vehicle.z || 0 });
        });
      }
    }

    // Ensure we have at least some positions for bounds calculation
    if (!positions || !Array.isArray(positions) || positions.length === 0) {
      positions.push({ x: 0, z: 0 });
    }

    // Calculate bounds with dynamic padding based on entity spread
    // Ensure positions is a valid array
    if (!Array.isArray(positions)) {
      console.error('[Minimap] positions is not an array:', typeof positions);
      return { worldBounds: { minX: -50, maxX: 50, minZ: -50, maxZ: 50 } };
    }
    
    const xValues = positions.map(p => p.x);
    const zValues = positions.map(p => p.z);
    
    // Safe min/max operations with try-catch
    let minX = -50, maxX = 50, minZ = -50, maxZ = 50;
    
    try {
      if (Array.isArray(xValues) && xValues.length > 0) {
        minX = Math.min(...xValues);
        maxX = Math.max(...xValues);
      }
      if (Array.isArray(zValues) && zValues.length > 0) {
        minZ = Math.min(...zValues);
        maxZ = Math.max(...zValues);
      }
    } catch (e) {
      console.error('[Minimap] Error calculating bounds:', e);
      // Use default values set above
    }
    
    // Add 20% padding or minimum 20 units
    const xRange = maxX - minX;
    const zRange = maxZ - minZ;
    const xPadding = Math.max(20, xRange * 0.2);
    const zPadding = Math.max(20, zRange * 0.2);

    const bounds = {
      minX: minX - xPadding,
      maxX: maxX + xPadding,
      minZ: minZ - zPadding,
      maxZ: maxZ + zPadding
    };

    return { worldBounds: bounds };
  }, [gameState.players, gameState.vehicles]);

  const handleGroundClick = useCallback((x: number, z: number) => {
    if (selectedVehicleId) {
      moveVehicle(selectedVehicleId, x, 0, z);
    } else {
      movePlayer(x, 0, z);
    }
  }, [selectedVehicleId, moveVehicle, movePlayer]);

  const handleVehicleClick = useCallback((vehicleId: string) => {
    selectVehicle(vehicleId === selectedVehicleId ? null : vehicleId);
  }, [selectVehicle, selectedVehicleId]);

  return (
    <>
      {/* Ground plane */}
      <MinimapGround 
        worldBounds={worldBounds} 
        onGroundClick={handleGroundClick}
      />

      {/* Render players */}
      {gameState.players && (() => {
        const playerEntries = [];
        if (gameState.players.forEach) {
          // Handle MapSchema
          gameState.players.forEach((player: Player, playerId: string) => {
            playerEntries.push(
              <MinimapPlayer
                key={playerId}
                player={player}
                isMe={playerId === myPlayerId}
                worldBounds={worldBounds}
              />
            );
          });
        } else if (typeof gameState.players === 'object') {
          // Handle regular object
          Object.entries(gameState.players).forEach(([playerId, player]) => {
            playerEntries.push(
              <MinimapPlayer
                key={playerId}
                player={player as Player}
                isMe={playerId === myPlayerId}
                worldBounds={worldBounds}
              />
            );
          });
        }
        return playerEntries;
      })()}

      {/* Render vehicles */}
      {gameState.vehicles && (() => {
        const vehicleEntries = [];
        // Handle MapSchema properly
        if (gameState.vehicles.forEach) {
          gameState.vehicles.forEach((vehicle: Vehicle, vehicleId: string) => {
            vehicleEntries.push(
              <MinimapVehicle
                key={vehicleId}
                vehicle={vehicle}
                isSelected={vehicleId === selectedVehicleId}
                worldBounds={worldBounds}
                onClick={handleVehicleClick}
              />
            );
          });
        } else {
          // Fallback to Object.entries
          Object.entries(gameState.vehicles).forEach(([vehicleId, vehicle]) => {
            vehicleEntries.push(
              <MinimapVehicle
                key={vehicleId}
                vehicle={vehicle as Vehicle}
                isSelected={vehicleId === selectedVehicleId}
                worldBounds={worldBounds}
                onClick={handleVehicleClick}
              />
            );
          });
        }
        return vehicleEntries;
      })()}
    </>
  );
});

// Main Minimap Component
interface MinimapProps {
  isVisible?: boolean;
  onClose?: () => void;
}

const Minimap: React.FC<MinimapProps> = ({ isVisible = true, onClose }) => {
  const [zoom, setZoom] = React.useState(1);
  const gameState = useGameState() as AppGameState | null;
  const selectedVehicleId = useSelectedVehicleId();
  
  const selectedVehicle = useMemo(() => {
    if (!selectedVehicleId || !gameState?.vehicles) return null;
    
    // Handle MapSchema
    if (gameState.vehicles.get) {
      return gameState.vehicles.get(selectedVehicleId) || null;
    }
    
    // Handle regular object
    return gameState.vehicles[selectedVehicleId] || null;
  }, [selectedVehicleId, gameState?.vehicles]);

  if (!isVisible || !gameState) return null;

  return (
    <MinimapContainer>
      <MinimapHeader>
        <Box>
          <Typography variant="h6" color="primary">
            Tactical Map
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {selectedVehicle && (
            <Box>
              <Typography variant="body1" color="primary">
                {selectedVehicle.name}
              </Typography>
            </Box>
          )}
          {onClose && (
            <IconButton size="small" onClick={onClose} sx={{ color: 'grey.400' }}>
              <ZoomOutIcon />
            </IconButton>
          )}
        </Box>
      </MinimapHeader>

      <MinimapCanvas>
        <CanvasErrorBoundary>
          <Canvas
            camera={{ 
              position: [0, 10 / zoom, 0], 
              fov: 50,
              near: 0.1,
              far: 1000
            }}
            style={{ background: 'transparent' }}
          >
            <ambientLight intensity={0.6} />
            <directionalLight position={[10, 10, 5]} intensity={0.8} />
            
            <MinimapScene />
          </Canvas>
        </CanvasErrorBoundary>
      </MinimapCanvas>

      <MinimapControls>
        <Box sx={{ display: 'flex', width: '100%', justifyContent: 'space-between', alignItems: 'center', px: 1 }}>
          {/* Zoom controls */}
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <IconButton 
              size="small" 
              onClick={() => setZoom(Math.max(0.5, zoom - 0.1))}
              sx={{ color: 'grey.400' }}
            >
              <ZoomOutIcon />
            </IconButton>
            <Typography variant="body2" sx={{ mx: 1, color: 'grey.400' }}>
              {Math.round(zoom * 100)}%
            </Typography>
            <IconButton 
              size="small" 
              onClick={() => setZoom(Math.min(3, zoom + 0.1))}
              sx={{ color: 'grey.400' }}
            >
              <ZoomInIcon />
            </IconButton>
          </Box>
          
          {/* Vehicle Legend */}
          <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Box sx={{ width: 12, height: 12, bgcolor: '#ff6b35', borderRadius: 0 }} />
              <Typography variant="caption" sx={{ color: 'grey.400' }}>Miner</Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Box sx={{ width: 12, height: 12, bgcolor: '#4dabf7', borderRadius: '50%' }} />
              <Typography variant="caption" sx={{ color: 'grey.400' }}>Hauler</Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Box sx={{ width: 0, height: 0, borderLeft: '6px solid transparent', borderRight: '6px solid transparent', borderBottom: '12px solid #ae3ec9' }} />
              <Typography variant="caption" sx={{ color: 'grey.400' }}>Scout</Typography>
            </Box>
          </Box>
        </Box>
      </MinimapControls>
    </MinimapContainer>
  );
};

export default Minimap;
