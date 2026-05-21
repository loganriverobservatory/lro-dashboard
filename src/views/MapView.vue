<script setup lang="ts">
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { onMounted, watch } from 'vue'
import { type Station } from '../hydroService'

// 1. Rename the prop to 'sites'
const props = defineProps<{
  sites: Station[]
  selectedId: string | null
}>()

const emit = defineEmits(['select'])

// Map Anchors
let map: L.Map | null = null
const markerMap = new Map<string, L.Marker>()

// 2. Update markers using 'props.sites'
const syncMarkers = () => {
  if (!map) return

  markerMap.forEach((marker) => marker.remove())
  markerMap.clear()

  props.sites.forEach((station) => {
    if (!station.coordinates) return

    const newMarker = L.marker(station.coordinates)
      .addTo(map!)
      .bindPopup(`<b>${station.displayName}</b>`)
      .on('click', () => emit('select', station.id))

    markerMap.set(station.id, newMarker)
  })
}

onMounted(() => {
  // Standard Leaflet initialization
  map = L.map('map-div').setView([41.737, -111.83], 12)

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap',
  }).addTo(map)

  syncMarkers()
})

// 3. Update watcher to look at 'props.sites'
watch(
  () => props.sites,
  () => {
    syncMarkers()
  },
  { deep: true, immediate: true },
)
</script>
