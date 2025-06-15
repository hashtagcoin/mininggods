import React, { useRef, useState, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Box, Paper, Typography, IconButton, Chip } from '@mui/material';
import { styled } from '@mui/material/styles';
import { Close, ZoomIn, ZoomOut } from '@mui/icons-material';
import * as THREE from 'three';
import { useGameStore } from '../store/gameStore';

// Styled components for consistent UI
const MinimapContainer = styled(Paper)(({ theme }) => ({
  position: 'fixed',
  top: 20,
  right: 20,
  width: 300,
  height: 300,
  zIndex: 1000,
  borderRadius: 12,
  overflow: 'hidden',
  background: 'rgba(0, 0, 0, 0.85)',
  backdropFilter: 'blur(10px)',
  border: '1px solid rgba(255, 255, 255, 0.1)',
  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
}));

const MinimapHeader = styled(Box)(({ theme }) => ({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: theme.spacing(1, 2),
  background: 'rgba(255, 255, 255, 0.05)',
  borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
}));

const MinimapCanvas = styled(Box)({
  width: '100%',
  height: 'calc(100% - 48px)',
  position: 'relative',
});

const ControlsOverlay = styled(Box)({
  position: 'absolute',
  bottom: 8,
  right: 8,
  display: 'flex',
  gap: 4,
  zIndex: 1001,
});

