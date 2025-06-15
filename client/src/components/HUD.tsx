import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  IconButton,
  Chip,
  Avatar,
  Button,
  Tooltip,
  Badge,
  LinearProgress,
  Grid,
  Collapse,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Stack,
  Paper,
  Fab
} from '@mui/material';
import {
  Menu as MenuIcon,
  Notifications as NotificationsIcon,
  Settings as SettingsIcon,
  DirectionsCar as FleetIcon,
  Build as GarageIcon,
  Map as MapIcon,
  Dashboard as DashboardIcon,
  AccountBalance as CreditsIcon,
  LocalGasStation as FuelIcon,
  Diamond as OreIcon,
  Speed as SpeedIcon,
  Warning as WarningIcon,
  CheckCircle as SuccessIcon,
  Info as InfoIcon,
  Close as CloseIcon,
  ExpandLess as ExpandLessIcon,
  ExpandMore as ExpandMoreIcon,
  Fullscreen as FullscreenIcon,
  FullscreenExit as FullscreenExitIcon,
  VolumeUp as VolumeIcon,
  VolumeOff as VolumeMuteIcon,
  ZoomIn as ZoomInIcon,
  ZoomOut as ZoomOutIcon,
  CenterFocusStrong as CenterIcon
} from '@mui/icons-material';
import { useGameStore } from '../store/gameStore';

interface NotificationItem {
  id: string;
  type: 'success' | 'warning' | 'error' | 'info';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
}

// Mock notifications
const mockNotifications: NotificationItem[] = [
  {
    id: 'notif_001',
    type: 'success',
    title: 'Mining Complete',
    message: 'Titan Hauler MK-I has completed mining operation and collected 450 units of ore.',
    timestamp: new Date(Date.now() - 5 * 60 * 1000), // 5 minutes ago
    read: false
  },
  {
    id: 'notif_002',
    type: 'warning',
    title: 'Low Fuel Warning',
    message: 'Swift Miner v2.1 fuel level is below 35%. Consider refueling soon.',
    timestamp: new Date(Date.now() - 15 * 60 * 1000), // 15 minutes ago
    read: false
  },
  {
    id: 'notif_003',
    type: 'info',
    title: 'New Ore Deposit',
    message: 'High-quality ore deposit discovered at coordinates (67, -45).',
    timestamp: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
    read: true
  }
];

interface QuickStatsProps {
  credits: number;
  totalOre: number;
  activeVehicles: number;
  totalVehicles: number;
}

