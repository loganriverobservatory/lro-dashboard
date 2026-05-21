<script setup lang="ts">
/** * AppSidebar.vue
 * Manages the side navigation menu for switching between dashboard views and handles mobile responsiveness.
 */
import { X, List, Map as MapIcon, MapPin } from 'lucide-vue-next'

defineProps<{
  isOpen: boolean
  currentView: string
}>()

const emit = defineEmits(['close-sidebar', 'change-view'])
</script>

<template>
  <aside id="sidebar" :class="{ 'sidebar-responsive': isOpen }">
    <div class="sidebar-title">
      <div class="sidebar-brand">HydroServer</div>
      <X @click="emit('close-sidebar')" class="close-icon" :size="20" />
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
  color: #9ec0ed;
  overflow-y: auto;
  transition: all 0.5s;
  -webkit-transition: all 0.5s;
  display: flex;
  flex-direction: column;
  border-right: 1px solid #9ec0ed;
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
  color: #ffffff; /* Crisp white header brand text */
  letter-spacing: -0.01em;
}

.close-icon {
  display: none;
  color: #000000;
  cursor: pointer;
}

.close-icon:hover {
  color: #ffffff;
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
  letter-spacing: 0.05em;
  color: #000000;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.sidebar-list-item:hover {
  background-color: rgba(255, 255, 255, 0.05);
  color: #f8fafc;
}

.active-item {
  background-color: #0284c7 !important;
  color: #ffffff !important;
}

@media screen and (max-width: 992px) {
  #sidebar {
    display: none;
  }

  .sidebar-responsive {
    display: flex !important;
    position: absolute;
    z-index: 100;
    width: 260px;
  }

  .close-icon {
    display: inline;
  }
}
</style>
