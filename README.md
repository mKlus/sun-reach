# Sun Reach

A Vite + React 19 + TypeScript calculator that draws a section through a glass door and patio awning, then tells you:

- how far the sun patch reaches across the indoor floor
- how high the awning sits at the **outer end**, given the height at the wall and the roof slope

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
| Awning roof slope | Fall **away from the wall**, in degrees (`0` is flat) |
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

## Notes

- The map rotates with **Glass door faces** so that direction is up. The north arrow stays pointed at true north. Clicks, pan, and the pin still work because rotation is done in Leaflet, not as a CSS hack.
- Solar position is a NOAA-style estimate. Australian eastern and central daylight saving (Broken Hill stays on central time), and New Zealand DST (last Sunday in September to first Sunday in April), are applied; other places use a longitude timezone.
- Map tiles © Esri World Imagery. Search © Esri World Geocoding; Nominatim / OpenStreetMap fallback.
- This is a design aid, not a survey. It ignores neighbouring buildings, glass setback, frame thickness, and diffuse light.
