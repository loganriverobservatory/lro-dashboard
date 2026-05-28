<script setup lang="ts">
/** * AppSidebar.vue
 * Manages side navigation and variable filtering for the dashboard.
 */
import { ref } from 'vue'
import { X, List, Map as MapIcon, MapPin, Droplets } from 'lucide-vue-next'

defineProps<{
  isOpen: boolean
  currentView: string
}>()

// 1. Define the available variables
const variables = [
  { id: 'Discharge', label: 'Discharge' },
  { id: 'Water Temperature', label: 'Water Temp' },
  { id: 'Specific Conductance', label: 'Specific Conductance' },
  { id: 'pH', label: 'pH' },
  { id: 'Oxygen, dissolved', label: 'Dissolved Oxygen' },
]

const selectedVariable = ref('Discharge')
const emit = defineEmits(['close-sidebar', 'change-view', 'variable-changed'])

// 2. Function to handle selection change
const handleVariableChange = () => {
  emit('variable-changed', selectedVariable.value)
}
</script>

<template>
  <aside id="sidebar" :class="{ 'sidebar-responsive': isOpen }">
    <div class="sidebar-title">
      <div class="sidebar-brand">LRO Dashboard</div>
      <X @click="emit('close-sidebar')" class="close-icon" :size="20" />
    </div>

    <div class="filter-section">
      <label class="filter-label"> <Droplets :size="14" /> <span>SELECT VARIABLE</span> </label>
      <select v-model="selectedVariable" @change="handleVariableChange" class="variable-select">
        <option v-for="v in variables" :key="v.id" :value="v.id">
          {{ v.label }}
        </option>
      </select>
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
  </aside>
</template>

<style scoped>
#sidebar {
  grid-area: sidebar;
  height: 100%;
  background-color: #9ec0ed;
  color: #000000;
  overflow-y: auto;
  transition: all 0.5s;
  display: flex;
  flex-direction: column;
  border-right: 1px solid #9ec0ed;

  /* FIXED: Ensure sidebar stays on top of the map */
  position: relative;
  z-index: 1000;
}

.sidebar-title {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  height: 70px;
  box-sizing: border-box;
}

.sidebar-brand {
  font-size: 1.25rem;
  font-weight: 800;
  color: #ffffff;
  letter-spacing: -0.01em;
}

/* NEW: Filter Styling */
.filter-section {
  padding: 0 24px 20px 24px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.filter-label {
  font-size: 0.7rem;
  font-weight: 800;
  color: #ffffff;
  display: flex;
  align-items: center;
  gap: 6px;
  opacity: 0.9;
}

.variable-select {
  width: 100%;
  padding: 10px;
  border-radius: 6px;
  border: none;
  background-color: white;
  font-family: inherit;
  font-size: 0.9rem;
  font-weight: 600;
  color: #0284c7;
  cursor: pointer;
  outline: none;
}

.sidebar-list {
  padding: 12px;
  margin: 0;
  list-style-type: none;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.sidebar-list-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  font-size: 0.85rem;
  font-weight: 600;
  color: #000000;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.sidebar-list-item:hover {
  background-color: rgba(255, 255, 255, 0.2);
}

.active-item {
  background-color: #0284c7 !important;
  color: #ffffff !important;
}

.close-icon {
  display: none;
  color: #ffffff;
  cursor: pointer;
}

@media screen and (max-width: 992px) {
  #sidebar {
    display: none;
    position: fixed; /* For mobile overlay */
  }

  .sidebar-responsive {
    display: flex !important;
    z-index: 10000; /* Higher than map on mobile */
    width: 260px;
  }

  .close-icon {
    display: inline;
  }
}
</style>
