Of course. Here is a detailed Themes Document.

This document centralizes the visual style, color palette, typography, and component design for the "Mining Gods" application. It serves as a single source of truth for designers and developers to ensure a consistent and high-quality user experience across all screens, from the main menu to the in-game HUD.

This is designed to be directly translatable into a theme file for **Material UI (MUI)** with compatibility for future React Native conversion.

---

### **Mining Gods – UI Theme & Style Guide**
**Version:** 1.1
**Date:** 11 June 2025
**Purpose:** To define and centralize the visual identity and user interface style for the application.
**Framework:** Material UI (MUI) for React.js MVP, with React Native compatibility for mobile conversion.

### **1. Core Philosophy: "Industrial Sci-Fi Realism"**

The UI should feel like professional-grade software for operating heavy, futuristic machinery. It is functional, clean, and data-driven, but with a rugged, industrial aesthetic. It is not overly sleek or "Apple-like." Think the user interface of the Nostromo in *Alien*, the displays in *The Expanse*, or the cockpits in *MechWarrior*.

**Key Principles:**
*   **Function over Form:** Clarity and readability are paramount. Every element must serve a purpose.
*   **Data-Rich:** Interfaces should comfortably display numerical data, progress bars, and status icons without feeling cluttered.
*   **Tactile & Grounded:** Buttons and interactive elements should feel satisfying to press. The design should have a sense of physical weight and presence.
*   **Monochromatic with Purposeful Color:** The primary palette is grayscale, using color sparingly and strategically to draw attention to critical information.

### **2. Color Palette**

The palette is designed for high contrast and readability, especially on a complex 3D background.

| Role | Color Name | HEX Code | RGB | Usage |
| :--- | :--- | :--- | :--- | :--- |
| **Primary Background** | `brand.900` (Charcoal) | `#1A202C` | 26, 32, 44 | Main app background, modal backdrops. |
| **Panel Background**| `brand.800` (Slate) | `#2D3748` | 45, 55, 72 | Background for menus, sidebars, and UI panels. |
| **Borders / Dividers**| `brand.700` (Steel) | `#4A5568` | 74, 85, 104 | Borders, lines, inactive icon outlines. |
| **Primary Text** | `brand.50` (Off-White) | `#F7FAFC` | 247, 250, 252 | Main body text, labels. |
| **Secondary Text** | `brand.300` (Grey) | `#A0AEC0` | 160, 174, 192 | Subtitles, disabled text, placeholder text. |
| **Primary Action** | `accent.400` (Amber) | `#F6AD55` | 246, 173, 85 | Main buttons (Upgrade, Summon), highlights, selections. |
| **Success / Positive** | `success.400` (Green) | `#48BB78` | 72, 187, 120 | Confirmation messages, positive stat changes. |
| **Warning / Danger**| `danger.400` (Red) | `#F56565` | 245, 101, 101 | Error messages, low fuel/health warnings. |
| **Info / BASH Coin** | `info.400` (Cyan) | `#4FD1C5` | 79, 209, 197 | BASH Coin totals, special item highlights. |

### **3. Typography**

We will use a single, highly-legible font family with distinct weights to create hierarchy.

*   **Font Family:** **`Roboto`** or **`Inter`** (Imported from Google Fonts).
    *   **Rationale:** Both are modern, sans-serif fonts designed for screen readability at various sizes. They have excellent weight support and a slightly condensed, technical feel.

*   **Font Scale & Usage:**
    *   **`h1` (Page Title):** 30px, `Roboto Bold (700)`, `color: brand.50` - Used for main screen titles like "GARAGE" or "MARKETPLACE".
    *   **`h2` (Section Title):** 24px, `Roboto Medium (500)`, `color: brand.50` - Used for sections within a panel, like "Power Plant" or "Cargo Bay".
    *   **`h3` (Item Title):** 18px, `Roboto Bold (700)`, `color: brand.50` - Used for specific item names, like "Mark II Engine".
    *   **`body` (Main Text):** 16px, `Roboto Regular (400)`, `color: brand.50` - Standard text for descriptions and labels.
    *   **`caption` (Small Text):** 14px, `Roboto Regular (400)`, `color: brand.300` - Used for secondary info, tooltips, and legal text.
    *   **`button` (Button Text):** 16px, `Roboto Bold (700)`, `text-transform: uppercase` - All button text is uppercase and bold for clarity and impact.

