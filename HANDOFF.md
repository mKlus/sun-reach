# Developer & Agent Handoff: Sun Reach

This document provides a comprehensive handover for any agent or engineer continuing development on the **Sun Reach** codebase.

---

## 1. Project Overview

**Sun Reach** (formerly `sun-penetration`) is a high-performance client-side solar modeling and architectural design application built with **Vite + React 19 + TypeScript + Leaflet**.

The application features two primary study modes:
1. **House & Awning (`?page=house`)**: Analyzes indoor solar penetration, window overhangs, and patio awning shading through a cross-section of a glass door.
2. **Trees & Vegie Garden (`?page=garden`)**: 3D ray-casting solar simulator modeling shade cast by single trees or rows of trees onto a vegetable garden enclosure, with daily daylight integration and agricultural crop suitability evaluation.

---

## 2. Quick Start & Verification Commands

```bash
# Install dependencies
npm install

# Start local development server (Vite on http://localhost:5173)
npm run dev

# Run unit tests (Vitest - 10 test files, 90 tests currently passing)
npm test

# Run linter (oxlint - 0 warnings, 0 errors)
npm run lint

# Compile TypeScript and production bundle
npm run build
```

---

## 3. Architecture & File Structure

### 3.1 Routing & Navigation
- **`src/App.tsx`**: Top-level application shell. Manages page mode (`'house'` vs `'garden'`) based on the URL search parameter `?page=...` and user clicks on the header pill switcher (`🏠 House & Awning` vs `🌳 Trees & Vegie Garden`).
- **`src/lib/scene.ts`**: Handles URL query parameter serialization. Ensures `?page=garden` is preserved when copying scene links or pushing browser history.

### 3.2 Trees & Vegie Garden Core (`src/lib/`)
- **`src/lib/gardenModel.ts`**:
  - `TreeConfig`: Defines single tree specs (height, crown diameter, trunk clearance, shape) or group/row specs (height, diameter, total group width, tree count, row rotation angle).
  - `GardenConfig`: Defines vegie garden enclosure (width, length, raised bed height, rotation angle, relative East/North offsets).
  - `getTreePositions(tree)`: Computes 2D/3D coordinates for all tree instances along the row orientation vector.
  - `getGardenCorners(garden)`: Computes rotated corner coordinates for the garden enclosure rectangle.
  - `getGardenGrid(garden, nx, ny)`: Discretizes the bed surface into regular sampling points (default 6 × 8 = 48 points) for fractional sun calculations.
  - `saveGardenInputs` / `loadGardenInputs`: Persists state to `localStorage` under `sun-reach-garden-v1`.
- **`src/lib/gardenSolar.ts`**:
  - **3D Ray-Casting**: Models tree foliage as a 3D ellipsoid and the trunk as a vertical 3D cylinder. Solves exact quadratic ray intersection $\mathbf{R}(t) = \mathbf{P} + t \mathbf{d}$ from each garden bed sample point towards the sun vector.
  - `computeGardenInstantSun(...)`: Returns `sunlitPercent`, `sunlitAreaM2`, and shaded grid point states.
  - `computeGardenDailySun(...)`: Integrates direct sunlight across daylight intervals (sunrise to sunset) at 10-minute steps.
  - `computeGardenYearlySun(...)`: 365-day seasonal integration with solstice identification.
  - `computeGardenShadowPolygons(...)`: Calculates geometric ground shadow footprints for trees based on sun azimuth and altitude.
  - `getCropSuitability(...)`: Classifies garden sunlight yield into:
    - **Full Sun (6.0+ hrs)**: Heavy fruiting vegetables (tomatoes, peppers, cucumbers, melons, zucchini).
    - **Partial Sun (3.5 – 6.0 hrs)**: Root vegetables and brassicas (carrots, beets, broccoli, peas).
    - **Shade (< 3.5 hrs)**: Leafy greens and shade herbs (lettuce, spinach, kale, mint).
- **`src/lib/gardenSolar.test.ts`**: 10 unit tests verifying single trees, tree groups, ray-casting accuracy, shadow projection, and crop suitability logic.
- **`src/lib/useGardenSession.ts`**: Custom React hook managing garden configuration state, presets, and local storage synchronization.
- **`src/lib/useGardenSunSeries.ts`**: Reactive hook computing solar azimuth, altitude, day curve series, and debounced yearly simulation.

