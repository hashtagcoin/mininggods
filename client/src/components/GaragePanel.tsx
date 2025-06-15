import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Chip,
  LinearProgress,
  Slider,
  TextField,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Avatar,
  Divider,
  Stack,
  Alert
} from '@mui/material';
import {
  Build as BuildIcon,
  Upgrade as UpgradeIcon,
  Settings as SettingsIcon,
  Speed as SpeedIcon,
  BatteryChargingFull as BatteryIcon,
  LocalGasStation as FuelIcon,
  Diamond as MiningIcon,
  Inventory as CargoIcon,
  ShoppingCart as ShopIcon,
  ExpandMore as ExpandMoreIcon,
  CheckCircle as CheckIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  Add as AddIcon,
  Remove as RemoveIcon
} from '@mui/icons-material';
import { useGameStore } from '../store/gameStore';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`garage-tabpanel-${index}`}
      aria-labelledby={`garage-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

// Mock upgrade data
const upgradeCategories = {
  engine: {
    name: 'Engine Systems',
    icon: SpeedIcon,
    color: '#ff6b35',
    upgrades: [
      {
        id: 'engine_efficiency_1',
        name: 'Fuel Efficiency Boost I',
        description: 'Reduces fuel consumption by 15%',
        cost: 2500,
        level: 0,
        maxLevel: 3,
        effect: 'fuel_efficiency',
        value: 15
      },
      {
        id: 'engine_power_1',
        name: 'Engine Power Enhancement I',
        description: 'Increases movement speed by 20%',
        cost: 3000,
        level: 0,
        maxLevel: 5,
        effect: 'speed',
        value: 20
      }
    ]
  },
  mining: {
    name: 'Mining Equipment',
    icon: MiningIcon,
    color: '#4caf50',
    upgrades: [
      {
        id: 'mining_drill_1',
        name: 'Advanced Drill Bits',
        description: 'Increases mining power by 25%',
        cost: 4000,
        level: 0,
        maxLevel: 4,
        effect: 'mining_power',
        value: 25
      },
      {
        id: 'ore_processor_1',
        name: 'Ore Processing Unit',
        description: 'Improves ore quality by 10%',
        cost: 5000,
        level: 0,
        maxLevel: 3,
        effect: 'ore_quality',
        value: 10
      }
    ]
  },
  cargo: {
    name: 'Cargo Systems',
    icon: CargoIcon,
    color: '#2196f3',
    upgrades: [
      {
        id: 'cargo_expansion_1',
        name: 'Cargo Bay Expansion I',
        description: 'Increases cargo capacity by 30%',
        cost: 3500,
        level: 0,
        maxLevel: 4,
        effect: 'cargo_capacity',
        value: 30
      },
      {
        id: 'auto_loader_1',
        name: 'Automated Loading System',
        description: 'Reduces loading time by 40%',
        cost: 6000,
        level: 0,
        maxLevel: 2,
        effect: 'loading_speed',
        value: 40
      }
    ]
  },
  defense: {
    name: 'Defense & Durability',
    icon: BatteryIcon,
    color: '#9c27b0',
    upgrades: [
      {
        id: 'armor_plating_1',
        name: 'Reinforced Armor Plating',
        description: 'Increases durability by 20%',
        cost: 4500,
        level: 0,
        maxLevel: 3,
        effect: 'durability',
        value: 20
      },
      {
        id: 'self_repair_1',
        name: 'Self-Repair System',
        description: 'Enables gradual self-repair over time',
        cost: 8000,
        level: 0,
        maxLevel: 2,
        effect: 'self_repair',
        value: 5
      }
    ]
  }
};

// Mock maintenance data
const maintenanceActions = [
  {
    id: 'fuel_refill',
    name: 'Fuel Refill',
    description: 'Refill fuel tank to maximum capacity',
    cost: 150,
    icon: FuelIcon,
    color: '#ffc107',
    duration: 30 // seconds
  },
  {
    id: 'minor_repair',
    name: 'Minor Repairs',
    description: 'Restore 25% durability',
    cost: 500,
    icon: BuildIcon,
    color: '#4caf50',
    duration: 120
  },
  {
    id: 'major_overhaul',
    name: 'Major Overhaul',
    description: 'Restore to 100% condition',
    cost: 2000,
    icon: SettingsIcon,
    color: '#ff6b35',
    duration: 300
  }
];

interface VehicleUpgradeDialogProps {
  open: boolean;
  onClose: () => void;
  vehicleId: string | null;
}

function VehicleUpgradeDialog({ open, onClose, vehicleId }: VehicleUpgradeDialogProps) {
  const [selectedTab, setSelectedTab] = useState(0);
  const [selectedUpgrade, setSelectedUpgrade] = useState<any>(null);
  const { gameState } = useGameStore();

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setSelectedTab(newValue);
  };

  const handleUpgrade = (upgrade: any) => {
    console.log(`Upgrading ${vehicleId} with ${upgrade.id}`);
    // TODO: Send upgrade request to server
    setSelectedUpgrade(null);
  };

  const categories = Object.values(upgradeCategories);

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="md" 
      fullWidth
      PaperProps={{
        sx: {
          bgcolor: 'rgba(15, 15, 35, 0.95)',
          border: '1px solid rgba(255, 107, 53, 0.3)'
        }
      }}
    >
      <DialogTitle sx={{ color: '#ffffff', borderBottom: '1px solid rgba(255, 107, 53, 0.3)' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <UpgradeIcon sx={{ color: '#ff6b35' }} />
          Vehicle Upgrades
        </Box>
      </DialogTitle>

      <DialogContent sx={{ p: 0 }}>
        <Box sx={{ borderBottom: 1, borderColor: 'rgba(255, 107, 53, 0.2)' }}>
          <Tabs 
            value={selectedTab} 
            onChange={handleTabChange}
            variant="scrollable"
            scrollButtons="auto"
            sx={{
              '& .MuiTab-root': { color: '#b0b0b0' },
              '& .Mui-selected': { color: '#ff6b35' },
              '& .MuiTabs-indicator': { bgcolor: '#ff6b35' }
            }}
          >
            {categories.map((category, index) => {
              const Icon = category.icon;
              return (
                <Tab
                  key={index}
                  label={category.name}
                  icon={<Icon />}
                  iconPosition="start"
                />
              );
            })}
          </Tabs>
        </Box>

        {categories.map((category, index) => (
          <TabPanel key={index} value={selectedTab} index={index}>
            <Grid container spacing={2}>
              {category.upgrades.map((upgrade) => (
                <Grid item xs={12} key={upgrade.id}>
                  <Card
                    sx={{
                      bgcolor: 'rgba(26, 26, 46, 0.8)',
                      border: `1px solid ${category.color}40`,
                      '&:hover': {
                        borderColor: `${category.color}80`,
                        bgcolor: 'rgba(26, 26, 46, 0.9)'
                      }
                    }}
                  >
                    <CardContent>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="h6" sx={{ color: '#ffffff', mb: 1 }}>
                            {upgrade.name}
                          </Typography>
                          <Typography variant="body2" sx={{ color: '#b0b0b0', mb: 2 }}>
                            {upgrade.description}
                          </Typography>
                          
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                            <Chip
                              label={`Level ${upgrade.level}/${upgrade.maxLevel}`}
                              size="small"
                              sx={{ bgcolor: category.color, color: '#ffffff' }}
                            />
                            <Typography variant="body2" sx={{ color: '#ffc107' }}>
                              ${upgrade.cost.toLocaleString()}
                            </Typography>
                          </Box>

                          <LinearProgress
                            variant="determinate"
                            value={(upgrade.level / upgrade.maxLevel) * 100}
                            sx={{
                              bgcolor: `${category.color}20`,
                              '& .MuiLinearProgress-bar': { bgcolor: category.color }
                            }}
                          />
                        </Box>

                        <Button
                          variant="contained"
                          disabled={upgrade.level >= upgrade.maxLevel}
                          onClick={() => handleUpgrade(upgrade)}
                          sx={{
                            ml: 2,
                            bgcolor: category.color,
                            '&:hover': { bgcolor: `${category.color}dd` }
                          }}
                        >
                          {upgrade.level >= upgrade.maxLevel ? 'Maxed' : 'Upgrade'}
                        </Button>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </TabPanel>
        ))}
      </DialogContent>

      <DialogActions sx={{ borderTop: '1px solid rgba(255, 107, 53, 0.3)', p: 2 }}>
        <Button onClick={onClose} sx={{ color: '#b0b0b0' }}>
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function GaragePanel() {
  const { gameState, isConnected } = useGameStore();
  const [upgradeDialogOpen, setUpgradeDialogOpen] = useState(false);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const [maintenanceInProgress, setMaintenanceInProgress] = useState<{ [key: string]: boolean }>({});

  const handleOpenUpgrades = (vehicleId: string) => {
    setSelectedVehicleId(vehicleId);
    setUpgradeDialogOpen(true);
  };

  const handleMaintenance = (vehicleId: string, actionId: string) => {
    console.log(`Starting ${actionId} for vehicle ${vehicleId}`);
    setMaintenanceInProgress(prev => ({ ...prev, [`${vehicleId}_${actionId}`]: true }));
    
    // Simulate maintenance duration
    const action = maintenanceActions.find(a => a.id === actionId);
    setTimeout(() => {
      setMaintenanceInProgress(prev => ({ ...prev, [`${vehicleId}_${actionId}`]: false }));
      console.log(`Completed ${actionId} for vehicle ${vehicleId}`);
    }, (action?.duration || 30) * 1000);
  };

  // Mock vehicle data for garage (vehicles currently in garage)
  const garageVehicles = [
    {
      id: 'vehicle_003',
      name: 'Crawler Scout X9',
      type: 'scout',
      status: 'idle',
      fuel: 92,
      maxFuel: 60,
      durability: 95,
      lastMaintenance: '2 hours ago',
      nextMaintenance: 'in 22 hours',
      issues: []
    },
    {
      id: 'vehicle_004',
      name: 'Heavy Hauler Beta',
      type: 'hauler',
      status: 'maintenance',
      fuel: 23,
      maxFuel: 120,
      durability: 67,
      lastMaintenance: '5 days ago',
      nextMaintenance: 'overdue',
      issues: ['Low fuel', 'Engine efficiency degraded', 'Minor hull damage']
    }
  ];

  return (
    <Box sx={{ width: '100%', height: '100%', overflow: 'auto', p: 2 }}>
      {/* Garage Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" sx={{ color: '#ffffff', fontWeight: 700, mb: 1 }}>
          Vehicle Garage
        </Typography>
        <Typography variant="body1" sx={{ color: '#b0b0b0', mb: 2 }}>
          Maintain, upgrade, and customize your mining fleet
        </Typography>
      </Box>

      {/* Quick Stats */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid xs={3}>
          <Card sx={{ bgcolor: 'rgba(76, 175, 80, 0.1)', border: '1px solid rgba(76, 175, 80, 0.3)' }}>
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <Typography variant="h5" sx={{ color: '#4caf50', fontWeight: 600 }}>
                {garageVehicles.filter(v => v.status === 'idle').length}
              </Typography>
              <Typography variant="body2" sx={{ color: '#ffffff' }}>
                Ready to Deploy
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid xs={3}>
          <Card sx={{ bgcolor: 'rgba(255, 193, 7, 0.1)', border: '1px solid rgba(255, 193, 7, 0.3)' }}>
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <Typography variant="h5" sx={{ color: '#ffc107', fontWeight: 600 }}>
                {garageVehicles.filter(v => v.status === 'maintenance').length}
              </Typography>
              <Typography variant="body2" sx={{ color: '#ffffff' }}>
                In Maintenance
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid xs={3}>
          <Card sx={{ bgcolor: 'rgba(255, 107, 53, 0.1)', border: '1px solid rgba(255, 107, 53, 0.3)' }}>
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <Typography variant="h5" sx={{ color: '#ff6b35', fontWeight: 600 }}>
                {garageVehicles.filter(v => v.issues.length > 0).length}
              </Typography>
              <Typography variant="body2" sx={{ color: '#ffffff' }}>
                Need Attention
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid xs={3}>
          <Card sx={{ bgcolor: 'rgba(33, 150, 243, 0.1)', border: '1px solid rgba(33, 150, 243, 0.3)' }}>
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <Typography variant="h5" sx={{ color: '#2196f3', fontWeight: 600 }}>
                85%
              </Typography>
              <Typography variant="body2" sx={{ color: '#ffffff' }}>
                Avg Efficiency
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Vehicle List */}
      <Grid container spacing={3}>
        {garageVehicles.map((vehicle) => (
          <Grid item xs={12} key={vehicle.id}>
            <Card
              sx={{
                background: 'linear-gradient(135deg, rgba(15, 15, 35, 0.95) 0%, rgba(26, 26, 46, 0.95) 100%)',
                border: vehicle.issues.length > 0 
                  ? '1px solid rgba(255, 193, 7, 0.5)' 
                  : '1px solid rgba(255, 107, 53, 0.2)',
                borderRadius: 2
              }}
            >
              <CardContent>
                <Grid container spacing={3}>
                  {/* Vehicle Info */}
                  <Grid item xs={12} md={4}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                      <Avatar
                        sx={{
                          width: 60,
                          height: 60,
                          bgcolor: vehicle.status === 'idle' ? '#4caf50' : '#ffc107'
                        }}
                      >
                        <SettingsIcon />
                      </Avatar>
                      <Box>
                        <Typography variant="h6" sx={{ color: '#ffffff' }}>
                          {vehicle.name}
                        </Typography>
                        <Typography variant="body2" sx={{ color: '#b0b0b0' }}>
                          {vehicle.type.toUpperCase()}
                        </Typography>
                        <Chip
                          label={vehicle.status.toUpperCase()}
                          size="small"
                          sx={{
                            mt: 0.5,
                            bgcolor: vehicle.status === 'idle' ? '#4caf50' : '#ffc107',
                            color: '#ffffff'
                          }}
                        />
                      </Box>
                    </Box>

                    {/* Issues Alert */}
                    {vehicle.issues.length > 0 && (
                      <Alert
                        severity="warning"
                        sx={{
                          bgcolor: 'rgba(255, 193, 7, 0.1)',
                          color: '#ffc107',
                          '& .MuiAlert-icon': { color: '#ffc107' }
                        }}
                      >
                        <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                          Issues Detected:
                        </Typography>
                        {vehicle.issues.map((issue, index) => (
                          <Typography key={index} variant="body2" sx={{ fontSize: '0.8rem' }}>
                            • {issue}
                          </Typography>
                        ))}
                      </Alert>
                    )}
                  </Grid>

                  {/* Vehicle Stats */}
                  <Grid item xs={12} md={4}>
                    <Typography variant="subtitle2" sx={{ color: '#ffffff', mb: 2 }}>
                      Current Status
                    </Typography>

                    <Stack spacing={2}>
                      {/* Fuel */}
                      <Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                          <Typography variant="body2" sx={{ color: '#ffffff' }}>Fuel</Typography>
                          <Typography variant="body2" sx={{ color: '#ffc107' }}>
                            {vehicle.fuel}/{vehicle.maxFuel}
                          </Typography>
                        </Box>
                        <LinearProgress
                          variant="determinate"
                          value={(vehicle.fuel / vehicle.maxFuel) * 100}
                          sx={{
                            bgcolor: 'rgba(255, 193, 7, 0.2)',
                            '& .MuiLinearProgress-bar': { 
                              bgcolor: vehicle.fuel < vehicle.maxFuel * 0.3 ? '#f44336' : '#ffc107' 
                            }
                          }}
                        />
                      </Box>

                      {/* Condition */}
                      <Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                          <Typography variant="body2" sx={{ color: '#ffffff' }}>Condition</Typography>
                          <Typography variant="body2" sx={{ color: '#2196f3' }}>
                            {vehicle.durability}%
                          </Typography>
                        </Box>
                        <LinearProgress
                          variant="determinate"
                          value={vehicle.durability}
                          sx={{
                            bgcolor: 'rgba(33, 150, 243, 0.2)',
                            '& .MuiLinearProgress-bar': { 
                              bgcolor: vehicle.durability < 70 ? '#f44336' : '#2196f3' 
                            }
                          }}
                        />
                      </Box>

                      <Divider sx={{ borderColor: 'rgba(255, 107, 53, 0.2)' }} />

                      <Typography variant="body2" sx={{ color: '#b0b0b0' }}>
                        Last maintenance: {vehicle.lastMaintenance}
                      </Typography>
                      <Typography 
                        variant="body2" 
                        sx={{ 
                          color: vehicle.nextMaintenance === 'overdue' ? '#f44336' : '#4caf50' 
                        }}
                      >
                        Next maintenance: {vehicle.nextMaintenance}
                      </Typography>
                    </Stack>
                  </Grid>

                  {/* Actions */}
                  <Grid item xs={12} md={4}>
                    <Typography variant="subtitle2" sx={{ color: '#ffffff', mb: 2 }}>
                      Actions
                    </Typography>

                    <Stack spacing={1}>
                      {/* Maintenance Actions */}
                      {maintenanceActions.map((action) => {
                        const ActionIcon = action.icon;
                        const isInProgress = maintenanceInProgress[`${vehicle.id}_${action.id}`];
                        return (
                          <Button
                            key={action.id}
                            variant="outlined"
                            startIcon={<ActionIcon />}
                            disabled={isInProgress}
                            onClick={() => handleMaintenance(vehicle.id, action.id)}
                            sx={{
                              borderColor: action.color,
                              color: action.color,
                              '&:hover': {
                                borderColor: action.color,
                                bgcolor: `${action.color}20`
                              }
                            }}
                          >
                            {isInProgress ? 'In Progress...' : action.name}
                          </Button>
                        );
                      })}

                      <Divider sx={{ borderColor: 'rgba(255, 107, 53, 0.2)', my: 1 }} />

                      {/* Upgrade Button */}
                      <Button
                        variant="contained"
                        startIcon={<UpgradeIcon />}
                        onClick={() => handleOpenUpgrades(vehicle.id)}
                        sx={{
                          bgcolor: '#ff6b35',
                          '&:hover': { bgcolor: '#e55722' }
                        }}
                      >
                        Upgrades
                      </Button>
                    </Stack>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Upgrade Dialog */}
      <VehicleUpgradeDialog
        open={upgradeDialogOpen}
        onClose={() => setUpgradeDialogOpen(false)}
        vehicleId={selectedVehicleId}
      />
    </Box>
  );
}

export default GaragePanel;
