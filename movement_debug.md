# Vehicle Movement Debug Guide

## Issues Fixed:

1. **Selection circle now properly sized** - Uses bounding box dimensions (20% larger than vehicle length)
2. **Click handler stops propagation** - Prevents terrain clicks when clicking vehicles
3. **Terrain is now clickable** - Added onClick handler directly to terrain mesh
4. **Click marker added** - Green sphere shows where you clicked for 1 second
5. **Enhanced logging** - Better debug output to track movement states

## Debug Steps to Test:

1. Start server: `cd server && npm run dev`
2. Start client: `cd client && npm run dev`
3. Open browser console (F12)
4. Connect to game

## What to Look For in Console:

1. **When clicking terrain:**
   - Should see: `[InteractiveGround] ===== TERRAIN CLICKED =====`
   - Should see: `[InteractiveGround] MOVING VEHICLE [id] to: X, Z`
   - Should see green sphere at click location

2. **Vehicle position logs:**
   - Look for: `[Vehicle] Position update triggered`
   - Check `hasOptimistic: true` when you click
   - Check `vehicleHeightOffset` value (should be 0 or small)

3. **Movement state logs:**
   - Look for: `[Vehicle] Movement state:`
   - Check `isMoving`, `canMove`, `distanceToTarget`

## Potential Issues to Check:

1. **Vehicle Height Offset**: If vehicleHeightOffset is too large, vehicle might be stuck in terrain
2. **Optimistic Updates**: Make sure optimisticPosition is being set
3. **Server Response**: Check if server is processing movement commands

## Manual Offset Adjustment:
- Select your vehicle
- Press Arrow Up/Down keys to adjust height offset
- Watch console for offset values