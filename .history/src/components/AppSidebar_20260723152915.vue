<script setup lang="ts">
/*
AppSidebar.vue - the variable picker, the List/Map "FILTER STATIONS" Systems/Data-Sources
toggle, the "DATA STATUS" legend (plus a plain, un-toggled "DATA SOURCES" list on the schematic
view specifically - see showSchematicSources), and a footer row (Home/Help/HydroServer). List,
Map, and Schematic view switching itself lives in AppHeader now - the schematic system switcher
(Upper Logan / Lower Logan / Blacksmith Fork / Little Bear) lives only on SchematicView.vue's own
tab bar, so it isn't duplicated here. Collapses to a toggleable overlay on narrow screens (see
App.vue's sidebarOpen), controlled by AppHeader's menu icon.
*/
import { ref, computed } from 'vue'
import { useRoute } from 'vue-router'
import { X, Droplets, ChevronDown, ChevronRight, Home, HelpCircle } from 'lucide-vue-next'
import { WATERWAY_COLORS, WATERWAY_LIST, WATER_VARIBALES } from '../hydroService'
import { toggleInList } from '../utils'
import hslogo from '../assets/hydroserver-icon.png'

const props = withDefaults(
  defineProps<{
    isOpen: boolean
    currentView: string
    activeWaterways: string[]
    // Which schematic systems are active in List/Map view's system filter - see App.vue's
    // activeSystems.
    activeSystems: string[]
    // Which of activeSystems/activeWaterways List/Map view's filter is currently applying - see
    // App.vue's filterMode.
    filterMode: 'system' | 'source'
    // Manifest-ordered {slug, label} list built by App.vue from the loaded schematic pages -
    // this is what lets the SYSTEMS filter checkboxes reflect any adopter's own schematic JSON
    // files without editing this component.
    schematicNav: { slug: string; label: string }[]
    // Footer branding, moved here from AppHeader - see AppHeader.vue's own comment for why
    // these are optional/defaulted rather than required.
    headerNav?: { home?: string; help?: string }
    externalLink?: { url?: string; label?: string }
  }>(),
  {
    headerNav: () => ({}),
    externalLink: () => ({}),
  },
)

const route = useRoute()
const isSchematicActive = computed(() => route.path.startsWith('/schematic/'))

const selectedVariable = ref('Discharge')
const legendOpen = ref(true)
const freshnessOpen = ref(true)

// Added badge text properties to feed the side-by-side pill layouts
const freshnessItems = [
  {
    label: 'Current',
    note: '< 2 hrs old',
    color: '#16a34a',
    badgeText: 'Live',
    badgeClass: 'badge-online',
  },
  {
    label: 'Stale',
    note: '2–24 hrs old',
    color: '#d97706',
    badgeText: 'Offline',
    badgeClass: 'badge-offline',
  },
  {
    label: 'Outdated',
    note: '> 24 hrs old',
    color: '#973131',
    badgeText: 'Offline',
    badgeClass: 'badge-offline',
  },
]

const emit = defineEmits<{
  (e: 'close-sidebar'): void
  (e: 'change-view', view: string): void
  (e: 'variable-changed', variable: string): void
  (e: 'waterway-filter-changed', updated: string[]): void
  (e: 'system-filter-changed', updated: string[]): void
  (e: 'filter-mode-changed', mode: 'system' | 'source'): void
}>()

// The DATA STATUS legend makes sense on any view that shows colored stations/pins.
const showFreshnessLegend = () =>
  ['home', 'map', 'list'].includes(props.currentView) || isSchematicActive.value
// List/Map get the combined Systems/Data Sources filter toggle below - the schematic view
// only ever shows one system at a time via its own page routing, so a systems filter doesn't
// apply there; it keeps a plain, un-toggled Data Sources list instead (see showSchematicSources).
const showFilterToggle = () => ['home', 'map', 'list'].includes(props.currentView)
const showSchematicSources = () => isSchematicActive.value

const handleVariableChange = () => {
  emit('variable-changed', selectedVariable.value)
}

// Adds/removes one waterway group from the active filter set (used by both the map and list
// views, and the schematic's live-station lookup) - see App.vue's activeWaterways.
function toggleWaterway(name: string) {
  emit('waterway-filter-changed', toggleInList(props.activeWaterways, name))
}

