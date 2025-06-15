import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  CardMedia,
  Typography,
  Chip,
  IconButton,
  Grid,
  Button,
  LinearProgress,
  Tooltip,
  Badge,
  Avatar,
  Divider,
  Stack
} from '@mui/material';
import {
  Build as BuildIcon,
  DirectionsCar as VehicleIcon,
  LocalGasStation as FuelIcon,
  Diamond as MiningIcon,
  Speed as SpeedIcon,
  BatteryChargingFull as BatteryIcon,
  Settings as SettingsIcon,
  Launch as DeployIcon,
  Home as RecallIcon,
  Info as InfoIcon
} from '@mui/icons-material';
import { useGameStore } from '../store/gameStore';

// Mock vehicle data - in production this would come from the game state
const mockVehicles = [
  {
    id: 'vehicle_001',
    name: 'Titan Hauler MK-I',
    type: 'hauler',
    status: 'mining',
    location: { x: 45, z: -23 },
    fuel: 78,
    maxFuel: 100,
    cargo: 450,
    maxCargo: 600,
    durability: 92,
    efficiency: 85,
    miningPower: 12,
    speed: 8,
    image: '/assets/vehicles/hauler_mk1.png'
  },
  {
    id: 'vehicle_002', 
    name: 'Swift Miner v2.1',
    type: 'miner',
    status: 'returning',
    location: { x: 12, z: 67 },
    fuel: 34,
    maxFuel: 80,
    cargo: 240,
    maxCargo: 300,
    durability: 87,
    efficiency: 94,
    miningPower: 18,
    speed: 15,
    image: '/assets/vehicles/miner_v2.png'
  },
  {
    id: 'vehicle_003',
    name: 'Crawler Scout X9',
    type: 'scout', 
    status: 'idle',
    location: { x: 0, z: 0 },
    fuel: 92,
    maxFuel: 60,
    cargo: 0,
    maxCargo: 100,
    durability: 95,
    efficiency: 88,
    miningPower: 6,
    speed: 22,
    image: '/assets/vehicles/scout_x9.png'
  }
];

// Vehicle status colors and icons
const statusConfig = {
  mining: { color: '#4caf50', icon: MiningIcon, label: 'Mining' },
  returning: { color: '#ff9800', icon: VehicleIcon, label: 'Returning' },
  idle: { color: '#757575', icon: Home as any, label: 'Idle' },
  maintenance: { color: '#f44336', icon: BuildIcon, label: 'Maintenance' }
};

// Vehicle type configurations
const typeConfig = {
  hauler: { color: '#2196f3', icon: VehicleIcon },
  miner: { color: '#ff6b35', icon: MiningIcon },
  scout: { color: '#9c27b0', icon: SpeedIcon }
};

interface VehicleCardProps {
  vehicle: typeof mockVehicles[0];
  onDeploy: (vehicleId: string) => void;
  onRecall: (vehicleId: string) => void;
  onUpgrade: (vehicleId: string) => void;
}

