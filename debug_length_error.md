# Debug Guide for "Cannot read properties of undefined (reading 'length')" Error

## Changes Made to Fix Potential Issues:

1. **Added try-catch blocks** around vehicles and players processing in useMemo
2. **Added null checks** before using .map():
   - `players && Array.isArray(players) && players.map(...)`
   - `vehicles && Array.isArray(vehicles) && vehicles.map(...)`
   - `localOres && Array.isArray(localOres) && localOres.map(...)`
3. **Added safety check** for heightData in terrain generation
4. **Added null check** for vehicles.length comparison

## To Debug Further:

1. Open browser DevTools (F12)
2. Go to Console tab
3. Look for error stack trace - it should show exact file and line number
4. Enable "Pause on exceptions" in DevTools:
   - Click Sources tab
   - Click pause icon (||) 
   - Check "Pause on caught exceptions"
   - Reload the page

## Common Causes:

1. **Race condition** - Data not loaded yet when component renders
2. **MapSchema vs Array** - Colyseus MapSchema doesn't have .length property directly
3. **Undefined state** - Component rendering before state is initialized

## Quick Test:
Add this to beginning of Scene3D component to see what's undefined:

```javascript
console.log('Scene3D Debug:', {
  gameState,
  players,
  vehicles,
  playersType: Array.isArray(players) ? 'array' : typeof players,
  vehiclesType: Array.isArray(vehicles) ? 'array' : typeof vehicles
});
```

## If Error Persists:
Please share:
1. Full error stack trace from console
2. Which line number the error occurs on
3. Any other console errors or warnings