// The "Select All"/"Deselect All" toggle button - flips between every waterway active and none.
function toggleAll() {
  if (props.activeWaterways.length === WATERWAY_LIST.length) {
    emit('waterway-filter-changed', [])
  } else {
    emit('waterway-filter-changed', [...WATERWAY_LIST])
  }
}

// Adds/removes one schematic system from the List/Map view filter - see App.vue's
// activeSystems. Mirrors toggleWaterway above, just for a different filter dimension.
function toggleSystem(slug: string) {
  emit('system-filter-changed', toggleInList(props.activeSystems, slug))
}

function toggleAllSystems() {
  if (props.activeSystems.length === props.schematicNav.length) {
    emit('system-filter-changed', [])
  } else {
    emit(
      'system-filter-changed',
      props.schematicNav.map((s) => s.slug),
    )
  }
}
</script>

<template>
  <aside id="sidebar" :class="{ 'sidebar-responsive': isOpen }">
    <div class="sidebar-title">
      <span class="sidebar-brand">Navigation</span>
      <X @click="emit('close-sidebar')" class="close-icon" :size="20" />
    </div>

    <div class="filter-section">
      <label class="filter-label">
        <Droplets :size="13" />
        <span>SELECT VARIABLE</span>
      </label>
      <div class="select-wrapper">
        <select v-model="selectedVariable" @change="handleVariableChange" class="variable-select">
          <option v-for="v in WATER_VARIBALES" :key="v.id" :value="v.id">
            {{ v.label }}
          </option>
        </select>
      </div>
    </div>

    <!-- List/Map's combined filter: a mode toggle picks which single dimension is currently
    applied (see App.vue's filterMode), with one checkbox list underneath for whichever mode is
    active - simpler than showing both dimensions' checkboxes stacked at once. -->
    <div v-if="showFilterToggle()" class="legend-section">
      <button class="legend-toggle" @click="legendOpen = !legendOpen">
        <component :is="legendOpen ? ChevronDown : ChevronRight" :size="14" />
        <span>FILTER STATIONS</span>
      </button>

      <div v-if="legendOpen" class="legend-body">
        <div class="filter-mode-toggle">
          <button
            type="button"
            class="filter-mode-btn"
            :class="{ active: filterMode === 'system' }"
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

        <template v-if="filterMode === 'system'">
          <button class="toggle-all-btn" @click="toggleAllSystems">
            {{ activeSystems.length === schematicNav.length ? 'Deselect All' : 'Select All' }}
          </button>
          <label v-for="s in schematicNav" :key="s.slug" class="legend-item">
            <input
              type="checkbox"
              class="legend-checkbox"
              :checked="activeSystems.includes(s.slug)"
              @change="toggleSystem(s.slug)"
            />
            <span class="legend-name">{{ s.label }}</span>
          </label>
        </template>

        <template v-else>
          <button class="toggle-all-btn" @click="toggleAll">
            {{ activeWaterways.length === WATERWAY_LIST.length ? 'Deselect All' : 'Select All' }}
          </button>
          <label v-for="name in WATERWAY_LIST" :key="name" class="legend-item">
            <input
              type="checkbox"
              class="legend-checkbox"
              :checked="activeWaterways.includes(name)"
              @change="toggleWaterway(name)"
            />
            <span class="legend-swatch" :style="{ background: WATERWAY_COLORS[name] }"></span>
            <span class="legend-name">{{ name }}</span>
          </label>
        </template>
      </div>
    </div>

    <!-- The schematic view already shows exactly one system at a time via its own page
    routing, so it only gets a plain Data Sources list here (no mode toggle, no system filter -
    that's what filters which stations fuzzy-match onto the diagram, same as before). -->
    <div v-if="showSchematicSources()" class="legend-section">
      <button class="legend-toggle" @click="legendOpen = !legendOpen">
        <component :is="legendOpen ? ChevronDown : ChevronRight" :size="14" />
        <span>DATA SOURCES</span>
      </button>

      <div v-if="legendOpen" class="legend-body">
        <button class="toggle-all-btn" @click="toggleAll">
          {{ activeWaterways.length === WATERWAY_LIST.length ? 'Deselect All' : 'Select All' }}
        </button>
        <label v-for="name in WATERWAY_LIST" :key="name" class="legend-item">
          <input
            type="checkbox"
            class="legend-checkbox"
            :checked="activeWaterways.includes(name)"
            @change="toggleWaterway(name)"
          />
          <span class="legend-swatch" :style="{ background: WATERWAY_COLORS[name] }"></span>
          <span class="legend-name">{{ name }}</span>
        </label>
      </div>
    </div>

    <div v-if="showFreshnessLegend()" class="legend-section">
      <button class="legend-toggle" @click="freshnessOpen = !freshnessOpen">
        <component :is="freshnessOpen ? ChevronDown : ChevronRight" :size="14" />
        <span>DATA STATUS</span>
      </button>

      <div v-if="freshnessOpen" class="legend-body">
        <div v-for="item in freshnessItems" :key="item.label" class="status-row">
          <div class="status-info-left">
            <span class="legend-swatch" :style="{ background: item.color }"></span>
            <div class="status-text-stack">
              <span class="legend-name">{{ item.label }}</span>
              <span class="status-note">{{ item.note }}</span>
            </div>
          </div>

          <span :class="['status-badge', item.badgeClass]">
            {{ item.badgeText }}
          </span>
        </div>
      </div>
    </div>

    <!-- Home/Help/HydroServer, moved down here from AppHeader to make room for the
    List/Map/Schematic view switcher up there. Pinned to the bottom via margin-top: auto (see
    .sidebar-footer) rather than living inline in normal flow. -->
    <div class="sidebar-footer">
      <div
        class="footer-icon-btn"
        @click="emit('change-view', 'home')"
        :title="headerNav.home ?? 'Home'"
      >
        <Home :size="18" />
      </div>
      <div
        class="footer-icon-btn"
        @click="emit('change-view', 'help')"
        :title="headerNav.help ?? 'Help'"
      >
        <HelpCircle :size="18" />
      </div>
      <a
        v-if="props.externalLink.url"
        :href="props.externalLink.url"
        target="_blank"
        rel="noopener noreferrer"
        class="footer-icon-btn footer-brand-link"
        :title="`Open ${props.externalLink.label ?? 'external site'}`"
      >
        <img :src="hslogo" alt="" class="footer-hs-icon" />
      </a>
    </div>
  </aside>
</template>

<style scoped>
#sidebar {
  grid-area: sidebar;
  height: 100%;
  background-color: #497eae;
  color: #ffffff;
  overflow-y: auto;
  transition: all 0.3s ease;
  display: flex;
  flex-direction: column;
  border-right: 1px solid rgba(255, 255, 255, 0.1);
  position: relative;
  z-index: 1000;
}

.sidebar-title {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 24px;
  height: 70px;
  box-sizing: border-box;
}

.sidebar-brand {
  font-size: 1.1rem;
  font-weight: 700;
  color: #ffffff;
  letter-spacing: -0.01em;
  opacity: 0.95;
}

.filter-section {
  padding: 0 24px 24px 24px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.12);
}