function VehicleCard({ vehicle, onDeploy, onRecall, onUpgrade }: VehicleCardProps) {
  const statusCfg = statusConfig[vehicle.status as keyof typeof statusConfig];
  const typeCfg = typeConfig[vehicle.type as keyof typeof typeConfig];
  const StatusIcon = statusCfg.icon;
  const TypeIcon = typeCfg.icon;

  return (
    <Card
      sx={{
        background: 'linear-gradient(135deg, rgba(15, 15, 35, 0.95) 0%, rgba(26, 26, 46, 0.95) 100%)',
        border: '1px solid rgba(255, 107, 53, 0.2)',
        borderRadius: 2,
        transition: 'all 0.3s ease',
        '&:hover': {
          borderColor: 'rgba(255, 107, 53, 0.4)',
          transform: 'translateY(-2px)',
          boxShadow: '0 8px 25px rgba(255, 107, 53, 0.15)'
        }
      }}
    >
      {/* Vehicle Image/Avatar */}
      <Box sx={{ position: 'relative', p: 2, pb: 0 }}>
        <Avatar
          sx={{
            width: 80,
            height: 80,
            bgcolor: typeCfg.color,
            margin: '0 auto',
            fontSize: '2rem'
          }}
        >
          <TypeIcon />
        </Avatar>
        
        {/* Status Badge */}
        <Chip
          icon={<StatusIcon />}
          label={statusCfg.label}
          size="small"
          sx={{
            position: 'absolute',
            top: 8,
            right: 8,
            bgcolor: statusCfg.color,
            color: '#ffffff',
            '& .MuiChip-icon': { color: '#ffffff' }
          }}
        />
      </Box>

      <CardContent sx={{ pt: 1 }}>
        {/* Vehicle Name & Type */}
        <Typography variant="h6" sx={{ color: '#ffffff', fontWeight: 600, mb: 1, textAlign: 'center' }}>
          {vehicle.name}
        </Typography>
        
        <Typography variant="body2" sx={{ color: '#b0b0b0', textAlign: 'center', mb: 2 }}>
          {vehicle.type.toUpperCase()} • Location: ({vehicle.location.x}, {vehicle.location.z})
        </Typography>

        <Divider sx={{ borderColor: 'rgba(255, 107, 53, 0.2)', mb: 2 }} />

        {/* Vehicle Stats */}
        <Stack spacing={1.5}>
          {/* Fuel */}
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <FuelIcon sx={{ color: '#ffc107', fontSize: '1rem' }} />
                <Typography variant="body2" sx={{ color: '#ffffff' }}>Fuel</Typography>
              </Box>
              <Typography variant="body2" sx={{ color: '#ffc107' }}>
                {vehicle.fuel}/{vehicle.maxFuel}
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={(vehicle.fuel / vehicle.maxFuel) * 100}
              sx={{
                bgcolor: 'rgba(255, 193, 7, 0.2)',
                '& .MuiLinearProgress-bar': { bgcolor: '#ffc107' }
              }}
            />
          </Box>

          {/* Cargo */}
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <MiningIcon sx={{ color: '#4caf50', fontSize: '1rem' }} />
                <Typography variant="body2" sx={{ color: '#ffffff' }}>Cargo</Typography>
              </Box>
              <Typography variant="body2" sx={{ color: '#4caf50' }}>
                {vehicle.cargo}/{vehicle.maxCargo}
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={(vehicle.cargo / vehicle.maxCargo) * 100}
              sx={{
                bgcolor: 'rgba(76, 175, 80, 0.2)',
                '& .MuiLinearProgress-bar': { bgcolor: '#4caf50' }
              }}
            />
          </Box>

          {/* Durability */}
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <BatteryIcon sx={{ color: '#2196f3', fontSize: '1rem' }} />
                <Typography variant="body2" sx={{ color: '#ffffff' }}>Condition</Typography>
              </Box>
              <Typography variant="body2" sx={{ color: '#2196f3' }}>
                {vehicle.durability}%
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={vehicle.durability}
              sx={{
                bgcolor: 'rgba(33, 150, 243, 0.2)',
                '& .MuiLinearProgress-bar': { bgcolor: '#2196f3' }
              }}
            />
          </Box>
        </Stack>

        {/* Performance Stats */}
        <Box sx={{ display: 'flex', justifyContent: 'space-around', mt: 2, mb: 2 }}>
          <Tooltip title="Mining Power">
            <Box sx={{ textAlign: 'center' }}>
              <MiningIcon sx={{ color: '#ff6b35', mb: 0.5 }} />
              <Typography variant="body2" sx={{ color: '#ffffff' }}>{vehicle.miningPower}</Typography>
            </Box>
          </Tooltip>
          
          <Tooltip title="Speed">
            <Box sx={{ textAlign: 'center' }}>
              <SpeedIcon sx={{ color: '#9c27b0', mb: 0.5 }} />
              <Typography variant="body2" sx={{ color: '#ffffff' }}>{vehicle.speed}</Typography>
            </Box>
          </Tooltip>
          
          <Tooltip title="Efficiency">
            <Box sx={{ textAlign: 'center' }}>
              <SettingsIcon sx={{ color: '#4caf50', mb: 0.5 }} />
              <Typography variant="body2" sx={{ color: '#ffffff' }}>{vehicle.efficiency}%</Typography>
            </Box>
          </Tooltip>
        </Box>

        <Divider sx={{ borderColor: 'rgba(255, 107, 53, 0.2)', mb: 2 }} />

        {/* Action Buttons */}
        <Box sx={{ display: 'flex', gap: 1 }}>
          {vehicle.status === 'idle' ? (
            <Button
              variant="contained"
              startIcon={<DeployIcon />}
              onClick={() => onDeploy(vehicle.id)}
              sx={{
                flex: 1,
                bgcolor: '#ff6b35',
                '&:hover': { bgcolor: '#e55722' }
              }}
            >
              Deploy
            </Button>
          ) : (
            <Button
              variant="outlined"
              startIcon={<RecallIcon />}
              onClick={() => onRecall(vehicle.id)}
              sx={{
                flex: 1,
                borderColor: '#ff6b35',
                color: '#ff6b35',
                '&:hover': { borderColor: '#e55722', bgcolor: 'rgba(255, 107, 53, 0.1)' }
              }}
            >
              Recall
            </Button>
          )}
          
          <IconButton
            onClick={() => onUpgrade(vehicle.id)}
            sx={{
              color: '#ffc107',
              border: '1px solid #ffc107',
              '&:hover': { bgcolor: 'rgba(255, 193, 7, 0.1)' }
            }}
          >
            <BuildIcon />
          </IconButton>
        </Box>
      </CardContent>
    </Card>
  );
}

