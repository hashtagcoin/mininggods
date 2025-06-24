import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Dialog,
  DialogContent,
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Slide,
} from '@mui/material';
import {
  Close as CloseIcon,
  ArrowBack as BackIcon
} from '@mui/icons-material';
import type { TransitionProps } from '@mui/material/transitions';

import Scene3D from './Scene3D';
import HUD from './HUD';
import FleetMenu from './FleetMenu';
import GaragePanel from './GaragePanel';
import Minimap from './Minimap';
import ErrorBoundary from './ErrorBoundary';
import { useGameStore } from '../store/gameStore';
import { loopDetector } from '../utils/infiniteLoopDetector';

// Full screen slide transition for panels
const Transition = React.forwardRef(function Transition(
  props: TransitionProps & {
    children: React.ReactElement;
  },
  ref: React.Ref<unknown>,
) {
  return <Slide direction="up" ref={ref} {...props} />;
});

interface PanelDialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

function PanelDialog({ open, onClose, title, children }: PanelDialogProps) {
  return (
    <Dialog
      fullScreen
      open={open}
      onClose={onClose}
      TransitionComponent={Transition}
      PaperProps={{
        sx: {
          background: 'linear-gradient(135deg, rgba(10, 10, 25, 0.98) 0%, rgba(20, 20, 40, 0.98) 100%)',
          backgroundImage: `
            radial-gradient(circle at 20% 80%, rgba(255, 107, 53, 0.05) 0%, transparent 50%),
            radial-gradient(circle at 80% 20%, rgba(33, 150, 243, 0.05) 0%, transparent 50%),
            radial-gradient(circle at 40% 40%, rgba(156, 39, 176, 0.03) 0%, transparent 50%)
          `
        }
      }}
    >
      {/* App Bar */}
      <AppBar 
        position="fixed" 
        sx={{ 
          background: 'linear-gradient(135deg, rgba(15, 15, 35, 0.95) 0%, rgba(26, 26, 46, 0.95) 100%)',
          border: 'none',
          borderBottom: '1px solid rgba(255, 107, 53, 0.3)',
          backdropFilter: 'blur(10px)'
        }}
      >
        <Toolbar>
          <IconButton
            edge="start"
            color="inherit"
            onClick={onClose}
            sx={{ mr: 2, color: '#ffffff' }}
          >
            <BackIcon />
          </IconButton>
          
          <Typography 
            variant="h6" 
            component="div" 
            sx={{ 
              flexGrow: 1, 
              color: '#ffffff',
              fontWeight: 600
            }}
          >
            {title}
          </Typography>
          
          <IconButton
            color="inherit"
            onClick={onClose}
            sx={{ color: '#ffffff' }}
          >
            <CloseIcon />
          </IconButton>
        </Toolbar>
      </AppBar>

      {/* Content */}
      <DialogContent 
        sx={{ 
          mt: 8, 
          p: 0, 
          height: 'calc(100vh - 64px)',
          overflow: 'hidden'
        }}
      >
        {children}
      </DialogContent>
    </Dialog>
  );
}

// Initialization happens outside component to avoid re-renders
let initialized = false;
let initCount = 0;
const initializeGameOnce = () => {
  console.log(`[INIT-${++initCount}] initializeGameOnce called, initialized=${initialized}`);
  if (initialized) {
    console.log(`[INIT-${initCount}] Already initialized, returning`);
    return;
  }
  initialized = true;
  
  console.log(`[INIT-${initCount}] Getting store state`);
  const store = useGameStore.getState();
  console.log(`[INIT-${initCount}] Store state:`, {
    hasGameClient: !!store.gameClient,
    isConnected: store.isConnected,
    isConnecting: store.isConnecting
  });
  
  if (!store.gameClient) {
    console.log(`[INIT-${initCount}] Calling initializeGame`);
    store.initializeGame();
    console.log(`[INIT-${initCount}] Calling connectToServer`);
    store.connectToServer('Player');
  } else {
    console.log(`[INIT-${initCount}] GameClient already exists, skipping`);
  }
};

