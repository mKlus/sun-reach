# Sun Reach

A Vite + React 19 + TypeScript solar simulator and architectural design aid featuring two specialized study modes:

1. **House & Awning**: Section through a glass door and sloped awning, calculating indoor solar heating, reach, and summer shade.
2. **Trees & Vegie Garden**: Satellite map projection and 3D ray-cast shadow simulator for single trees or tree groups/hedges next to a vegie garden enclosure, calculating daily sunlight hours, sunlit area, and seasonal vegetable crop suitability.

On a first visit the app asks for the device location. If that is blocked or missing, it falls back to the **Sydney Opera House**. After that, the site (and the last searched place name) is stored in `localStorage` and restored on the next visit. Stock geometry: door faces **north**, 3 m projection, 3 m wall height, 5° roof fall, a 2 m door and a **10 m** room. First-visit date is 1 August at 09:00; **Reset defaults** sets date and time to civil now at the site.

```bash
npm install
npm run dev
```

Then open the URL Vite prints (usually http://localhost:5173).

```bash
npm test          # vitest
npm run lint      # oxlint
npm run build     # typecheck + production bundle
```

GitHub Actions runs test, `tsc -b`, oxlint, and a production build on every push and pull request. On a **public** `main` branch, a green check then deploys `dist/` to **GitHub Pages** (private repos skip that step — free Pages is public-only):

https://mklus.github.io/sun-reach/

First time: repo **Settings → Pages → Source = GitHub Actions**. After that, every green `main` push publishes.

Other free static hosts that fit this Vite SPA (no server): Cloudflare Pages, Netlify, Vercel. Same `npm run build` output. GitHub Pages needs no extra account.

## Why this stack

This is a client-side geometry tool, not a content site. Vite + React 19 + TypeScript is the fastest loop for that: typed solar math, hot reload, and no server framework in the way. The calculator core lives in `src/lib/solar.ts` so it can be tested without mounting the UI.

## Inputs

| Control | Meaning |
| --- | --- |
| Map + search | Site latitude / longitude. Search is worldwide (Esri World Geocoding, Nominatim fallback). Click the map or drag the pin. |
| Glass door faces | Azimuth of the opening, clockwise from north |
| Day / time | Civil clock time **at that site**, limited to sunrise–sunset. **Today** uses the site timezone, not the laptop clock. |
| Awning projection | Horizontal distance from the wall to the outer edge |
| Awning height at wall | Underside height where the roof meets the house |
| Awning roof slope | Signed pitch, **−25°…+25°**. Positive falls away from the wall; negative rises (butterfly). `0` is flat. |
| Door / glass height | Head height of the opening, measured from the floor |
| House width | Front wall to back wall (drawing). Sun that reaches the end wall still counts as indoor heat. |
| Eave projection / height | House eave (always flat). Defaults: 0.60 m, 2.30 m. |
| House roof slope | Pitch of the house roof, eave to ridge. Default **15°**. |

Theme is **Auto / Dark / Light** (Auto follows the system colour scheme). **Reset defaults** restores the Opera House fallback, then asks for the device location again. **Show tips** reveals the slider explanations. **Copy link** writes the current scene to the address bar (and the clipboard). **Print** is a clean section + readout + year chart. **Compare this awning** freezes a second year-curve; **Download CSV** exports the year series. **Larger** on the map or either chart opens a wide overlay (map overlay keeps search, locate, and the glass-facing slider). Escape or **Close** dismisses it.

## What it calculates

**End height** (outer edge above the floor):

```
h_end = h_wall − projection × tan(slope)
```

Negative slope makes `h_end` higher than the wall (butterfly).

**Sun enter length** is how far the beam walks across the indoor floor, only while the sun is in front of the glass. If that hit would be past the back wall, the leftover is counted as the **height of the sun patch on the end wall** (not more imaginary floor — a grazing sunrise would otherwise explode to hundreds of metres). If the sun is around the side or back of the house (more than 90° off the door’s facing), the app reports no sun through the door — for example a south-east summer sunrise on a north-north-east door. When the sun *is* on the facade, rays are treated as parallel at the *profile angle* (altitude corrected for how far the sun sits off the door). If the ray that just misses the outer edge hits the wall above the door head, the opening itself limits how far the sun reaches.

**Heat through the glass** (kW per metre of width now; kWh/m over the day) is the energy that actually comes in:

```
0.9 kW/m² × glass SHGC × air-mass beam × cos(alt) × cos(off-facade) × unshaded opening height
```

Morning air mass knocks the beam down. A long weak stripe across the floor is not extra heat. The awning only cuts heat when it clips or covers the opening. Multiply kWh/m by your glass width for a room total. The section drawing still shows **reach** (where the stripe sits).

A **day chart** plots heat (kW/m) from sunrise to sunset; the dashed line is indoor reach on its own scale. Click or use arrow keys to set the clock. A full-width **year chart** plots daily heat (kWh/m); the dashed line is a configurable **eave reference** (default 0.60 m projection, 2.30 m wall height, always 0°), the solid line is the current awning, and cyan is a frozen compare. A key above the chart lists projection, wall height, and slope for this / eave / compare. The table lists this day, the peak day, and the **year total**. Click or use arrow keys to jump the date. **Larger** on the house section opens a tall drawing.

Rafter length (along the roof) is shown as a readout:

```
rafter = projection / cos(slope)
```

## Trees & Vegie Garden Study Mode

The **Trees & Vegie Garden** study mode (`?page=garden`) simulates 3D solar shadowing from single trees or tree groups/rows onto a vegetable garden enclosure, calculating direct sunlight hours, shaded vs. sunlit bed area, and seasonal crop suitability.

### Requirements & Feature Specifications

#### 1. Tree & Tree Group Configuration
- **Single Tree**:
  - Tree height (1.5 m to 25 m).
  - Crown diameter (1.0 m to 18 m).
  - Trunk clearance / canopy base height (0.5 m to 8 m).
  - Crown shape (ellipsoid / oval foliage).
- **Group / Row of Trees** (hedges, windbreaks, shelterbelts, or orchard rows):
  - Tree height and individual crown diameter.
  - Total group width (2.0 m to 50 m) spanning from the first tree center to the last tree center.
  - Tree count (2 to 12 trees) with automatic equidistant distribution along the row axis.
  - Row rotation / orientation angle (0° to 359°, with 0° = North-South row, 90° = East-West row).

#### 2. Vegie Garden Enclosure
- **Enclosure Dimensions**:
  - Bed length (1.0 m to 25.0 m).
  - Bed width (1.0 m to 15.0 m).
  - Raised bed height (0.1 m to 1.5 m).
- **Enclosure Rotation**: 0° to 359° orientation to align with fence lines, paths, or north-facing contours.
- **Surface Sampling**: Discretized into a high-resolution grid (e.g. 6 × 8 = 48 sample points) to calculate exact fractional sunlit area ($m^2$ and percentage) under partial shadows.

#### 3. Map Projection & Visibility (Street Map & Satellite)
- **Map Layer Switcher**:
  - **`🗺️ Map` (OpenStreetMap - Default)**: Clear vector street map showing roads, property boundaries, landmarks, and topology at close zoom.
  - **`🛰️ Satellite` (Esri World Imagery)**: High-resolution aerial imagery.
- **Dynamic Solar Projection**: Real-time ground shadow polygons cast by tree crowns and trunks according to solar altitude and azimuth.
- **Draggable Pins**: Both the 🌳 tree anchor pin and the 🥕 vegie garden pin can be dragged directly across the map.

#### 4. Secondary Move & Rotate Controls
In addition to map dragging, dedicated secondary controls allow sub-meter relative positioning and precise angle rotation:
- **Move & Rotate Panel (`LayoutControls.tsx`)**:
  - **Target Toggle**: Select between `[ 🥕 Vegie Garden ]` and `[ 🌳 Trees ]`.
  - **Directional D-Pad**: Move the active target North, South, East, or West with configurable step sizes (`0.5 m`, `1.0 m`, `2.5 m`).
  - **Rotation Controls**:
    - Quick nudge buttons (`-45°`, `-15°`, `+15°`, `+45°`).
    - Cardinal compass presets (`0° North`, `90° East`, `180° South`, `270° West`).
    - Continuous 0°–360° rotation slider.
  - **Polar Offsets**: Sliders for radial distance (1 m to 40 m) and compass bearing (0° to 359°).
  - **1-Click Quick Align Presets**: Position the vegie garden directly South, North, East, or West of the tree canopy with one click.
- **Interactive 2D Plan (`GardenSunPlan.tsx`)**:
  - **Direct SVG Dragging**: Click and drag either the vegie bed or tree row directly on the 2D layout canvas.
  - **Direct Rotation Levers**: Drag the colored circular rotation handles to rotate the bed enclosure or tree row dynamically.
  - **Tab Switching**: Toggle between `🧭 2D Sun Plan (Drag/Rotate)` and `🕹️ Move & Rotate Controls` directly in the card.

#### 5. 3D Ray-Casting & Solar Modeling Math
- **Crown Ellipsoid Intersection**:
  For each grid point on the garden bed surface $\mathbf{P} = (x_0, y_0, z_0)$ and sun direction unit vector $\mathbf{d} = (d_x, d_y, d_z)$ directed toward the sun:
  $$\mathbf{R}(t) = \mathbf{P} + t \mathbf{d}, \quad t > 0$$
  The tree crown is defined as an ellipsoid centered at $(c_x, c_y, c_z)$ with semi-axes $r_x = r_y = \frac{D}{2}$ and $r_z = \frac{H - H_{\text{clear}}}{2}$.
  Solving the quadratic equation:
  $$\frac{(x_0 + t d_x - c_x)^2}{r_x^2} + \frac{(y_0 + t d_y - c_y)^2}{r_y^2} + \frac{(z_0 + t d_z - c_z)^2}{r_z^2} = 1$$
  yields whether a direct solar ray is intercepted by the foliage.
- **Trunk Cylinder Intersection**:
  Similarly evaluates ray intersection with a vertical cylinder of radius $r_{\text{trunk}}$ extending from ground level to canopy base $H_{\text{clear}}$.
- **Elevation Section Cut (`GardenSectionCanvas.tsx`)**:
  Renders a 2D architectural section along the sun ray azimuth, showing tree canopy clearance, raised garden bed, ray vectors, and ground shadow footprint with dimension lines.
- **Daily Sun Curve (`GardenDaySunChart.tsx`)**:
  Calculates instant sunlit percentage and direct sunlit area across the entire daylight period from sunrise to sunset. Includes an interactive time scrubber.
- **Seasonal Year Curve (`GardenYearSunChart.tsx`)**:
  Integrates direct solar hours for every day of the year (365 days), highlighting winter solstice (lowest sun) and summer solstice (highest sun). Includes one-click CSV export.

#### 6. Agricultural Crop Suitability Advisor
Based on the daily average direct sunlight hours received by the vegie garden:
- **Full Sun (6.0+ hours/day)**:
  - *Status*: Prime solar location.
  - *Suitable Crops*: Tomatoes, capsicum/peppers, eggplant, cucumbers, zucchini, squash, melons, sweet corn, beans, pumpkins.
- **Partial Sun (3.5 to 6.0 hours/day)**:
  - *Status*: Good partial exposure with afternoon/morning shading.
  - *Suitable Crops*: Carrots, beetroot, radishes, broccoli, cauliflower, peas, cabbage, silverbeet/chard, spinach, bush beans.
- **Shade / Partial Shade (< 3.5 hours/day)**:
  - *Status*: Significant tree shading. Fruiting crops will struggle; focus on leafy greens and shade-tolerant herbs.
  - *Suitable Crops*: Loose-leaf lettuce, rocket/arugula, Asian greens (bok choy, tatsoi), kale, parsley, mint, coriander, chives.

---

## Notes

- The map rotates with **Glass door faces** in House mode so that direction is up. The north arrow stays pointed at true north. Clicks, pan, and the pin still work because rotation is done in Leaflet, not as a CSS hack.
- Solar position is a NOAA-style estimate. Australian eastern and central daylight saving (Broken Hill stays on central time), and New Zealand DST (last Sunday in September to first Sunday in April), are applied; other places use a longitude timezone.
- Map tiles: OpenStreetMap (`🗺️ Map`) and Esri World Imagery (`🛰️ Satellite`). Search: Esri World Geocoding with Nominatim / OpenStreetMap fallback.
- Design aid notice: This tool models solar geometry from configured structures and trees. It ignores surrounding terrain elevation changes and diffuse atmospheric skylight.