// Minimap Vehicle Component
function MinimapVehicle({ 
  vehicle, 
  isSelected = false,
  worldBounds,
  onClick 
}: { 
  vehicle: { id: string; name: string; x: number; y: number; z: number; type: string; status: string },
  isSelected?: boolean,
  worldBounds: { minX: number; maxX: number; minZ: number; maxZ: number },
  onClick: (vehicleId: string) => void
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  
  // Convert world coordinates to minimap coordinates (-1 to 1)
  const minimapX = ((vehicle.x - worldBounds.minX) / (worldBounds.maxX - worldBounds.minX)) * 2 - 1;
  const minimapZ = ((vehicle.z - worldBounds.minZ) / (worldBounds.maxZ - worldBounds.minZ)) * 2 - 1;
  
  // Vehicle type colors
  const getVehicleColor = (type: string) => {
    switch ((type || '').toLowerCase()) {
      case 'miner': return '#ff6b35';
      case 'hauler': return '#4a90e2';
      case 'scout': return '#9b59b6';
      default: return '#ffffff';
    }
  };

  const handleClick = (event: THREE.Event) => {
    event.stopPropagation();
    onClick(vehicle.id);
  };

  // Animate selection ring
  useFrame((state) => {
    if (meshRef.current && isSelected) {
      meshRef.current.scale.setScalar(1 + Math.sin(state.clock.elapsedTime * 4) * 0.1);
    } else if (meshRef.current) {
      meshRef.current.scale.setScalar(1);
    }
  });

  return (
    <group position={[minimapX * 4.5, 0, minimapZ * 4.5]}>
      {/* Vehicle dot */}
      <mesh 
        ref={meshRef}
        onClick={handleClick}
        onPointerOver={() => document.body.style.cursor = 'pointer'}
        onPointerOut={() => document.body.style.cursor = 'default'}
      >
        <circleGeometry args={[isSelected ? 0.15 : 0.1, 8]} />
        <meshBasicMaterial 
          color={getVehicleColor(vehicle.type)}
          transparent
          opacity={isSelected ? 1 : 0.8}
        />
      </mesh>
      
      {/* Selection ring */}
      {isSelected && (
        <mesh>
          <ringGeometry args={[0.2, 0.25, 16]} />
          <meshBasicMaterial 
            color="#ffffff"
            transparent
            opacity={0.6}
          />
        </mesh>
      )}
    </group>
  );
}

// Minimap Player Component
function MinimapPlayer({ 
  player, 
  isMe = false,
  worldBounds 
}: { 
  player: { id: string; name: string; x: number; y: number; credits: number },
  isMe?: boolean,
  worldBounds: { minX: number; maxX: number; minZ: number; maxZ: number }
}) {
  // Convert world coordinates to minimap coordinates
  const minimapX = ((player.x - worldBounds.minX) / (worldBounds.maxX - worldBounds.minX)) * 2 - 1;
  const minimapZ = ((0 - worldBounds.minZ) / (worldBounds.maxZ - worldBounds.minZ)) * 2 - 1; // Player Z is 0

  return (
    <group position={[minimapX * 4.5, 0, minimapZ * 4.5]}>
      <mesh>
        <boxGeometry args={[isMe ? 0.2 : 0.15, 0.1, isMe ? 0.2 : 0.15]} />
        <meshBasicMaterial 
          color={isMe ? '#ff6b35' : '#4CAF50'}
          transparent
          opacity={0.9}
        />
      </mesh>
    </group>
  );
}

// Interactive Minimap Ground
function MinimapGround({ 
  worldBounds,
  onGroundClick 
}: { 
  worldBounds: { minX: number; maxX: number; minZ: number; maxZ: number },
  onGroundClick: (x: number, z: number) => void
}) {
  const handleClick = (event: THREE.Event) => {
    if (event.point) {
      // Convert minimap coordinates back to world coordinates
      const worldX = ((event.point.x / 4.5 + 1) / 2) * (worldBounds.maxX - worldBounds.minX) + worldBounds.minX;
      const worldZ = ((event.point.z / 4.5 + 1) / 2) * (worldBounds.maxZ - worldBounds.minZ) + worldBounds.minZ;
      onGroundClick(worldX, worldZ);
    }
  };

  return (
    <mesh 
      rotation={[-Math.PI / 2, 0, 0]} 
      position={[0, -0.1, 0]}
      onClick={handleClick}
    >
      <planeGeometry args={[10, 10]} />
      <meshBasicMaterial 
        color="#1a1a1a"
        transparent
        opacity={0.3}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

// Main Minimap Scene
function MinimapScene() {
  const { gameState, myPlayerId, selectedVehicleId, selectVehicle, moveVehicle, movePlayer } = useGameStore();
  
  if (!gameState) return null;

  // Calculate world bounds from all entities
  const allPositions = [
    ...Object.values(gameState.players).map(p => ({ x: p.x, z: 0 })),
    ...Object.values(gameState.vehicles || {}).map(v => ({ x: v.x, z: v.z }))
  ];

  const worldBounds = {
    minX: Math.min(...allPositions.map(p => p.x)) - 10,
    maxX: Math.max(...allPositions.map(p => p.x)) + 10,
    minZ: Math.min(...allPositions.map(p => p.z)) - 10,
    maxZ: Math.max(...allPositions.map(p => p.z)) + 10,
  };

  const handleVehicleClick = (vehicleId: string) => {
    selectVehicle(selectedVehicleId === vehicleId ? null : vehicleId);
  };

  const handleGroundClick = (x: number, z: number) => {
    if (selectedVehicleId) {
      // Move selected vehicle (Y=0 for ground level, Z for forward/back movement)
      moveVehicle(selectedVehicleId, x, 0, z);
    } else {
      // Move player (Y=0 for ground level, Z for forward/back movement)
      movePlayer(x, 0, z);
    }
  };

  return (
    <>
      {/* Ground plane */}
      <MinimapGround 
        worldBounds={worldBounds}
        onGroundClick={handleGroundClick}
      />
      
      {/* Grid lines */}
      <gridHelper args={[10, 20, '#333333', '#333333']} position={[0, 0, 0]} />
      
      {/* Players */}
      {Object.entries(gameState.players).map(([playerKey, player], index) => (
        <MinimapPlayer
          key={`player-${player.id || playerKey || index}`}
          player={player}
          isMe={player.id === myPlayerId}
          worldBounds={worldBounds}
        />
      ))}
      
      {/* Vehicles */}
      {gameState.vehicles && Object.entries(gameState.vehicles).map(([vehicleKey, vehicle], index) => (
        <MinimapVehicle
          key={`vehicle-${vehicle.id || vehicleKey || index}`}
          vehicle={vehicle}
          isSelected={vehicle.id === selectedVehicleId}
          worldBounds={worldBounds}
          onClick={handleVehicleClick}
        />
      ))}
    </>
  );
}

// Main Minimap Component
interface MinimapProps {
  isVisible: boolean;
  onClose?: () => void;
}

export default function Minimap({ isVisible = true, onClose }: MinimapProps) {
  const [zoom, setZoom] = useState(1);
  const { gameState, selectedVehicleId } = useGameStore();

  if (!isVisible || !gameState) return null;

  const selectedVehicle = selectedVehicleId && gameState.vehicles ? 
    gameState.vehicles[selectedVehicleId] : null;

  return (
    <MinimapContainer>
      <MinimapHeader>
        <Typography variant="subtitle2" sx={{ color: '#ffffff', fontWeight: 600 }}>
          Tactical Map
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {selectedVehicle && (
            <Chip
              label={`${selectedVehicle.name} Selected`}
              size="small"
              sx={{
                backgroundColor: 'rgba(255, 107, 53, 0.2)',
                color: '#ff6b35',
                border: '1px solid rgba(255, 107, 53, 0.3)',
                fontSize: '0.75rem'
              }}
            />
          )}
          {onClose && (
            <IconButton size="small" onClick={onClose} sx={{ color: '#ffffff' }}>
              <Close fontSize="small" />
            </IconButton>
          )}
        </Box>
      </MinimapHeader>
      
      <MinimapCanvas>
        <Canvas
          camera={{ 
            position: [0, 15, 0], 
            rotation: [-Math.PI / 2, 0, 0],
            zoom: zoom,
            far: 1000
          }}
          orthographic
        >
          <ambientLight intensity={0.6} />
          <directionalLight position={[10, 10, 5]} intensity={0.4} />
          <MinimapScene />
        </Canvas>
        
        <ControlsOverlay>
          <IconButton
            size="small"
            onClick={() => setZoom(Math.min(zoom * 1.2, 3))}
            sx={{ 
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              color: '#ffffff',
              '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.2)' }
            }}
          >
            <ZoomIn fontSize="small" />
          </IconButton>
          <IconButton
            size="small"
            onClick={() => setZoom(Math.max(zoom / 1.2, 0.5))}
            sx={{ 
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              color: '#ffffff',
              '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.2)' }
            }}
          >
            <ZoomOut fontSize="small" />
          </IconButton>
        </ControlsOverlay>
      </MinimapCanvas>
    </MinimapContainer>
  );
}