let renderCount = 0;
function MainGame() {
  const currentRender = ++renderCount;
  console.log(`\n[RENDER-${currentRender}] ========== MainGame render START ==========`);
  
  // Track renders for infinite loop detection
  loopDetector.track('MainGame');
  
  const isConnected = useGameStore(state => state.isConnected);
  const isConnecting = useGameStore(state => state.isConnecting);
  const [activePanel, setActivePanel] = useState<string | null>(null);
  const [showMinimap, setShowMinimap] = useState(true);

  console.log(`[RENDER-${currentRender}] State:`, { isConnected, isConnecting, activePanel });

  // Initialize once when component first mounts
  useEffect(() => {
    console.log(`[EFFECT-${currentRender}] MainGame mount effect running`);
    initializeGameOnce();
    
    return () => {
      console.log(`[EFFECT-${currentRender}] MainGame unmount cleanup`);
    };
  }, []); // Empty dependency array - only run once on mount
  
  console.log(`[RENDER-${currentRender}] ========== MainGame render END ==========\n`);

  const handleOpenPanel = (panelName: string) => {
    setActivePanel(panelName);
  };

  const handleClosePanel = () => {
    setActivePanel(null);
  };

  const getPanelTitle = (panelName: string | null) => {
    switch (panelName) {
      case 'fleet': return 'Fleet Command Center';
      case 'garage': return 'Vehicle Garage & Maintenance';
      case 'map': return 'World Map & Navigation';
      default: return '';
    }
  };

  const renderPanelContent = (panelName: string | null) => {
    switch (panelName) {
      case 'fleet':
        return <FleetMenu />;
      case 'garage':
        return <GaragePanel />;
      case 'map':
        return (
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            height: '100%',
            color: '#ffffff'
          }}>
            <Typography variant="h4" sx={{ opacity: 0.7 }}>
              World Map Coming Soon...
            </Typography>
          </Box>
        );
      default:
        return null;
    }
  };

  return (
    <Box sx={{ 
      width: '100vw', 
      height: '100vh', 
      overflow: 'hidden',
      position: 'relative',
      background: '#000000'
    }}>
      {/* 3D Scene */}
      <Box sx={{ 
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: 1
      }}>
        <ErrorBoundary>
          <Scene3D />
        </ErrorBoundary>
      </Box>

      {/* HUD Overlay */}
      <Box sx={{ 
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: 2,
        pointerEvents: 'none',
        '& > *': {
          pointerEvents: 'auto'
        }
      }}>
        <HUD 
          onOpenFleet={() => handleOpenPanel('fleet')} 
          onOpenGarage={() => handleOpenPanel('garage')} 
          onOpenMap={() => handleOpenPanel('map')} 
        />
      </Box>

      {/* Minimap Overlay */}
      {isConnected && (
        <Minimap 
          isVisible={showMinimap} 
          onClose={() => setShowMinimap(false)} 
        />
      )}

      {/* Panel Dialogs */}
      <PanelDialog
        open={activePanel !== null}
        onClose={handleClosePanel}
        title={getPanelTitle(activePanel)}
      >
        {renderPanelContent(activePanel)}
      </PanelDialog>

      {/* Connection Status Overlay (when disconnected) */}
      {!isConnected && (
        <Box sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          background: 'rgba(0, 0, 0, 0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          color: '#ffffff'
        }}>
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="h4" sx={{ mb: 2, color: '#ff6b35' }}>
              Connecting to Mining Gods Server...
            </Typography>
            <Typography variant="body1" sx={{ color: '#b0b0b0' }}>
              Status: {isConnecting ? 'Connecting...' : 'Disconnected'}
            </Typography>
          </Box>
        </Box>
      )}
    </Box>
  );
}

export default MainGame;
