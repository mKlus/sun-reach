import L from 'leaflet'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'
import { useEffect, useMemo } from 'react'
import { MapContainer, Marker, Polygon, Polyline, TileLayer, ZoomControl, useMap, useMapEvents } from 'react-leaflet'
import { housePolygon } from '../lib/house'
import '../lib/leafletRotate'

const defaultIcon = L.icon({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  tooltipAnchor: [16, -28],
  shadowSize: [41, 41],
})

export type RecenterTarget = {
  id: number
  lat: number
  lon: number
}

type SiteMapProps = {
  lat: number
  lon: number
  facing: number
  roomDepth: number
  recenter: RecenterTarget
  onLocation: (lat: number, lon: number) => void
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

/** Facing azimuth at the top of the view: CSS rotate is opposite to plugin bearing. */
function SyncBearing({ facing }: { facing: number }) {
  const map = useMap()
  useEffect(() => {
    map.setBearing((360 - facing) % 360)
  }, [map, facing])
  return null
}

function Recenter({ target }: { target: RecenterTarget }) {
  const map = useMap()
  useEffect(() => {
    if (target.id === 0) return
    map.setView([target.lat, target.lon], Math.max(map.getZoom(), 17))
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

export function SiteMap({ lat, lon, facing, roomDepth, recenter, onLocation }: SiteMapProps) {
  const pts = useMemo(
    () => housePolygon(lat, lon, facing, roomDepth),
    [lat, lon, facing, roomDepth],
  )
  const door = useMemo(() => [pts[0], pts[1]] as const, [pts])

  return (
    <MapContainer
      center={[lat, lon]}
      zoom={18}
      attributionControl={false}
      zoomControl={false}
      scrollWheelZoom
      rotate
      bearing={(360 - facing) % 360}
      rotateControl={false}
      touchRotate={false}
      shiftKeyRotate={false}
      className="map-el"
    >
      <TileLayer
        attribution="Esri"
        maxZoom={19}
        url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
      />
      <ZoomControl position="bottomright" />
      <MapChrome />
      <SyncBearing facing={facing} />
      <Recenter target={recenter} />
      <ClickCatcher onPick={onLocation} />
      <Polygon
        positions={pts}
        pathOptions={{ color: '#e07a2f', weight: 2, fillColor: '#fff4e6', fillOpacity: 0.86 }}
      />
      <Polyline positions={[...door]} pathOptions={{ color: '#3ec8d8', weight: 6, lineCap: 'butt' }} />
      <Marker
        position={[lat, lon]}
        icon={defaultIcon}
        draggable
        eventHandlers={{
          drag(e) {
            const ll = e.target.getLatLng()
            onLocation(ll.lat, ll.lng)
          },
        }}
      />
    </MapContainer>
  )
}
