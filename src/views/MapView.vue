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
const markerMap = new Map<string, L.CircleMarker>()

const syncMarkers = () => {
  if (!map) return

  // 1. Clear existing markers from the map and the tracking Map
  markerMap.forEach((m) => m.remove())
  markerMap.clear()

  console.log(`MAP_DEBUG: Syncing ${props.sites.length} stations...`)

  // 3. RENDER REAL DATA
  props.sites.forEach((station: Station) => {
    // Ensure coordinates exist and have both Lat and Lng
    if (station.coordinates && station.coordinates.length === 2) {
      const [lat, lng] = station.coordinates

      // Create the blue circle marker
      const newMarker = L.circleMarker([lat, lng], {
        radius: 9,
        fillColor: '#3b82f6', // Logan Blue
        color: '#ffffff',
        weight: 2,
        fillOpacity: 0.9,
      })
        .addTo(map!)
        .bindPopup(`<b>${station.displayName}</b><br>${station.id}`)
        .on('click', () => {
          console.log('Pin clicked:', station.id)
          emit('select', station.id)
        })

      // Store reference for the watcher (to open popups externally)
      markerMap.set(station.id, newMarker)
    } else {
      console.warn(
        `MAP_DEBUG: Skipping station ${station.displayName} - Missing Coordinates`,
        station,
      )
    }
  })
}

onMounted(() => {
  console.log('MAP_DEBUG: Initializing Leaflet map...')

  // Standard initialization
  map = L.map('map-div', {
    center: [41.737, -111.83],
    zoom: 12,
  })

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors',
  }).addTo(map)

  // Wait a beat for the DOM/CSS to settle, then draw
  setTimeout(() => {
    if (map) {
      map.invalidateSize()
      syncMarkers()
    }
  }, 250)
})

onBeforeUnmount(() => {
  if (map) {
    map.remove()
    map = null
  }
})

// Watch for changes in the sites array (e.g., after the HydroServer fetch completes)
watch(
  () => props.sites,
  () => {
    syncMarkers()
  },
  { deep: true },
)

// Watch for external selection (e.g., clicking a row in the Sidebar)
watch(
  () => props.selectedId,
  (newId) => {
    if (newId && markerMap.has(newId) && map) {
      const marker = markerMap.get(newId)
      if (marker) {
        marker.openPopup()
        map.panTo(marker.getLatLng())
      }
    }
  },
)
</script>

<template>
  <div class="map-container">
    <div id="map-div"></div>
  </div>
</template>

<style scoped>
.map-container {
  width: 100%;
  height: 600px;
  position: relative;
  border: 1px solid #ccc;
  border-radius: 8px;
  overflow: hidden;
}

#map-div {
  width: 100%;
  height: 100%;
  background: #f8f9fa; /* Light grey while map tiles load */
}

/* Ensure Leaflet controls don't get hidden */
:deep(.leaflet-control-container) {
  z-index: 1000;
}
</style>