.filter-label {
  font-size: 0.7rem;
  font-weight: 800;
  color: rgba(255, 255, 255, 0.8);
  display: flex;
  align-items: center;
  gap: 6px;
  letter-spacing: 0.06em;
}

.select-wrapper {
  position: relative;
  width: 100%;
}

.select-wrapper::after {
  content: '▼';
  font-size: 0.65rem;
  color: #475569;
  position: absolute;
  right: 14px;
  top: 50%;
  transform: translateY(-50%);
  pointer-events: none;
}

.variable-select {
  width: 100%;
  padding: 11px 32px 11px 14px;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
  background-color: #ffffff;
  font-family: inherit;
  font-size: 0.9rem;
  font-weight: 600;
  color: #1e293b;
  cursor: pointer;
  outline: none;
  appearance: none;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  transition:
    transform 0.15s ease,
    box-shadow 0.15s ease;
}

.variable-select:hover {
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.08);
}

.variable-select option {
  background-color: #ffffff;
  color: #1e293b;
}

.legend-section {
  padding: 0 12px 16px 12px;
  border-top: 1px solid rgba(255, 255, 255, 0.12);
  margin-top: 4px;
}

.legend-toggle {
  display: flex;
  align-items: center;
  gap: 6px;
  width: 100%;
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.8);
  font-size: 0.7rem;
  font-weight: 800;
  letter-spacing: 0.06em;
  cursor: pointer;
  padding: 14px 4px 8px 4px;
  text-align: left;
}

