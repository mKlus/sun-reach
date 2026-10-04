import L, { type LatLngTuple } from 'leaflet'
import { useEffect, useMemo, useState } from 'react'
import {
  CircleMarker,
  MapContainer,
  Marker,
  Polygon,
  TileLayer,
  Tooltip,
  ZoomControl,
  useMap,
  useMapEvents,
} from 'react-leaflet'
import {
  GARDEN_LENGTH_MAX,
  GARDEN_LENGTH_MIN,
  GARDEN_WIDTH_MAX,
  GARDEN_WIDTH_MIN,
  TREE_DIAMETER_MAX,
  TREE_DIAMETER_MIN,
  TREE_HEIGHT_MAX,
  TREE_HEIGHT_MIN,
  getGardenCorners,
  getGardenGrid,
  type GardenConfig,
  type TreeConfig,
  type TreeItem,
} from '../lib/gardenModel'
import {
  getTreeCanopyPolygons,
  getTreeShadowPolygons,
  type GardenInstantSun,
} from '../lib/gardenSolar'
import '../lib/leafletRotate'
import { toRad, wrapDegrees } from '../lib/solar'
import type { RecenterTarget } from './SiteMap'

function createTreeIcon(selected: boolean) {
  return L.divIcon({
    className: 'tree-map-icon',
    html: `
      <div style="
        background: ${selected ? '#15803d' : '#228b22'};
        border: ${selected ? '3px solid #ffea79' : '2.5px solid #ffffff'};
        border-radius: 50%;
        width: 30px;
        height: 30px;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 4px 10px rgba(0,0,0,0.55);
        font-size: 15px;
        cursor: grab;
        transform: translate(-15px, -15px);
        position: relative;
      ">
        🌳
        ${selected ? `<div style="position:absolute;top:-8px;right:-8px;background:#f59e0b;color:#fff;border-radius:50%;width:14px;height:14px;font-size:9px;display:flex;align-items:center;justify-content:center;font-weight:bold;border:1px solid #fff;">✓</div>` : ''}
      </div>
    `,
    iconSize: [30, 30],
    iconAnchor: [0, 0],
  })
}

