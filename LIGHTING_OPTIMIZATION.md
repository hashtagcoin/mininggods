# Lighting Optimization for Mining Gods

## Problem
The scene had conflicting lighting setups that could cause:
- Overexposure (too bright)
- Multiple shadow directions
- Unrealistic lighting for a lunar/space environment
- Performance issues from too many light sources

## Issues Found
1. **HDRI Environment Map** at full intensity competing with directional lights
2. **Multiple directional lights** with high intensities
3. **Point lights** on vehicles adding to overall scene brightness
4. **Unused DynamicLighting component** with 5x multiplied intensities

## Solution Implemented

### 1. Balanced HDRI and Directional Lights
```typescript
<Environment
  intensity={0.3} // Reduced from 1.0 - now acts as subtle ambient fill
/>
<directionalLight
  intensity={1.5} // Reduced from 2.0 to work with HDRI
/>
```

### 2. Simplified Light Hierarchy
- **Primary**: Single strong directional light (sun) with shadows
- **Secondary**: Very subtle fill light (0.15 intensity) without shadows
- **Ambient**: Minimal ambient light (0.05) with blue tint for space feel

### 3. Vehicle Light Adjustments
```typescript
<pointLight 
  intensity={0.5} // Reduced from 2.0
  distance={5}    // Reduced from 10
/>
```

### 4. Color Temperature
- Sun light: `#ffffee` (slightly warm white)
- Fill light: `#8899ff` (cool blue)
- Ambient: `#404060` (dark blue-gray)

## Benefits
1. **Realistic lunar lighting** - Strong directional shadows like real moon surface
2. **Better performance** - Fewer light calculations
3. **No overexposure** - Balanced intensities
4. **Clear shadows** - Single shadow direction from main sun
5. **PBR materials look correct** - HDRI provides proper reflections

## Lighting Values Summary
| Light Type | Old Intensity | New Intensity | Purpose |
|------------|---------------|---------------|---------|
| HDRI Environment | 1.0 (implicit) | 0.3 | Ambient fill & reflections |
| Main Directional | 2.0 | 1.5 | Primary sun light |
| Fill Directional | 0.3 | 0.15 | Soften shadows |
| Ambient Light | 0.1 | 0.05 | Prevent pure black |
| Vehicle Point Light | 2.0 | 0.5 | Local glow effect |

## Result
The scene now has a more realistic lunar/space aesthetic with proper contrast between lit and shadowed areas, while maintaining good visibility for gameplay.