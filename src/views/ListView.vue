<script setup lang="ts">
/*
ListView.vue - Displays a list of station cards with variable values and freshness status
*/
import { computed } from 'vue'
import StationCard from '../components/StationCard.vue'
import {
  type Station,
  type SchematicPages,
  WATER_VARIBALES,
  WATERWAY_COLORS,
  WATERWAY_LIST,
  getSchematicOrder,
  getSchematicSystemOrder,
  findStationSystem,
  sortStationsBySchematic,
} from '../hydroService'

const props = defineProps<{
  sites: Station[]
  loading: boolean
  selectedVariable?: string
  activeWaterways?: string[]
  // Which schematic systems are active in the filter below - see App.vue's activeSystems.
  activeSystems?: string[]
  // Which of activeSystems/activeWaterways is currently applied - see App.vue's filterMode.
  // Only one is ever actually filtered on, regardless of the other's stored checkbox state.
  filterMode?: 'system' | 'source'
  schematicPages?: SchematicPages | null
  // Manifest-ordered {slug, label} list - drives the mobile filter button bar (system mode),
  // same source AppSidebar's SYSTEMS checkboxes use.
  schematicNav?: { slug: string; label: string }[]
}>()

const emit = defineEmits<{
  (e: 'system-filter-changed', updated: string[]): void
  (e: 'waterway-filter-changed', updated: string[]): void
  (e: 'filter-mode-changed', mode: 'system' | 'source'): void
}>()

// Short form for the section header, e.g. "Discharge (cfs)".
const variableLabel = computed(() => {
  const match = WATER_VARIBALES.find((v) => v.id === props.selectedVariable)
  return match ? match.label : props.selectedVariable || 'Live Data'
})

// Fuller form used in "Live {{ variableLongLabel }}" - falls back to the short label if this
// variable isn't in WATER_VARIBALES.
const variableLongLabel = computed(() => {
  const match = WATER_VARIBALES.find((v) => v.id === props.selectedVariable)
  return match?.longLabel ?? variableLabel.value
})

// Top-of-watershed-to-bottom station name order, derived from the schematic JSON files.
const schematicOrder = computed(() => getSchematicOrder(props.schematicPages))

// Same schematic data, but keeping each station's system slug - used to filter by system below.
const systemOrder = computed(() => getSchematicSystemOrder(props.schematicPages))

// Filtered by whichever single dimension filterMode currently selects (system or data
// source - never both at once, see App.vue's filterMode), then sorted to match the
// schematic's upstream->downstream order. A station that doesn't match any schematic file is
// treated as belonging to no system, so it's hidden the same as anything else once its
// (nonexistent) system is deselected - add it to a schematic JSON to make it filterable.
const filteredSites = computed(() => {
  let filtered = props.sites

  if (props.filterMode === 'source' && props.activeWaterways) {
    filtered = filtered.filter((s) => props.activeWaterways!.includes(s.tributary ?? ''))
  } else if (props.filterMode !== 'source' && props.activeSystems) {
    filtered = filtered.filter((s) => {
      const system = findStationSystem(s.displayName, systemOrder.value)
      return system !== undefined && props.activeSystems!.includes(system)
    })
  }

  return sortStationsBySchematic(filtered, schematicOrder.value)
})

function toggleSystem(slug: string) {
  const current = new Set(props.activeSystems ?? [])
  if (current.has(slug)) {
    current.delete(slug)
  } else {
    current.add(slug)
  }
  emit('system-filter-changed', [...current])
}

function toggleWaterway(name: string) {
  const current = new Set(props.activeWaterways ?? [])
  if (current.has(name)) {
    current.delete(name)
  } else {
    current.add(name)
  }
  emit('waterway-filter-changed', [...current])
}
</script>

