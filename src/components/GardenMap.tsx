import L, { type LatLngTuple } from 'leaflet'
import { useEffect, useMemo, useState } from 'react'
import {
  CircleMarker,
  MapContainer,
  Marker,
  Polygon,
  Polyline,
  TileLayer,
  Tooltip,
  ZoomControl,
  useMap,
  useMapEvents,
} from 'react-leaflet'
import {
  getGardenCorners,
  getGardenGrid,
  type GardenConfig,
  type TreeConfig,
} from '../lib/gardenModel'
import {
  getTreeCanopyPolygons,
  getTreeShadowPolygons,
  type GardenInstantSun,
} from '../lib/gardenSolar'
import '../lib/leafletRotate'
import { toRad } from '../lib/solar'
import type { RecenterTarget } from './SiteMap'

const treeIcon = L.divIcon({
  className: 'tree-map-icon',
  html: `<div style="background:#228b22;border:2.5px solid #ffffff;border-radius:50%;width:26px;height:26px;display:flex;align-items:center;justify-content:center;box-shadow:0 3px 8px rgba(0,0,0,0.5);font-size:14px;cursor:grab;">🌳</div>`,
  iconSize: [26, 26],
  iconAnchor: [13, 13],
})

const gardenIcon = L.divIcon({
  className: 'garden-map-icon',
  html: `<div style="background:#e07a2f;border:2.5px solid #ffffff;border-radius:50%;width:26px;height:26px;display:flex;align-items:center;justify-content:center;box-shadow:0 3px 8px rgba(0,0,0,0.5);font-size:14px;cursor:grab;">🥕</div>`,
  iconSize: [26, 26],
  iconAnchor: [13, 13],
})

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

type GardenMapProps = {
  lat: number
  lon: number
  tree: TreeConfig
  garden: GardenConfig
  instant: GardenInstantSun
  sunAlt: number
  sunAz: number
  recenter: RecenterTarget
  onTreeLocation: (lat: number, lon: number) => void
  onGardenOffset: (offsetEast: number, offsetNorth: number) => void
}

export function GardenMap({
  lat,
  lon,
  tree,
  garden,
  instant,
  sunAlt,
  sunAz,
  recenter,
  onTreeLocation,
  onGardenOffset,
}: GardenMapProps) {
  // Garden center in LatLng
  const gardenCenterLatLng = useMemo(
    () => offsetMeters(lat, lon, garden.offsetNorth, garden.offsetEast),
    [lat, lon, garden.offsetNorth, garden.offsetEast],
  )

  // Garden polygon corners in LatLng
  const gardenCorners = useMemo(() => {
    const pts = getGardenCorners(garden)
    return pts.map((p) => offsetMeters(lat, lon, p.y, p.x))
  }, [lat, lon, garden])

  // Tree canopies in LatLng
  const canopyPolygons = useMemo(() => {
    const polys = getTreeCanopyPolygons(tree)
    return polys.map((poly) => poly.map(([e, n]) => offsetMeters(lat, lon, n, e)))
  }, [lat, lon, tree])

  // Tree shadow polygons in LatLng
  const shadowPolygons = useMemo(() => {
    const polys = getTreeShadowPolygons(tree, sunAlt, sunAz)
    return polys.map((poly) => poly.map(([e, n]) => offsetMeters(lat, lon, n, e)))
  }, [lat, lon, tree, sunAlt, sunAz])

  // Connector line from tree to garden
  const connector = useMemo(
    (): LatLngTuple[] => [[lat, lon], gardenCenterLatLng],
    [lat, lon, gardenCenterLatLng],
  )

  // Discretized garden cells for displaying shaded vs sunlit portion on the map
  const [mapType, setMapType] = useState<'streets' | 'satellite'>('streets')

  const gridCellsLatLng = useMemo(() => {
    const cells = getGardenGrid(garden, 6, 8)
    return cells.map((c, i) => ({
      pos: offsetMeters(lat, lon, c.y, c.x),
      isSun: instant.gridStates[i] ?? true,
    }))
  }, [lat, lon, garden, instant.gridStates])

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div
        className="map-layer-switcher no-print"
        style={{
          position: 'absolute',
          top: 10,
          right: 50,
          zIndex: 1000,
          display: 'flex',
          background: 'var(--lift)',
          border: '1px solid var(--hair-strong)',
          borderRadius: 8,
          overflow: 'hidden',
          boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
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
      <ClickCatcher onPick={onTreeLocation} />

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

      {/* Connecting distance line */}
      <Polyline
        positions={connector}
        pathOptions={{
          color: 'rgba(255, 255, 255, 0.45)',
          weight: 1.5,
          dashArray: '4, 4',
        }}
      />

      {/* Vegie Garden Enclosure */}
      <Polygon
        positions={gardenCorners}
        pathOptions={{
          color: '#e07a2f',
          weight: 2.5,
          fillColor: '#2b6e4f',
          fillOpacity: 0.5,
        }}
      >
        <Tooltip permanent={false} direction="top">
          Vegie Garden: {garden.width.toFixed(1)}m × {garden.length.toFixed(1)}m ({instant.sunlitPercent.toFixed(0)}% in sun)
        </Tooltip>
      </Polygon>

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

      {/* Tree Canopies */}
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

      {/* Draggable Tree Pin */}
      <Marker
        position={[lat, lon]}
        icon={treeIcon}
        draggable
        eventHandlers={{
          drag(e) {
            const ll = e.target.getLatLng()
            onTreeLocation(ll.lat, ll.lng)
          },
        }}
      >
        <Tooltip permanent={false} direction="bottom">
          {tree.mode === 'single' ? 'Tree' : `Tree Row (${tree.treeCount} trees)`} (Drag to move)
        </Tooltip>
      </Marker>

      {/* Draggable Vegie Garden Pin */}
      <Marker
        position={gardenCenterLatLng}
        icon={gardenIcon}
        draggable
        eventHandlers={{
          drag(e) {
            const ll = e.target.getLatLng()
            const off = metersOffset(lat, lon, ll.lat, ll.lng)
            onGardenOffset(off.east, off.north)
          },
        }}
      >
        <Tooltip permanent={false} direction="bottom">
          Vegie Garden Enclosure (Drag to position)
        </Tooltip>
      </Marker>
    </MapContainer>
    </div>
  )
}