.legend-toggle:hover {
  color: #ffffff;
}

.legend-body {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.toggle-all-btn {
  background: rgba(255, 255, 255, 0.15);
  border: none;
  color: #ffffff;
  font-size: 0.72rem;
  font-weight: 600;
  padding: 5px 10px;
  border-radius: 6px;
  cursor: pointer;
  margin-bottom: 4px;
  text-align: left;
}

.toggle-all-btn:hover {
  background: rgba(255, 255, 255, 0.25);
}

/* Segmented control picking which single filter dimension (Systems or Data Sources) is
   currently applied - see App.vue's filterMode. */
.filter-mode-toggle {
  display: flex;
  gap: 4px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  padding: 3px;
  margin-bottom: 10px;
}

.filter-mode-btn {
  flex: 1;
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.75);
  font-size: 0.7rem;
  font-weight: 700;
  padding: 6px 8px;
  border-radius: 6px;
  cursor: pointer;
  text-align: center;
  transition:
    background 0.18s ease,
    color 0.18s ease;
}

.filter-mode-btn:hover {
  color: #ffffff;
}

.filter-mode-btn.active {
  background: #ffffff;
  color: #073763;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  padding: 3px 4px;
  border-radius: 6px;
  transition: background 0.15s;
}

.legend-item:hover {
  background: rgba(255, 255, 255, 0.08);
}

.legend-checkbox {
  width: 14px;
  height: 14px;
  cursor: pointer;
  flex-shrink: 0;
  accent-color: #ffffff;
}

.legend-swatch {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  flex-shrink: 0;
  border: 1.5px solid rgba(255, 255, 255, 0.4);
}

.legend-name {
  font-size: 0.78rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.9);
  line-height: 1.3;
}

/* Status Panel Side-by-Side Specific Layouts */
.status-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 5px 6px;
  background: rgba(255, 255, 255, 0.04);
  border-radius: 8px;
}

.status-info-left {
  display: flex;
  align-items: center;
  gap: 10px;
}

.status-text-stack {
  display: flex;
  flex-direction: column;
  line-height: 1.2;
}

.status-note {
  font-size: 0.68rem;
  color: rgba(255, 255, 255, 0.65);
  font-style: italic;
  font-weight: 400;
}

/* Badge Layouts synchronized with StationCard styles */
.status-badge {
  font-size: 0.65rem;
  font-weight: 700;
  padding: 0.2rem 0.5rem;
  border-radius: 9999px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  flex-shrink: 0;
}

.badge-online {
  background-color: #dcfce7;
  color: #166534;
}

.badge-offline {
  background-color: #e2e8f0;
  color: #334155;
}

.close-icon {
  display: none;
  color: #ffffff;
  cursor: pointer;
}

/* Home/Help/HydroServer, pinned to the bottom-left corner of the sidebar. margin-top: auto
   pushes it down within the flex column regardless of how much content sits above it. */
.sidebar-footer {
  margin-top: auto;
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 12px;
  border-top: 1px solid rgba(255, 255, 255, 0.12);
}

.footer-icon-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 8px;
  color: rgba(255, 255, 255, 0.8);
  cursor: pointer;
  transition: all 0.2s ease;
}

.footer-icon-btn:hover {
  background-color: rgba(255, 255, 255, 0.15);
  color: #ffffff;
}

.footer-brand-link {
  text-decoration: none;
}

.footer-hs-icon {
  height: 18px;
  width: auto;
  object-fit: contain;
  filter: brightness(0) invert(1);
}

@media screen and (max-width: 992px) {
  #sidebar {
    display: none;
    position: fixed;
  }

  .sidebar-responsive {
    display: flex !important;
    z-index: 10000;
    width: 260px;
  }

  .close-icon {
    display: inline;
  }
}
</style>