function FleetMenu() {
  const { gameState, isConnected } = useGameStore();
  const [selectedVehicle, setSelectedVehicle] = useState<string | null>(null);

  const handleDeploy = (vehicleId: string) => {
    console.log(`Deploying vehicle: ${vehicleId}`);
    // TODO: Send deploy command to server
  };

  const handleRecall = (vehicleId: string) => {
    console.log(`Recalling vehicle: ${vehicleId}`);
    // TODO: Send recall command to server
  };

  const handleUpgrade = (vehicleId: string) => {
    console.log(`Opening upgrade menu for vehicle: ${vehicleId}`);
    // TODO: Open upgrade/maintenance dialog
  };

  // Fleet stats
  const totalVehicles = mockVehicles.length;
  const activeVehicles = mockVehicles.filter(v => v.status !== 'idle').length;
  const totalCargo = mockVehicles.reduce((sum, v) => sum + v.cargo, 0);
  const averageCondition = Math.round(mockVehicles.reduce((sum, v) => sum + v.durability, 0) / totalVehicles);

  return (
    <Box sx={{ width: '100%', height: '100%', overflow: 'auto', p: 2 }}>
      {/* Fleet Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" sx={{ color: '#ffffff', fontWeight: 700, mb: 1 }}>
          Fleet Command
        </Typography>
        <Typography variant="body1" sx={{ color: '#b0b0b0', mb: 2 }}>
          Manage your mining fleet operations and vehicle deployments
        </Typography>

        {/* Fleet Stats */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={3}>
            <Card sx={{ bgcolor: 'rgba(255, 107, 53, 0.1)', border: '1px solid rgba(255, 107, 53, 0.3)' }}>
              <CardContent sx={{ textAlign: 'center', py: 2 }}>
                <Typography variant="h5" sx={{ color: '#ff6b35', fontWeight: 600 }}>
                  {totalVehicles}
                </Typography>
                <Typography variant="body2" sx={{ color: '#ffffff' }}>
                  Total Vehicles
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={3}>
            <Card sx={{ bgcolor: 'rgba(76, 175, 80, 0.1)', border: '1px solid rgba(76, 175, 80, 0.3)' }}>
              <CardContent sx={{ textAlign: 'center', py: 2 }}>
                <Typography variant="h5" sx={{ color: '#4caf50', fontWeight: 600 }}>
                  {activeVehicles}
                </Typography>
                <Typography variant="body2" sx={{ color: '#ffffff' }}>
                  Active
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={3}>
            <Card sx={{ bgcolor: 'rgba(255, 193, 7, 0.1)', border: '1px solid rgba(255, 193, 7, 0.3)' }}>
              <CardContent sx={{ textAlign: 'center', py: 2 }}>
                <Typography variant="h5" sx={{ color: '#ffc107', fontWeight: 600 }}>
                  {totalCargo}
                </Typography>
                <Typography variant="body2" sx={{ color: '#ffffff' }}>
                  Total Cargo
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={3}>
            <Card sx={{ bgcolor: 'rgba(33, 150, 243, 0.1)', border: '1px solid rgba(33, 150, 243, 0.3)' }}>
              <CardContent sx={{ textAlign: 'center', py: 2 }}>
                <Typography variant="h5" sx={{ color: '#2196f3', fontWeight: 600 }}>
                  {averageCondition}%
                </Typography>
                <Typography variant="body2" sx={{ color: '#ffffff' }}>
                  Avg Condition
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>

      {/* Vehicle Grid */}
      <Grid container spacing={3}>
        {mockVehicles.map((vehicle) => (
          <Grid item xs={12} sm={6} md={4} key={vehicle.id}>
            <VehicleCard
              vehicle={vehicle}
              onDeploy={handleDeploy}
              onRecall={handleRecall}
              onUpgrade={handleUpgrade}
            />
          </Grid>
        ))}
      </Grid>

      {/* Add New Vehicle Card */}
      <Grid container spacing={3} sx={{ mt: 2 }}>
        <Grid item xs={12} sm={6} md={4}>
          <Card
            sx={{
              background: 'linear-gradient(135deg, rgba(15, 15, 35, 0.5) 0%, rgba(26, 26, 46, 0.5) 100%)',
              border: '2px dashed rgba(255, 107, 53, 0.3)',
              borderRadius: 2,
              minHeight: 400,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              '&:hover': {
                borderColor: 'rgba(255, 107, 53, 0.6)',
                bgcolor: 'rgba(255, 107, 53, 0.05)'
              }
            }}
          >
            <Box sx={{ textAlign: 'center', p: 3 }}>
              <BuildIcon sx={{ fontSize: '3rem', color: '#ff6b35', mb: 2 }} />
              <Typography variant="h6" sx={{ color: '#ffffff', mb: 1 }}>
                Build New Vehicle
              </Typography>
              <Typography variant="body2" sx={{ color: '#b0b0b0' }}>
                Expand your fleet capabilities
              </Typography>
            </Box>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}

export default FleetMenu;
