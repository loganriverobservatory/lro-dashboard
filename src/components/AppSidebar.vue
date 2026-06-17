<script setup lang="ts">
import { ref } from 'vue'
import {
  X,
  List,
  Map as MapIcon,
  MapPin,
  Droplets,
  ChevronDown,
  ChevronRight,
} from 'lucide-vue-next'
import { WATERWAY_COLORS, WATERWAY_LIST } from '../hydroService'

const props = defineProps<{
  isOpen: boolean
  currentView: string
  activeWaterways: string[]
}>()

const variables = [
  { id: 'Discharge', label: 'Discharge' },
  { id: 'Water Temperature', label: 'Water Temperature' },
  { id: 'Specific Conductance', label: 'Specific Conductance' },
  { id: 'pH', label: 'pH' },
  { id: 'Oxygen, dissolved', label: 'Dissolved Oxygen' },
]

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

const emit = defineEmits([
  'close-sidebar',
  'change-view',
  'variable-changed',
  'waterway-filter-changed',
])

const showLegend = () => ['map', 'list', 'schematic'].includes(props.currentView)

const handleVariableChange = () => {
  emit('variable-changed', selectedVariable.value)
}

function toggleWaterway(name: string) {
  const current = new Set(props.activeWaterways)
  if (current.has(name)) {
    current.delete(name)
  } else {
    current.add(name)
  }
  emit('waterway-filter-changed', [...current])
}

function toggleAll() {
  if (props.activeWaterways.length === WATERWAY_LIST.length) {
    emit('waterway-filter-changed', [])
  } else {
    emit('waterway-filter-changed', [...WATERWAY_LIST])
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
          <option v-for="v in variables" :key="v.id" :value="v.id">
            {{ v.label }}
          </option>
        </select>
      </div>
    </div>

    <ul class="sidebar-list">
      <li
        class="sidebar-list-item"
        :class="{ 'active-item': currentView === 'list' }"
        @click="emit('change-view', 'list')"
      >
        <List :size="18" /> <span>LIST VIEW</span>
      </li>
      <li
        class="sidebar-list-item"
        :class="{ 'active-item': currentView === 'map' }"
        @click="emit('change-view', 'map')"
      >
        <MapIcon :size="18" /> <span>MAP VIEW</span>
      </li>
      <li
        class="sidebar-list-item"
        :class="{ 'active-item': currentView === 'schematic' }"
        @click="emit('change-view', 'schematic')"
      >
        <MapPin :size="18" /> <span>SCHEMATIC VIEW</span>
      </li>
    </ul>

    <div v-if="showLegend()" class="legend-section">
      <button class="legend-toggle" @click="legendOpen = !legendOpen">
        <component :is="legendOpen ? ChevronDown : ChevronRight" :size="14" />
        <span>REGIONAL WATERWAYS</span>
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

    <div v-if="showLegend()" class="legend-section">
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

.sidebar-list {
  padding: 20px 12px;
  margin: 0;
  list-style-type: none;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.sidebar-list-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  font-size: 0.85rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.8);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.sidebar-list-item:hover {
  background-color: rgba(255, 255, 255, 0.1);
  color: #ffffff;
}

.active-item {
  background-color: rgba(255, 255, 255, 0.15) !important;
  color: #ffffff !important;
  box-shadow: inset 4px 0 0 #ffffff;
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