function QuickStats({ credits, totalOre, activeVehicles, totalVehicles }: QuickStatsProps) {
  return (
    <Card
      sx={{
        background: 'linear-gradient(135deg, rgba(15, 15, 35, 0.9) 0%, rgba(26, 26, 46, 0.9) 100%)',
        border: '1px solid rgba(255, 107, 53, 0.3)',
        backdropFilter: 'blur(10px)',
        borderRadius: 2
      }}
    >
      <CardContent sx={{ p: 2 }}>
        <Grid container spacing={2}>
          <Grid item xs={3}>
            <Box sx={{ textAlign: 'center' }}>
              <CreditsIcon sx={{ color: '#ffc107', mb: 0.5 }} />
              <Typography variant="h6" sx={{ color: '#ffc107', fontWeight: 600, fontSize: '1rem' }}>
                ${credits.toLocaleString()}
              </Typography>
              <Typography variant="caption" sx={{ color: '#b0b0b0' }}>
                Credits
              </Typography>
            </Box>
          </Grid>
          
          <Grid item xs={3}>
            <Box sx={{ textAlign: 'center' }}>
              <OreIcon sx={{ color: '#4caf50', mb: 0.5 }} />
              <Typography variant="h6" sx={{ color: '#4caf50', fontWeight: 600, fontSize: '1rem' }}>
                {totalOre.toLocaleString()}
              </Typography>
              <Typography variant="caption" sx={{ color: '#b0b0b0' }}>
                Ore
              </Typography>
            </Box>
          </Grid>
          
          <Grid item xs={3}>
            <Box sx={{ textAlign: 'center' }}>
              <FleetIcon sx={{ color: '#2196f3', mb: 0.5 }} />
              <Typography variant="h6" sx={{ color: '#2196f3', fontWeight: 600, fontSize: '1rem' }}>
                {activeVehicles}/{totalVehicles}
              </Typography>
              <Typography variant="caption" sx={{ color: '#b0b0b0' }}>
                Fleet
              </Typography>
            </Box>
          </Grid>
          
          <Grid item xs={3}>
            <Box sx={{ textAlign: 'center' }}>
              <SpeedIcon sx={{ color: '#9c27b0', mb: 0.5 }} />
              <Typography variant="h6" sx={{ color: '#9c27b0', fontWeight: 600, fontSize: '1rem' }}>
                95%
              </Typography>
              <Typography variant="caption" sx={{ color: '#b0b0b0' }}>
                Efficiency
              </Typography>
            </Box>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
}

interface NotificationsPanelProps {
  notifications: NotificationItem[];
  onMarkAsRead: (id: string) => void;
  onClearAll: () => void;
}

function NotificationsPanel({ notifications, onMarkAsRead, onClearAll }: NotificationsPanelProps) {
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'success': return <SuccessIcon sx={{ color: '#4caf50' }} />;
      case 'warning': return <WarningIcon sx={{ color: '#ffc107' }} />;
      case 'error': return <WarningIcon sx={{ color: '#f44336' }} />;
      default: return <InfoIcon sx={{ color: '#2196f3' }} />;
    }
  };

  const formatTimeAgo = (timestamp: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - timestamp.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  return (
    <Card
      sx={{
        background: 'linear-gradient(135deg, rgba(15, 15, 35, 0.95) 0%, rgba(26, 26, 46, 0.95) 100%)',
        border: '1px solid rgba(255, 107, 53, 0.3)',
        backdropFilter: 'blur(10px)',
        borderRadius: 2,
        maxHeight: '400px',
        width: '350px'
      }}
    >
      <CardContent sx={{ p: 0 }}>
        <Box sx={{ p: 2, borderBottom: '1px solid rgba(255, 107, 53, 0.2)' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6" sx={{ color: '#ffffff' }}>
              Notifications
            </Typography>
            <Button
              size="small"
              onClick={onClearAll}
              sx={{ color: '#b0b0b0', minWidth: 'auto' }}
            >
              Clear All
            </Button>
          </Box>
        </Box>

        <List sx={{ maxHeight: '300px', overflow: 'auto', p: 0 }}>
          {notifications.length === 0 ? (
            <ListItem>
              <ListItemText
                primary="No notifications"
                primaryTypographyProps={{ color: '#b0b0b0', textAlign: 'center' }}
              />
            </ListItem>
          ) : (
            notifications.map((notification) => (
              <ListItem
                key={notification.id}
                sx={{
                  borderBottom: '1px solid rgba(255, 107, 53, 0.1)',
                  bgcolor: notification.read ? 'transparent' : 'rgba(255, 107, 53, 0.05)',
                  cursor: 'pointer',
                  '&:hover': { bgcolor: 'rgba(255, 107, 53, 0.1)' }
                }}
                onClick={() => onMarkAsRead(notification.id)}
              >
                <ListItemIcon sx={{ minWidth: 35 }}>
                  {getNotificationIcon(notification.type)}
                </ListItemIcon>
                <ListItemText
                  primary={notification.title}
                  secondary={
                    <Box>
                      <Typography variant="body2" sx={{ color: '#b0b0b0', mb: 0.5 }}>
                        {notification.message}
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#888' }}>
                        {formatTimeAgo(notification.timestamp)}
                      </Typography>
                    </Box>
                  }
                  primaryTypographyProps={{
                    color: '#ffffff',
                    fontWeight: notification.read ? 400 : 600
                  }}
                />
              </ListItem>
            ))
          )}
        </List>
      </CardContent>
    </Card>
  );
}

interface HUDProps {
  onOpenFleet: () => void;
  onOpenGarage: () => void;
  onOpenMap: () => void;
}

function HUD({ onOpenFleet, onOpenGarage, onOpenMap }: HUDProps) {
  const { gameState, isConnected, connectionStatus } = useGameStore();
  const [notifications, setNotifications] = useState<NotificationItem[]>(mockNotifications);
  const [showNotifications, setShowNotifications] = useState(false);
  const [isMenuExpanded, setIsMenuExpanded] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [showQuickStats, setShowQuickStats] = useState(true);

  // Mock game stats
  const gameStats = {
    credits: 45750,
    totalOre: 2840,
    activeVehicles: 2,
    totalVehicles: 3
  };

  const unreadNotifications = notifications.filter(n => !n.read).length;

  const handleMarkAsRead = (id: string) => {
    setNotifications(prev => 
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    );
  };

  const handleClearAll = () => {
    setNotifications([]);
    setShowNotifications(false);
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  // Connection status indicator
  const getConnectionStatus = () => {
    if (isConnected) {
      return { color: '#4caf50', text: 'Connected', icon: SuccessIcon };
    } else {
      return { color: '#f44336', text: 'Disconnected', icon: WarningIcon };
    }
  };

  const connStatus = getConnectionStatus();
  const ConnStatusIcon = connStatus.icon;

  return (
    <Box
      sx={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        pointerEvents: 'none',
        zIndex: 1000
      }}
    >
      {/* Top Bar */}
      <Box sx={{ position: 'absolute', top: 16, left: 16, right: 16, pointerEvents: 'auto' }}>
        <Grid container spacing={2} alignItems="flex-start">
          {/* Left Side - Quick Stats */}
          <Grid item xs={8}>
            <Collapse in={showQuickStats}>
              <QuickStats {...gameStats} />
            </Collapse>
          </Grid>

          {/* Right Side - Controls */}
          <Grid item xs={4}>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
              {/* Connection Status */}
              <Tooltip title={`Server ${connStatus.text}`}>
                <Chip
                  icon={<ConnStatusIcon />}
                  label={connStatus.text}
                  size="small"
                  sx={{
                    bgcolor: connStatus.color,
                    color: '#ffffff',
                    '& .MuiChip-icon': { color: '#ffffff' }
                  }}
                />
              </Tooltip>

              {/* Notifications */}
              <Tooltip title="Notifications">
                <IconButton
                  onClick={() => setShowNotifications(!showNotifications)}
                  sx={{
                    bgcolor: 'rgba(15, 15, 35, 0.9)',
                    border: '1px solid rgba(255, 107, 53, 0.3)',
                    color: '#ffffff',
                    '&:hover': { bgcolor: 'rgba(26, 26, 46, 0.9)' }
                  }}
                >
                  <Badge badgeContent={unreadNotifications} color="error">
                    <NotificationsIcon />
                  </Badge>
                </IconButton>
              </Tooltip>

              {/* Settings */}
              <Tooltip title="Settings">
                <IconButton
                  sx={{
                    bgcolor: 'rgba(15, 15, 35, 0.9)',
                    border: '1px solid rgba(255, 107, 53, 0.3)',
                    color: '#ffffff',
                    '&:hover': { bgcolor: 'rgba(26, 26, 46, 0.9)' }
                  }}
                >
                  <SettingsIcon />
                </IconButton>
              </Tooltip>
            </Box>
          </Grid>
        </Grid>

        {/* Notifications Panel */}
        {showNotifications && (
          <Box sx={{ position: 'absolute', top: 60, right: 0 }}>
            <NotificationsPanel
              notifications={notifications}
              onMarkAsRead={handleMarkAsRead}
              onClearAll={handleClearAll}
            />
          </Box>
        )}
      </Box>

      {/* Left Side Menu */}
      <Box sx={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'auto' }}>
        <Stack spacing={1}>
          {/* Menu Toggle */}
          <Tooltip title={isMenuExpanded ? "Collapse Menu" : "Expand Menu"} placement="right">
            <IconButton
              onClick={() => setIsMenuExpanded(!isMenuExpanded)}
              sx={{
                bgcolor: 'rgba(15, 15, 35, 0.9)',
                border: '1px solid rgba(255, 107, 53, 0.3)',
                color: '#ffffff',
                '&:hover': { bgcolor: 'rgba(26, 26, 46, 0.9)' }
              }}
            >
              {isMenuExpanded ? <ExpandLessIcon /> : <MenuIcon />}
            </IconButton>
          </Tooltip>

          {/* Menu Items */}
          <Collapse in={isMenuExpanded} orientation="vertical">
            <Stack spacing={1}>
              <Tooltip title="Fleet Command" placement="right">
                <IconButton
                  onClick={onOpenFleet}
                  sx={{
                    bgcolor: 'rgba(15, 15, 35, 0.9)',
                    border: '1px solid rgba(255, 107, 53, 0.3)',
                    color: '#ffffff',
                    '&:hover': { bgcolor: 'rgba(26, 26, 46, 0.9)' }
                  }}
                >
                  <FleetIcon />
                </IconButton>
              </Tooltip>

              <Tooltip title="Vehicle Garage" placement="right">
                <IconButton
                  onClick={onOpenGarage}
                  sx={{
                    bgcolor: 'rgba(15, 15, 35, 0.9)',
                    border: '1px solid rgba(255, 107, 53, 0.3)',
                    color: '#ffffff',
                    '&:hover': { bgcolor: 'rgba(26, 26, 46, 0.9)' }
                  }}
                >
                  <GarageIcon />
                </IconButton>
              </Tooltip>

              <Tooltip title="World Map" placement="right">
                <IconButton
                  onClick={onOpenMap}
                  sx={{
                    bgcolor: 'rgba(15, 15, 35, 0.9)',
                    border: '1px solid rgba(255, 107, 53, 0.3)',
                    color: '#ffffff',
                    '&:hover': { bgcolor: 'rgba(26, 26, 46, 0.9)' }
                  }}
                >
                  <MapIcon />
                </IconButton>
              </Tooltip>

              <Tooltip title="Dashboard" placement="right">
                <IconButton
                  sx={{
                    bgcolor: 'rgba(15, 15, 35, 0.9)',
                    border: '1px solid rgba(255, 107, 53, 0.3)',
                    color: '#ffffff',
                    '&:hover': { bgcolor: 'rgba(26, 26, 46, 0.9)' }
                  }}
                >
                  <DashboardIcon />
                </IconButton>
              </Tooltip>
            </Stack>
          </Collapse>
        </Stack>
      </Box>

      {/* Right Side Controls */}
      <Box sx={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'auto' }}>
        <Stack spacing={1}>
          <Tooltip title="Toggle Quick Stats" placement="left">
            <IconButton
              onClick={() => setShowQuickStats(!showQuickStats)}
              sx={{
                bgcolor: 'rgba(15, 15, 35, 0.9)',
                border: '1px solid rgba(255, 107, 53, 0.3)',
                color: showQuickStats ? '#ff6b35' : '#ffffff',
                '&:hover': { bgcolor: 'rgba(26, 26, 46, 0.9)' }
              }}
            >
              <DashboardIcon />
            </IconButton>
          </Tooltip>

          <Tooltip title="Zoom In" placement="left">
            <IconButton
              sx={{
                bgcolor: 'rgba(15, 15, 35, 0.9)',
                border: '1px solid rgba(255, 107, 53, 0.3)',
                color: '#ffffff',
                '&:hover': { bgcolor: 'rgba(26, 26, 46, 0.9)' }
              }}
            >
              <ZoomInIcon />
            </IconButton>
          </Tooltip>

          <Tooltip title="Zoom Out" placement="left">
            <IconButton
              sx={{
                bgcolor: 'rgba(15, 15, 35, 0.9)',
                border: '1px solid rgba(255, 107, 53, 0.3)',
                color: '#ffffff',
                '&:hover': { bgcolor: 'rgba(26, 26, 46, 0.9)' }
              }}
            >
              <ZoomOutIcon />
            </IconButton>
          </Tooltip>

          <Tooltip title="Center View" placement="left">
            <IconButton
              sx={{
                bgcolor: 'rgba(15, 15, 35, 0.9)',
                border: '1px solid rgba(255, 107, 53, 0.3)',
                color: '#ffffff',
                '&:hover': { bgcolor: 'rgba(26, 26, 46, 0.9)' }
              }}
            >
              <CenterIcon />
            </IconButton>
          </Tooltip>
        </Stack>
      </Box>

      {/* Bottom Right Controls */}
      <Box sx={{ position: 'absolute', bottom: 16, right: 16, pointerEvents: 'auto' }}>
        <Stack spacing={1} direction="row">
          <Tooltip title={isMuted ? "Unmute" : "Mute"}>
            <IconButton
              onClick={() => setIsMuted(!isMuted)}
              sx={{
                bgcolor: 'rgba(15, 15, 35, 0.9)',
                border: '1px solid rgba(255, 107, 53, 0.3)',
                color: isMuted ? '#f44336' : '#ffffff',
                '&:hover': { bgcolor: 'rgba(26, 26, 46, 0.9)' }
              }}
            >
              {isMuted ? <VolumeMuteIcon /> : <VolumeIcon />}
            </IconButton>
          </Tooltip>

          <Tooltip title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}>
            <IconButton
              onClick={toggleFullscreen}
              sx={{
                bgcolor: 'rgba(15, 15, 35, 0.9)',
                border: '1px solid rgba(255, 107, 53, 0.3)',
                color: '#ffffff',
                '&:hover': { bgcolor: 'rgba(26, 26, 46, 0.9)' }
              }}
            >
              {isFullscreen ? <FullscreenExitIcon /> : <FullscreenIcon />}
            </IconButton>
          </Tooltip>
        </Stack>
      </Box>

      {/* Mini Progress Indicator (for ongoing operations) */}
      <Box sx={{ position: 'absolute', bottom: 16, left: 16, pointerEvents: 'auto' }}>
        <Card
          sx={{
            background: 'linear-gradient(135deg, rgba(15, 15, 35, 0.9) 0%, rgba(26, 26, 46, 0.9) 100%)',
            border: '1px solid rgba(255, 107, 53, 0.3)',
            backdropFilter: 'blur(10px)',
            borderRadius: 2,
            minWidth: 250
          }}
        >
          <CardContent sx={{ p: 2 }}>
            <Typography variant="body2" sx={{ color: '#ffffff', mb: 1 }}>
              Current Operations
            </Typography>
            
            <Box sx={{ mb: 1 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                <Typography variant="caption" sx={{ color: '#b0b0b0' }}>
                  Titan Hauler - Mining
                </Typography>
                <Typography variant="caption" sx={{ color: '#4caf50' }}>
                  73%
                </Typography>
              </Box>
              <LinearProgress
                variant="determinate"
                value={73}
                sx={{
                  bgcolor: 'rgba(76, 175, 80, 0.2)',
                  '& .MuiLinearProgress-bar': { bgcolor: '#4caf50' }
                }}
              />
            </Box>

            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                <Typography variant="caption" sx={{ color: '#b0b0b0' }}>
                  Swift Miner - Returning
                </Typography>
                <Typography variant="caption" sx={{ color: '#ff9800' }}>
                  45%
                </Typography>
              </Box>
              <LinearProgress
                variant="determinate"
                value={45}
                sx={{
                  bgcolor: 'rgba(255, 152, 0, 0.2)',
                  '& .MuiLinearProgress-bar': { bgcolor: '#ff9800' }
                }}
              />
            </Box>
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
}

export default HUD;
