<script setup lang="ts">
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
// 1. Import createApp and h from Vue to mount the component dynamically
import { onMounted, watch, onBeforeUnmount, createApp, h } from 'vue'
import { type Station } from '../hydroService'
// 2. Import your upgraded StationCard component
import StationCard from '../components/StationCard.vue'

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
    if (station.coordinates && station.coordinates.length === 2) {
      const [lat, lng] = station.coordinates

      // A. Create the container element and give it a strict style block so Leaflet sees it
      const popupContainer = document.createElement('div')
      popupContainer.style.minWidth = '180px'
      popupContainer.style.minHeight = '50px'

      // B. Boot up the Vue app instance
      const app = createApp({
        render: () => h(StationCard, { site: station, mapMode: true }),
      })

      // C. Mount it to our container element
      app.mount(popupContainer)

      // Create the blue circle marker
      const newMarker = L.circleMarker([lat, lng], {
        radius: 9,
        fillColor: '#3b82f6', // Logan Blue
        color: '#ffffff',
        weight: 2,
        fillOpacity: 0.9,
      })
        .addTo(map!)
        .bindPopup(popupContainer, {
          maxWidth: 300,
          // This tells Leaflet NOT to close this popup when a user clicks another dot
          autoClose: false,
          // This stops the map from closing popups when the map background is clicked
          closeOnClick: false,
        })
        // LIGHT IT UP: This forces the popup to open automatically on load!
        .openPopup()
        .on('click', () => {
          console.log('Pin clicked:', station.id)
          emit('select', station.id)
        })
      // Store reference for the watcher
      markerMap.set(station.id, newMarker)
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
  background: #f8f9fa;
}

/* Ensure Leaflet controls don't get hidden */
:deep(.leaflet-control-container) {
  z-index: 1000;
}

/* FORCE LEAFLET'S POPUP WRAPPER TO ACCOMMODATE THE WHITE CARD */
:deep(.leaflet-popup-content-wrapper) {
  background: #ffffff !important; /* Changed from transparent to white */
  background-color: #ffffff !important;
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1) !important; /* Restores a nice map shadow */
  padding: 0 !important; /* Keeps padding at 0 so your StationCard handles the layout spacing */
}

/* 2. HIDE THE LITTLE LEAFLET ARROW/TIP UNDERNEATH */
:deep(.leaflet-popup-tip-container) {
  display: none !important;
}

/* 3. OPTIONAL: Move Leaflet's 'X' close button out of the way or style it */
:deep(.leaflet-popup-close-button) {
  color: #64748b !important;
  padding: 8px 8px 0 0 !important;
}
</style>