### **4. Component Styles**

This section defines the visual appearance of common UI components.

#### **4.1. Buttons**
*   **Primary Action Button:**
    *   `background`: `accent.400` (Amber)
    *   `color`: `brand.900` (Charcoal)
    *   `border`: None
    *   `box-shadow`: Subtle inner shadow to give a "pressed" feel on hover/click.
    *   `border-radius`: 4px (Slightly rounded corners, not a pill shape).
*   **Secondary/Standard Button:**
    *   `background`: `brand.800` (Slate)
    *   `color`: `brand.50` (Off-White)
    *   `border`: `1px solid brand.700` (Steel)
    *   `hover`: `background: brand.700`
*   **Destructive Button:**
    *   `background`: `danger.400` (Red)
    *   `color`: `brand.50` (Off-White)

#### **4.2. Panels & Modals (e.g., Garage, Shop Menu)**
*   `background-color`: `brand.800` (Slate)
*   `border`: `1px solid brand.700` (Steel)
*   `border-radius`: 8px
*   `backdrop-filter`: `blur(4px)` on the background behind the modal to focus user attention.
*   `box-shadow`: No external shadow. The design is flat and integrated into the main background.

#### **4.3. Input Fields**
*   `background-color`: `brand.900` (Charcoal)
*   `border`: `1px solid brand.700` (Steel)
*   `color`: `brand.50` (Off-White)
*   `focus`: Border color changes to `accent.400` (Amber).
*   `placeholder-text-color`: `brand.300` (Grey)

#### **4.4. Progress Bars (e.g., Fuel, Cargo)**
*   **Track:**
    *   `background`: `brand.900` (Charcoal)
    *   `border`: `1px solid brand.700`
*   **Filled Track:**
    *   **Fuel:** `background`: `accent.400` (Amber)
    *   **Cargo:** `background`: `info.400` (Cyan)
    *   **Health:** `background`: `success.400` (Green)
*   **Thresholds:** When a value drops below 25%, the bar's color should change to `danger.400` (Red) and optionally have a subtle pulsing animation.

#### **4.5. Icons**
*   **Icon Set:** **`Feather Icons`** or **`Remix Icon`**.
    *   **Rationale:** Both offer a clean, consistent, line-art style that fits the industrial aesthetic.
*   **Default State:** `color: brand.300` (Grey), `size: 24px`
*   **Active/Hover State:** `color: brand.50` (Off-White)

### **5. In-Game HUD**

The HUD uses the same theme but prioritizes minimalism to avoid obscuring the 3D view.
*   **Backgrounds:** All HUD elements will have a semi-transparent background (`brand.900` at 75% opacity) to blend with the game world.
*   **Text:** All HUD text will have a subtle `text-shadow` (e.g., `1px 1px 2px #000000`) to ensure readability against any terrain color.
*   **Mini-Map:** A circular frame with a `border: 1px solid brand.700`. The map itself will use simple vector lines, with key icons (player, base, ore) in high-contrast colors.

### **6. Implementation Example (for Material UI)**

This shows how the palette would be structured in a Material UI theme file.

```javascript
// theme.js
import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    brand: {
      50: '#F7FAFC',
      300: '#A0AEC0',
      700: '#4A5568',
      800: '#2D3748',
      900: '#1A202C',
    },
    accent: {
      400: '#F6AD55',
    },
    danger: {
      400: '#F56565',
    },
    success: {
        400: '#48BB78'
    },
    info: {
        400: '#4FD1C5'
    }
  },
  typography: {
    fontFamily: `'Roboto', sans-serif`,
  },
  // ... component style overrides
});

export default theme;
```