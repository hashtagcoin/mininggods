# Terrain Collision Solution - Vehicle Clipping Prevention

## Problem
Vehicles were clipping through the terrain due to PBR materials (displacement maps, normal maps, bump maps) creating visual surface variations that weren't reflected in the collision detection system.

## Root Cause Analysis
1. **Displacement Maps**: Create actual geometric displacement with `displacementScale=1.5` and `displacementBias=-0.75`, resulting in height variations of -1.5 to +1.5 units from the base geometry.
2. **Bump Maps**: Add visual-only surface details with `bumpScale=0.3` that don't affect actual geometry.
3. **Normal Maps**: Create lighting variations that make the surface appear more detailed than the actual geometry.
4. **Height Sampling**: Was only using base terrain height data without accounting for these visual effects.

## Solution Implemented

### 1. Invisible Collision Mesh
Created a collision mesh that sits above the visual terrain to prevent clipping:
```typescript
const collisionOffset = 2.0; // 1.5 (max displacement) + 0.5 (buffer)
```

### 2. Bilinear Interpolation
Implemented smooth height sampling between terrain grid points:
```typescript
// Bilinear interpolation for smooth terrain following
const h00 = heightData[clampZ0 * worldWidth + clampX0] || 0;
const h10 = heightData[clampZ0 * worldWidth + clampX1] || 0;
const h01 = heightData[clampZ1 * worldWidth + clampX0] || 0;
const h11 = heightData[clampZ1 * worldWidth + clampX1] || 0;
```

### 3. Adjusted Material Settings
- Reduced `displacementScale` from 2.0 to 1.5
- Reduced `bumpScale` from 0.5 to 0.3
- Added `displacementBias=-0.75` to center displacement

### 4. Vehicle Height Calculation
```typescript
const collisionHeight = getTerrainHeight(x, z); // Returns base + 2.0
const visualTerrainHeight = collisionHeight - 2.0;
const vehicleHeight = visualTerrainHeight + vehicleOffset;
```

### 5. Debug Features
- Press 'C' to toggle collision mesh visibility
- Debug overlay shows current settings
- Manual offset adjustment via keyboard ([ and ])

## Technical Details

### Height Calculation Flow
1. Base terrain height from noise generation
2. Add collision offset (2.0 units)
3. Sample height with bilinear interpolation
4. Subtract collision offset for visual positioning
5. Add vehicle-specific offset (0.5 units default)

### Terrain Normal Calculation
Vehicles properly align to terrain slope using:
```typescript
const pitch = Math.atan2(normal.z, normal.y);
const roll = Math.atan2(-normal.x, normal.y);
```

## Results
- Vehicles no longer clip through terrain
- Smooth movement across uneven surfaces
- Proper rotation alignment with terrain angle
- Visual terrain retains all PBR effects
- Performance optimized with interpolation

## Usage
1. Run the application
2. Press 'C' to see collision mesh if debugging
3. Vehicles will automatically follow terrain without clipping
4. Adjust manual offset with [ and ] keys if needed