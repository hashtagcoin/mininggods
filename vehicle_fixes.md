# Vehicle Movement and Selection Fixes

## Changes Made:

### 1. Selection Circle Size Fix
- **Problem**: Selection circle was too large (diameter was 18-22 units)
- **Solution**: Changed selection circle to use actual vehicle bounding box dimensions
  - Inner radius: 60% of vehicle length
  - Outer radius: 72% of vehicle length (20% larger diameter than vehicle)
  - File: `client/src/components/Scene3D.tsx` line 891

### 2. Vehicle Movement Fix
- **Problem**: Player vehicles weren't moving when clicking on terrain
- **Root Cause**: Server was directly setting position instead of processing movement
- **Solutions**:
  
  a. Updated `handleVehicleMove` in server to set target position and rotation:
     - Sets `targetX`, `targetZ` for destination
     - Calculates `targetRotation` for turn-then-move behavior
     - File: `server/src/rooms/GameRoom.ts` line 418
  
  b. Updated `processVehicleMovement` to handle both AI and player vehicles:
     - Removed early return for player vehicles
     - Player vehicles move at 8 units/second (faster than AI at 5 units/second)
     - File: `server/src/rooms/GameRoom.ts` line 154
  
  c. Added proper idle state transition for player vehicles:
     - When player vehicle reaches destination, status changes to "idle"
     - File: `server/src/rooms/GameRoom.ts` line 335

## Testing:
1. Start server: `cd server && npm run dev`
2. Start client: `cd client && npm run dev`
3. Select your mining rig - selection circle should be small (just slightly larger than vehicle)
4. Click on terrain - vehicle should rotate toward destination then drive to it
5. Vehicle should stop and become idle when reaching destination