### 3.3 UI Components (`src/components/`)
- **`src/components/GardenPage.tsx`**: Main garden study page layout containing the left control sidebar, main gallery cards, and modal dialogues.
- **`src/components/GardenMap.tsx`**:
  - Interactive Leaflet map.
  - **Tile Layer Switcher**: Toggle between `🗺️ Map` (OpenStreetMap street layer - default) and `🛰️ Satellite` (Esri World Imagery). Resolves map visibility at close zooms (18–19).
  - Real-time ground shadow polygon projection.
  - Draggable 🌳 Tree and 🥕 Vegie Garden pins.
- **`src/components/LayoutControls.tsx`**:
  - Secondary move and rotate panel.
  - Target selection toggle (`[ 🥕 Vegie Garden ]` vs `[ 🌳 Trees ]`).
  - Directional D-pad with step-size selectors (`0.5m`, `1.0m`, `2.5m`).
  - Discrete rotation buttons (`-45°`, `-15°`, `+15°`, `+45°`, and cardinal angles).
  - Continuous 0°–360° rotation slider.
  - Polar distance/bearing sliders and 1-click alignment presets.
- **`src/components/GardenSunPlan.tsx`**:
  - Interactive 2D top-down plan view.
  - Supports direct SVG drag-and-drop to position objects.
  - Interactive circular rotation levers to rotate the bed enclosure or tree row directly on canvas.
  - Tab switch between `🧭 2D Sun Plan (Drag/Rotate)` and `🕹️ Move & Rotate Controls`.
- **`src/components/GardenSectionCanvas.tsx`**:
  - 2D architectural elevation cut along the solar azimuth ray.
  - Shows tree crown, trunk clearance, sun altitude ray angle, raised garden bed, and ground shadow footprint.
- **`src/components/GardenDaySunChart.tsx`**:
  - SVG daylight sun curve showing percentage of garden bed lit from dawn to dusk.
  - Interactive time scrubber.
- **`src/components/GardenYearSunChart.tsx`**:
  - 365-day seasonal direct sun curve.
  - Solstice indicators and CSV export.
- **`src/components/GardenResultsPanel.tsx`**:
  - Summary readouts, instant sunlit area ($m^2$), and crop suitability guidance.
- **`src/components/ConsoleTreeGarden.tsx`**:
  - Sidebar panel with numeric inputs, tree group sliders, bed dimensions, and embedded `LayoutControls`.

---

## 4. Key Design Decisions & Conventions

1. **Relative Coordinate Convention**:
   - The tree anchor is fixed at local origin $(0, 0)$ tied to the geographic latitude/longitude.
   - The vegie garden is positioned at $(x, y) = (\text{offsetEast}, \text{offsetNorth})$ in meters.
   - Moving the vegie garden North/East increases offsets.
   - Moving the tree North/East decreases offsets (shifting the garden South/West relative to the tree), ensuring intuitive movement regardless of which target is selected.
2. **Map Visibility**:
   - Default map layer is OpenStreetMap (`🗺️ Map`) because Esri satellite tiles can appear as abstract textures at zoom level 18–19 on buildings or roofs (e.g. Sydney Opera House). Users can toggle to `🛰️ Satellite` at any time.
3. **Design System & Styling**:
   - Styled via semantic CSS variables (`var(--ink)`, `var(--lift)`, `var(--hair)`, `var(--raised)`, `var(--sun)`, `var(--moss)`).
   - Full dark mode and light mode support via `data-theme="auto|light|dark"`.
   - Modals use clean dialog overlays with backdrop blur and Escape key dismissal.

---

## 5. Potential Future Enhancements

If extending this feature further, consider:
- **Multiple Species & Tree Shapes**: Support conical/conifer shapes (cylinder/cone) or columnar poplars in addition to ellipsoids.
- **Multiple Disconnected Beds or Obstacles**: Allow configuring multiple garden boxes or adding existing structures (e.g. boundary fences, shed walls).
- **Custom Crop Database**: A searchable directory of vegetable varieties with their specific DLI (Daily Light Integral) or minimum direct sun requirements.
- **PDF/PNG Export**: One-click print-ready plan export combining the map view, elevation section, and seasonal daylight table.
