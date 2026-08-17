import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// leaflet-rotate patches the global L from the classic script tag.
;(window as Window & { L: typeof L }).L = L
