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

// Define the available system variables
const variables = [
  { id: 'Discharge', label: 'Discharge' },
  { id: 'Water Temperature', label: 'Water Temperature' },
  { id: 'Specific Conductance', label: 'Specific Conductance' },
  { id: 'pH', label: 'pH' },
  { id: 'Oxygen, dissolved', label: 'Dissolved Oxygen' },
]

const selectedVariable = ref('Discharge')
const emit = defineEmits(['close-sidebar', 'change-view', 'variable-changed'])

const handleVariableChange = () => {
  emit('variable-changed', selectedVariable.value)
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
  </aside>
</template>

<style scoped>
#sidebar {
  grid-area: sidebar;
  height: 100%;
  /* Updated to your exact custom lake-blue background color */
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

/* Custom Styled Dropdown to fit clean dashboard layouts */
.select-wrapper {
  position: relative;
  width: 100%;
}

.select-wrapper::after {
  content: '▼';
  font-size: 0.65rem;
  color: #475569; /* Slate arrow tint */
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
  background-color: #ffffff; /* Clean white card layout */
  font-family: inherit;
  font-size: 0.9rem;
  font-weight: 600;
  color: #1e293b; /* Deep text for pristine readability */
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

/* Clean, modern active tracking style using a bright white marker indicator */
.active-item {
  background-color: rgba(255, 255, 255, 0.15) !important;
  color: #ffffff !important;
  box-shadow: inset 4px 0 0 #ffffff;
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