<template>
  <div class="container">
    <!-- The sidebar's own FILTER STATIONS toggle+checkboxes already cover this whenever it's
    permanently visible - only show these as a replacement once the sidebar collapses to a
    toggleable overlay, matching SchematicView's own mobile tab bar and App.vue's sidebar-collapse
    breakpoint. Same filterMode toggle as the sidebar - one dimension applies at a time. -->
    <div class="mobile-filter-bar">
      <div class="filter-mode-toggle">
        <button
          type="button"
          class="filter-mode-btn"
          :class="{ active: filterMode !== 'source' }"
          @click="emit('filter-mode-changed', 'system')"
        >
          Systems
        </button>
        <button
          type="button"
          class="filter-mode-btn"
          :class="{ active: filterMode === 'source' }"
          @click="emit('filter-mode-changed', 'source')"
        >
          Data Sources
        </button>
      </div>

      <div v-if="filterMode === 'source'" class="system-tabs">
        <button
          v-for="name in WATERWAY_LIST"
          :key="name"
          type="button"
          class="system-tab"
          :class="{ active: !activeWaterways || activeWaterways.includes(name) }"
          @click="toggleWaterway(name)"
        >
          <span class="system-tab-dot" :style="{ background: WATERWAY_COLORS[name] }"></span>
          {{ name }}
        </button>
      </div>
      <div v-else-if="schematicNav?.length" class="system-tabs">
        <button
          v-for="system in schematicNav"
          :key="system.slug"
          type="button"
          class="system-tab"
          :class="{ active: !activeSystems || activeSystems.includes(system.slug) }"
          @click="toggleSystem(system.slug)"
        >
          {{ system.label }}
        </button>
      </div>
    </div>

    <header class="dashboard-header">
      <div class="status-banner">
        <h2>Live {{ variableLongLabel }}</h2>
      </div>
    </header>

    <div v-if="loading" class="loading-state">
      <p>Connecting to river sensors...</p>
    </div>

    <div v-else class="station-grid">
      <StationCard v-for="site in filteredSites" :key="site.uuid" :site="site" />
    </div>
  </div>
</template>

<style scoped>
.container {
  max-width: 800px;
  margin: 0 auto;
  padding: 2rem;
  background-color: #f8fafc;
  border-radius: 12px;
}

/* From standard iPad portrait width (768px) up, double the list's width instead of leaving it
   capped at 800px with empty space on both sides - each StationCard has no width of its own,
   so it just stretches to fill this. Independent of the 992px sidebar-collapse breakpoint used
   elsewhere - an iPad in portrait still gets the overlay sidebar, but not the narrow list. */
@media screen and (min-width: 768px) {
  .container {
    max-width: 1600px;
  }
}

/* The sidebar's own FILTER STATIONS section covers this whenever it's permanently visible -
   only shown once the sidebar collapses to a toggleable overlay (matching
   SchematicView/App.vue's own sidebar-collapse breakpoint). */
.mobile-filter-bar {
  display: none;
  margin-bottom: 1rem;
}

@media screen and (max-width: 992px) {
  .mobile-filter-bar {
    display: block;
  }
}

/* Mirrors AppSidebar.vue's .filter-mode-toggle/.filter-mode-btn - same segmented-control
   styling, adapted to a light background instead of the sidebar's dark one. */
.filter-mode-toggle {
  display: flex;
  gap: 4px;
  background: #e2e8f0;
  border-radius: 8px;
  padding: 3px;
  margin-bottom: 8px;
  max-width: 320px;
}

.filter-mode-btn {
  flex: 1;
  background: none;
  border: none;
  color: #475569;
  font-size: 0.72rem;
  font-weight: 700;
  font-family: inherit;
  padding: 6px 8px;
  border-radius: 6px;
  cursor: pointer;
  text-align: center;
  transition:
    background 0.18s ease,
    color 0.18s ease;
}

.filter-mode-btn:hover {
  color: #1e293b;
}

.filter-mode-btn.active {
  background: #ffffff;
  color: #073763;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.08);
}

.system-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.system-tab {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  border-radius: 9999px;
  border: 1px solid #cbd5e1;
  background: #ffffff;
  color: #334155;
  font-family: inherit;
  font-weight: 600;
  font-size: 0.8rem;
  cursor: pointer;
  transition:
    background 0.18s ease,
    color 0.18s ease,
    border-color 0.18s ease;
}

.system-tab-dot {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  flex-shrink: 0;
}

.system-tab:hover {
  background: #eff6ff;
  border-color: #bfdbfe;
}

.system-tab.active {
  background: #01377d;
  border-color: #01377d;
  color: #ffffff;
}

.status-banner h2 {
  font-size: 0.95rem;
  font-weight: 700;
  margin: 0;
}

@media screen and (max-width: 480px) {
  .status-banner h2 {
    font-size: 0.8rem;
  }
}

.status-banner {
  background-color: #e0f2fe;
  padding: 10px;
  border-radius: 8px;
  margin-bottom: 20px;
}

.loading-state {
  text-align: center;
  padding: 2rem;
  font-size: 1.2rem;
  color: #64748b;
}

.station-grid {
  display: flex;
  flex-direction: column;
  gap: 15px;
}
@media screen and (max-width: 480px) {
  .container {
    padding: 1rem;
  }
}
@media screen and (max-width: 375px) {
  :deep(.card-flex-layout) {
    flex-direction: column;
    align-items: stretch;
  }
  :deep(.sparkline-sidebar-wrapper) {
    width: 80%;
  }
  :deep(.sparkline-title) {
    text-align: left;
  }
}
</style>
