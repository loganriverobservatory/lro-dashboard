<script setup lang="ts">
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { onMounted, watch, onBeforeUnmount } from 'vue'
import { type Station } from '../hydroService'

const props = defineProps<{
  sites: Station[]
  selectedId: string | null
}>()

const emit = defineEmits(['select'])
let map: L.Map | null = null
const markerMap = new Map<string, any>()

const syncMarkers = () => {
  if (!map) return

  // 1. CLEAR existing layers
  markerMap.forEach((m) => m.remove())
  markerMap.clear()

  // 2. THE TEST DOT (Proves the rendering engine is working)
  L.circleMarker([41.737, -111.83], {
    radius: 12,
    fillColor: '#ff0000',
    color: '#000',
    weight: 2,
    fillOpacity: 1,
    pane: 'markerPane',
  })
    .addTo(map!)
    .bindPopup('TEST DOT - LOGAN')

  // 3. THE DATA SYNC
  props.sites.forEach((station: any) => {
    // Try various possible naming conventions for coordinates
    let lat =
      station.latitude || station.lat || (station.coordinates ? station.coordinates[0] : null)
    let lng =
      station.longitude ||
      station.lon ||
      station.lng ||
      (station.coordinates ? station.coordinates[1] : null)

    if (lat === undefined && station.location) {
      lat = station.location.latitude || station.location.lat
      lng = station.location.longitude || station.location.lng
    }

    const finalLat = Number(lat)
    const finalLng = Number(lng)

    if (!isNaN(finalLat) && !isNaN(finalLng) && lat !== null) {
      const newMarker = L.circleMarker([finalLat, finalLng], {
        radius: 9,
        fillColor: '#3b82f6',
        color: '#ffffff',
        weight: 2,
        fillOpacity: 0.9,
        pane: 'markerPane',
      })
        .addTo(map!)
        .bindPopup(`<b>${station.displayName}</b>`)
        .on('click', () => emit('select', station.id))

      markerMap.set(station.id, newMarker)
    } else {
      console.warn(`Could not find coordinates for ${station.displayName}`, station)
    }
  })
} // <--- syncMarkers ends here!

onMounted(() => {
  console.log('MAP_DEBUG: Initializing map...')
  map = L.map('map-div', {
    center: [41.737, -111.83],
    zoom: 12,
    preferCanvas: true,
  })

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap',
  }).addTo(map)

  setTimeout(() => {
    if (map) {
      console.log('MAP_DEBUG: Invaliding size and syncing markers')
      map.invalidateSize()
      syncMarkers()
    }
  }, 300)
})

onBeforeUnmount(() => {
  if (map) {
    map.remove()
    map = null
  }
})

watch(
  () => props.sites,
  () => {
    syncMarkers()
  },
  { deep: true, immediate: true },
)

watch(
  () => props.selectedId,
  (newId) => {
    if (newId && markerMap.has(newId) && map) {
      const marker = markerMap.get(newId)
      marker?.openPopup()
      map.panTo(marker!.getLatLng())
    }
  },
)
</script>

<template>
  <div class="map-container">
    <div id="map-div"></div>
  </div>
</template>

<style>
.map-container {
  width: 100%;
  height: 600px;
  position: relative;
  border: 2px solid red;
}

#map-div {
  width: 100%;
  height: 100%;
  background: #eee;
}

/* Force the SVG layer to have dimensions */
.leaflet-svg-pane {
  display: block !important;
}
</style>