function createGardenCenterIcon(selected: boolean) {
  return L.divIcon({
    className: 'garden-map-icon',
    html: `
      <div style="
        background: ${selected ? '#ea580c' : '#e07a2f'};
        border: ${selected ? '3px solid #ffea79' : '2.5px solid #ffffff'};
        border-radius: 50%;
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 4px 10px rgba(0,0,0,0.55);
        font-size: 16px;
        cursor: grab;
        transform: translate(-16px, -16px);
      ">
        🥕
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [0, 0],
  })
}

function createResizeHandleIcon(color = '#ff9800', cursor = 'nwse-resize') {
  return L.divIcon({
    className: 'garden-resize-icon',
    html: `
      <div style="
        background: ${color};
        border: 2px solid #ffffff;
        border-radius: 50%;
        width: 14px;
        height: 14px;
        box-shadow: 0 2px 6px rgba(0,0,0,0.5);
        cursor: ${cursor};
        transform: translate(-7px, -7px);
      "></div>
    `,
    iconSize: [14, 14],
    iconAnchor: [0, 0],
  })
}

function createRotateHandleIcon() {
  return L.divIcon({
    className: 'garden-rotate-icon',
    html: `
      <div style="
        background: #3b82f6;
        border: 2px solid #ffffff;
        border-radius: 50%;
        width: 18px;
        height: 18px;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 2px 6px rgba(0,0,0,0.5);
        cursor: crosshair;
        transform: translate(-9px, -9px);
        font-size: 11px;
        color: #fff;
        font-weight: bold;
      ">↻</div>
    `,
    iconSize: [18, 18],
    iconAnchor: [0, 0],
  })
}

function offsetMeters(lat0: number, lon0: number, northM: number, eastM: number): LatLngTuple {
  const dLat = northM / 111320
  const dLon = eastM / (111320 * Math.max(0.2, Math.cos(toRad(lat0))))
  return [lat0 + dLat, lon0 + dLon]
}

function metersOffset(
  lat0: number,
  lon0: number,
  lat1: number,
  lon1: number,
): { east: number; north: number } {
  const north = (lat1 - lat0) * 111320
  const east = (lon1 - lon0) * (111320 * Math.max(0.2, Math.cos(toRad(lat0))))
  return { east, north }
}

function MapChrome() {
  const map = useMap()
  useEffect(() => {
    const el = map.getContainer()
    const ro = new ResizeObserver(() => map.invalidateSize())
    ro.observe(el)
    const t = window.setTimeout(() => map.invalidateSize(), 180)
    return () => {
      ro.disconnect()
      window.clearTimeout(t)
    }
  }, [map])
  return null
}

function Recenter({ target }: { target: RecenterTarget }) {
  const map = useMap()
  useEffect(() => {
    if (target.id === 0) return
    map.setView([target.lat, target.lon], Math.max(map.getZoom(), 19))
  }, [target, map])
  return null
}

function ClickCatcher({ onPick }: { onPick: (lat: number, lon: number) => void }) {
  useMapEvents({
    click(e) {
      onPick(e.latlng.lat, e.latlng.lng)
    },
  })
  return null
}

export type GardenMapProps = {
  lat: number
  lon: number
  trees: TreeItem[]
  garden: GardenConfig | null
  instant: GardenInstantSun
  sunAlt: number
  sunAz: number
  recenter: RecenterTarget
  selectedTreeId: string | null
  isGardenSelected: boolean
  onSelectTree: (id: string | null) => void
  onSelectGarden: (selected: boolean) => void
  onAddTree: (lat?: number, lon?: number) => void
  onDeleteTree: (id: string) => void
  onMoveTree: (id: string, lat: number, lon: number) => void
  onUpdateTree: (id: string, partial: Partial<TreeItem>) => void
  onAddGarden: (lat?: number, lon?: number) => void
  onDeleteGarden: () => void
  onGardenOffset: (offsetEast: number, offsetNorth: number) => void
  onGardenPatch: (partial: Partial<GardenConfig>) => void
  onPickLocation?: (lat: number, lon: number) => void
  // Legacy compatibility props
  tree?: TreeConfig
  onTreeLocation?: (lat: number, lon: number) => void
}

export function GardenMap({
  lat,
  lon,
  trees,
  garden,
  instant,
  sunAlt,
  sunAz,
  recenter,
  selectedTreeId,
  isGardenSelected,
  onSelectTree,
  onSelectGarden,
  onAddTree,
  onDeleteTree,
  onMoveTree,
  onUpdateTree,
  onAddGarden,
  onDeleteGarden,
  onGardenOffset,
  onGardenPatch,
  onPickLocation,
}: GardenMapProps) {
  const [mapType, setMapType] = useState<'streets' | 'satellite'>('streets')

  // Center of vegie garden in LatLng
  const gardenCenterLatLng = useMemo<LatLngTuple | null>(() => {
    if (!garden) return null
    return offsetMeters(lat, lon, garden.offsetNorth, garden.offsetEast)
  }, [lat, lon, garden])

  // Garden polygon corners in LatLng
  const gardenCorners = useMemo<LatLngTuple[]>(() => {
    if (!garden) return []
    const pts = getGardenCorners(garden)
    return pts.map((p) => offsetMeters(lat, lon, p.y, p.x))
  }, [lat, lon, garden])

  // Resize corner handles in LatLng: corners[1] is Top-Right corner in local coordinates
  const gardenCornerHandleLatLng = useMemo<LatLngTuple | null>(() => {
    if (!garden || gardenCorners.length < 4) return null
    return gardenCorners[1] // [halfW, -halfL]
  }, [garden, gardenCorners])

  // Rotation handle placed along length axis in LatLng
  const gardenRotateHandleLatLng = useMemo<LatLngTuple | null>(() => {
    if (!garden || !gardenCenterLatLng) return null
    const handleDistM = garden.length / 2 + 2.5
    const rad = (garden.rotation * Math.PI) / 180
    const northM = garden.offsetNorth + handleDistM * Math.cos(rad)
    const eastM = garden.offsetEast + handleDistM * Math.sin(rad)
    return offsetMeters(lat, lon, northM, eastM)
  }, [lat, lon, garden, gardenCenterLatLng])

  // Tree canopies in LatLng
  const canopyPolygons = useMemo(() => {
    const polys = getTreeCanopyPolygons(trees, lat, lon)
    return polys.map((poly) => poly.map(([e, n]) => offsetMeters(lat, lon, n, e)))
  }, [trees, lat, lon])

  // Tree shadow polygons in LatLng
  const shadowPolygons = useMemo(() => {
    const polys = getTreeShadowPolygons(trees, sunAlt, sunAz, lat, lon)
    return polys.map((poly) => poly.map(([e, n]) => offsetMeters(lat, lon, n, e)))
  }, [trees, sunAlt, sunAz, lat, lon])

  // Discretized garden cells for displaying shaded vs sunlit portion
  const gridCellsLatLng = useMemo(() => {
    if (!garden) return []
    const cells = getGardenGrid(garden, 8, 12)
    return cells.map((c, i) => ({
      pos: offsetMeters(lat, lon, c.y, c.x),
      isSun: instant.gridStates[i] ?? true,
    }))
  }, [lat, lon, garden, instant.gridStates])

  // Find currently selected tree
  const activeTree = useMemo(() => {
    return trees.find((t) => t.id === selectedTreeId) ?? null
  }, [trees, selectedTreeId])

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      {/* Top Map Action Toolbar below Search Input */}
      <div
        className="map-top-bar no-print"
        style={{
          position: 'absolute',
          top: 54,
          left: 10,
          right: 10,
          zIndex: 1000,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          pointerEvents: 'none',
        }}
      >
        {/* On-Map Action Controls */}
        <div
          style={{
            display: 'flex',
            gap: 6,
            background: 'var(--lift)',
            border: '1px solid var(--hair-strong)',
            borderRadius: 10,
            padding: '4px 6px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            pointerEvents: 'auto',
          }}
        >
          <button
            type="button"
            onClick={() => {
              // Add a tree near map center
              const offsetAngle = Math.random() * Math.PI * 2
              const r = 0.00004
              const tLat = lat + r * Math.cos(offsetAngle)
              const tLon = lon + r * Math.sin(offsetAngle)
              onAddTree(tLat, tLon)
            }}
            style={{
              background: '#228b22',
              color: '#ffffff',
              border: 'none',
              borderRadius: 6,
              padding: '5px 10px',
              fontSize: '0.78rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            ➕ Add Tree
          </button>

          {!garden ? (
            <button
              type="button"
              onClick={() => onAddGarden(lat - 0.00004, lon + 0.00002)}
              style={{
                background: '#e07a2f',
                color: '#ffffff',
                border: 'none',
                borderRadius: 6,
                padding: '5px 10px',
                fontSize: '0.78rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              ➕ Add Vegie Garden
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                onDeleteGarden()
                onSelectGarden(false)
              }}
              style={{
                background: 'rgba(239, 68, 68, 0.15)',
                color: '#ef4444',
                border: '1px solid #ef4444',
                borderRadius: 6,
                padding: '5px 8px',
                fontSize: '0.78rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
              title="Delete Vegie Garden"
            >
              🗑️ Remove Garden
            </button>
          )}
        </div>

        {/* Map Type Switcher */}
        <div
          style={{
            display: 'flex',
            background: 'var(--lift)',
            border: '1px solid var(--hair-strong)',
            borderRadius: 8,
            overflow: 'hidden',
            boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
            pointerEvents: 'auto',
          }}
        >
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              setMapType('streets')
            }}
            style={{
              border: 'none',
              background: mapType === 'streets' ? 'var(--raised)' : 'transparent',
              color: mapType === 'streets' ? 'var(--ink)' : 'var(--muted)',
              fontWeight: mapType === 'streets' ? 600 : 400,
              padding: '4px 8px',
              fontSize: '0.75rem',
              cursor: 'pointer',
            }}
          >
            🗺️ Map
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              setMapType('satellite')
            }}
            style={{
              border: 'none',
              borderLeft: '1px solid var(--hair)',
              background: mapType === 'satellite' ? 'var(--raised)' : 'transparent',
              color: mapType === 'satellite' ? 'var(--ink)' : 'var(--muted)',
              fontWeight: mapType === 'satellite' ? 600 : 400,
              padding: '4px 8px',
              fontSize: '0.75rem',
              cursor: 'pointer',
            }}
          >
            🛰️ Satellite
          </button>
        </div>
      </div>

      {/* Selected Tree Floating Inspector & Slider Controls */}
      {activeTree ? (
        <div
          className="tree-inspector no-print"
          style={{
            position: 'absolute',
            bottom: 20,
            left: 14,
            zIndex: 1000,
            background: 'var(--lift)',
            border: '1.5px solid #228b22',
            borderRadius: 12,
            padding: '12px 14px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.45)',
            width: 270,
            backdropFilter: 'blur(8px)',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 8,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 16 }}>🌳</span>
              <strong style={{ fontSize: '0.86rem', color: 'var(--ink)' }}>
                Selected Tree
              </strong>
            </div>
            <div style={{ display: 'flex', gap: 4 }}>
              <button
                type="button"
                onClick={() => {
                  onDeleteTree(activeTree.id)
                  onSelectTree(null)
                }}
                style={{
                  background: 'rgba(239, 68, 68, 0.15)',
                  color: '#ef4444',
                  border: '1px solid #ef4444',
                  borderRadius: 6,
                  padding: '2px 6px',
                  fontSize: '0.72rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
                title="Delete this tree"
              >
                🗑️ Delete
              </button>
              <button
                type="button"
                onClick={() => onSelectTree(null)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--muted)',
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  padding: '2px 4px',
                }}
                title="Deselect"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Tree Height Slider */}
          <div style={{ marginBottom: 10 }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '0.76rem',
                color: 'var(--muted)',
                marginBottom: 2,
              }}
            >
              <span>Height</span>
              <strong style={{ color: 'var(--ink)' }}>{activeTree.height.toFixed(1)} m</strong>
            </div>
            <input
              type="range"
              min={TREE_HEIGHT_MIN}
              max={TREE_HEIGHT_MAX}
              step={0.5}
              value={activeTree.height}
              onChange={(e) => onUpdateTree(activeTree.id, { height: parseFloat(e.target.value) })}
              style={{ width: '100%', accentColor: '#228b22', cursor: 'pointer' }}
            />
          </div>

          {/* Tree Width / Diameter Slider */}
          <div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '0.76rem',
                color: 'var(--muted)',
                marginBottom: 2,
              }}
            >
              <span>Canopy diameter</span>
              <strong style={{ color: 'var(--ink)' }}>{activeTree.diameter.toFixed(1)} m</strong>
            </div>
            <input
              type="range"
              min={TREE_DIAMETER_MIN}
              max={TREE_DIAMETER_MAX}
              step={0.5}
              value={activeTree.diameter}
              onChange={(e) => onUpdateTree(activeTree.id, { diameter: parseFloat(e.target.value) })}
              style={{ width: '100%', accentColor: '#228b22', cursor: 'pointer' }}
            />
          </div>
        </div>
      ) : null}

      {/* Selected Garden Bed Floating Inspector */}
      {isGardenSelected && garden ? (
        <div
          className="garden-inspector no-print"
          style={{
            position: 'absolute',
            bottom: 20,
            left: 14,
            zIndex: 1000,
            background: 'var(--lift)',
            border: '1.5px solid #e07a2f',
            borderRadius: 12,
            padding: '12px 14px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.45)',
            width: 270,
            backdropFilter: 'blur(8px)',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 8,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 16 }}>🥕</span>
              <strong style={{ fontSize: '0.86rem', color: 'var(--ink)' }}>
                Vegie Garden Bed
              </strong>
            </div>
            <div style={{ display: 'flex', gap: 4 }}>
              <button
                type="button"
                onClick={() => {
                  onDeleteGarden()
                  onSelectGarden(false)
                }}
                style={{
                  background: 'rgba(239, 68, 68, 0.15)',
                  color: '#ef4444',
                  border: '1px solid #ef4444',
                  borderRadius: 6,
                  padding: '2px 6px',
                  fontSize: '0.72rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
                title="Delete Garden"
              >
                🗑️ Delete
              </button>
              <button
                type="button"
                onClick={() => onSelectGarden(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--muted)',
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  padding: '2px 4px',
                }}
                title="Deselect"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Garden Width */}
          <div style={{ marginBottom: 8 }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '0.76rem',
                color: 'var(--muted)',
                marginBottom: 2,
              }}
            >
              <span>Width</span>
              <strong style={{ color: 'var(--ink)' }}>{garden.width.toFixed(1)} m</strong>
            </div>
            <input
              type="range"
              min={GARDEN_WIDTH_MIN}
              max={GARDEN_WIDTH_MAX}
              step={0.5}
              value={garden.width}
              onChange={(e) => onGardenPatch({ width: parseFloat(e.target.value) })}
              style={{ width: '100%', accentColor: '#e07a2f', cursor: 'pointer' }}
            />
          </div>

          {/* Garden Length */}
          <div style={{ marginBottom: 8 }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '0.76rem',
                color: 'var(--muted)',
                marginBottom: 2,
              }}
            >
              <span>Length</span>
              <strong style={{ color: 'var(--ink)' }}>{garden.length.toFixed(1)} m</strong>
            </div>
            <input
              type="range"
              min={GARDEN_LENGTH_MIN}
              max={GARDEN_LENGTH_MAX}
              step={0.5}
              value={garden.length}
              onChange={(e) => onGardenPatch({ length: parseFloat(e.target.value) })}
              style={{ width: '100%', accentColor: '#e07a2f', cursor: 'pointer' }}
            />
          </div>

          {/* Garden Rotation */}
          <div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '0.76rem',
                color: 'var(--muted)',
                marginBottom: 2,
              }}
            >
              <span>Orientation</span>
              <strong style={{ color: 'var(--ink)' }}>{garden.rotation}°</strong>
            </div>
            <input
              type="range"
              min={0}
              max={359}
              step={5}
              value={garden.rotation}
              onChange={(e) => onGardenPatch({ rotation: parseInt(e.target.value, 10) })}
              style={{ width: '100%', accentColor: '#e07a2f', cursor: 'pointer' }}
            />
          </div>
        </div>
      ) : null}

      <MapContainer
        center={[lat, lon]}
        zoom={18}
        attributionControl={false}
        zoomControl={false}
        scrollWheelZoom
        className="map-el"
      >
        {mapType === 'satellite' ? (
          <TileLayer
            attribution="Esri"
            maxZoom={19}
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          />
        ) : (
          <TileLayer
            attribution="OpenStreetMap"
            maxZoom={19}
            url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
        )}
        <ZoomControl position="bottomright" />
        <MapChrome />
        <Recenter target={recenter} />
        <ClickCatcher
          onPick={(clickLat, clickLon) => {
            onSelectTree(null)
            onSelectGarden(false)
            onPickLocation?.(clickLat, clickLon)
          }}
        />

        {/* Dynamic Tree Shadows */}
        {shadowPolygons.map((pts, i) => (
          <Polygon
            key={`shadow-${i}`}
            positions={pts}
            pathOptions={{
              color: '#1a221b',
              weight: 1,
              fillColor: '#0b120c',
              fillOpacity: 0.58,
            }}
          />
        ))}

        {/* Vegie Garden Enclosure */}
        {garden && gardenCorners.length === 4 ? (
          <Polygon
            positions={gardenCorners}
            eventHandlers={{
              click(e) {
                L.DomEvent.stopPropagation(e)
                onSelectTree(null)
                onSelectGarden(true)
              },
            }}
            pathOptions={{
              color: isGardenSelected ? '#ff9800' : '#e07a2f',
              weight: isGardenSelected ? 3.5 : 2.5,
              fillColor: '#2b6e4f',
              fillOpacity: isGardenSelected ? 0.65 : 0.5,
              dashArray: isGardenSelected ? '6, 4' : undefined,
            }}
          >
            <Tooltip permanent={false} direction="top">
              Vegie Garden: {garden.width.toFixed(1)}m × {garden.length.toFixed(1)}m (
              {instant.sunlitPercent.toFixed(0)}% in sun) · Click to configure
            </Tooltip>
          </Polygon>
        ) : null}

        {/* Grid sample markers inside garden */}
        {gridCellsLatLng.map((cell, i) => (
          <CircleMarker
            key={`cell-${i}`}
            center={cell.pos}
            radius={2}
            pathOptions={{
              color: cell.isSun ? '#ffea79' : '#2d3748',
              fillColor: cell.isSun ? '#ffb300' : '#1a202c',
              fillOpacity: 0.8,
              weight: 1,
            }}
          />
        ))}

        {/* Tree Canopies Footprint */}
        {canopyPolygons.map((pts, i) => (
          <Polygon
            key={`canopy-${i}`}
            positions={pts}
            pathOptions={{
              color: '#1e7b34',
              weight: 2,
              fillColor: '#34a853',
              fillOpacity: 0.72,
            }}
          />
        ))}

        {/* Draggable & Selectable Tree Pins */}
        {trees.map((t) => (
          <Marker
            key={t.id}
            position={[t.lat, t.lon]}
            icon={createTreeIcon(t.id === selectedTreeId)}
            draggable
            eventHandlers={{
              click(e) {
                L.DomEvent.stopPropagation(e)
                onSelectGarden(false)
                onSelectTree(t.id)
              },
              dragend(e) {
                const ll = e.target.getLatLng()
                onMoveTree(t.id, ll.lat, ll.lng)
              },
            }}
          >
            <Tooltip permanent={false} direction="bottom">
              Tree ({t.height.toFixed(1)}m high, ⌀{t.diameter.toFixed(1)}m) — Click to adjust size, drag to move
            </Tooltip>
          </Marker>
        ))}

        {/* Draggable Vegie Garden Center Pin */}
        {garden && gardenCenterLatLng ? (
          <Marker
            position={gardenCenterLatLng}
            icon={createGardenCenterIcon(isGardenSelected)}
            draggable
            eventHandlers={{
              click(e) {
                L.DomEvent.stopPropagation(e)
                onSelectTree(null)
                onSelectGarden(true)
              },
              dragend(e) {
                const ll = e.target.getLatLng()
                const off = metersOffset(lat, lon, ll.lat, ll.lng)
                onGardenOffset(
                  Math.round(off.east * 10) / 10,
                  Math.round(off.north * 10) / 10,
                )
              },
            }}
          >
            <Tooltip permanent={false} direction="bottom">
              Vegie Garden Enclosure (Drag to move, click to resize/rotate)
            </Tooltip>
          </Marker>
        ) : null}

        {/* Interactive Resize Corner Handle when Garden is selected */}
        {isGardenSelected && garden && gardenCornerHandleLatLng && gardenCenterLatLng ? (
          <Marker
            position={gardenCornerHandleLatLng}
            icon={createResizeHandleIcon('#f59e0b', 'nwse-resize')}
            draggable
            eventHandlers={{
              click(e) {
                L.DomEvent.stopPropagation(e)
              },
              dragend(e) {
                const ll = e.target.getLatLng()
                // Vector from garden center to new corner position in meters
                const off = metersOffset(
                  gardenCenterLatLng[0],
                  gardenCenterLatLng[1],
                  ll.lat,
                  ll.lng,
                )
                // Project off into local coordinates rotated by -garden.rotation:
                const rad = (-garden.rotation * Math.PI) / 180
                const cosR = Math.cos(rad)
                const sinR = Math.sin(rad)
                const u = off.east * cosR - off.north * sinR
                const v = off.east * sinR + off.north * cosR
                const newWidth = Math.max(GARDEN_WIDTH_MIN, Math.min(GARDEN_WIDTH_MAX, Math.abs(u) * 2))
                const newLength = Math.max(GARDEN_LENGTH_MIN, Math.min(GARDEN_LENGTH_MAX, Math.abs(v) * 2))
                onGardenPatch({
                  width: Math.round(newWidth * 10) / 10,
                  length: Math.round(newLength * 10) / 10,
                })
              },
            }}
          >
            <Tooltip permanent={false} direction="right">
              Drag to resize garden bed
            </Tooltip>
          </Marker>
        ) : null}

        {/* Interactive Rotate Handle when Garden is selected */}
        {isGardenSelected && garden && gardenRotateHandleLatLng && gardenCenterLatLng ? (
          <Marker
            position={gardenRotateHandleLatLng}
            icon={createRotateHandleIcon()}
            draggable
            eventHandlers={{
              click(e) {
                L.DomEvent.stopPropagation(e)
              },
              dragend(e) {
                const ll = e.target.getLatLng()
                const off = metersOffset(
                  gardenCenterLatLng[0],
                  gardenCenterLatLng[1],
                  ll.lat,
                  ll.lng,
                )
                // Angle from North: atan2(east, north)
                const angleDeg = wrapDegrees(
                  Math.round((Math.atan2(off.east, off.north) * 180) / Math.PI),
                )
                onGardenPatch({ rotation: angleDeg })
              },
            }}
          >
            <Tooltip permanent={false} direction="top">
              Drag to rotate garden bed orientation
            </Tooltip>
          </Marker>
        ) : null}
      </MapContainer>
    </div>
  )
}
