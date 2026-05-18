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
      <X @click="emit('close-sidebar')" class="close-icon" :size="24" />
    </div>

    <ul class="sidebar-list">
      <li
        class="sidebar-list-item"
        :class="{ 'active-item': currentView === 'list' }"
        @click="emit('change-view', 'list')"
      >
        <List :size="20" /> LIST VIEW
      </li>
      <li
        class="sidebar-list-item"
        :class="{ 'active-item': currentView === 'map' }"
        @click="emit('change-view', 'map')"
      >
        <MapIcon :size="20" /> MAP VIEW
      </li>
      <li
        class="sidebar-list-item"
        :class="{ 'active-item': currentView === 'schematic' }"
        @click="emit('change-view', 'schematic')"
      >
        <MapPin :size="20" /> SCHEMATIC VIEW
      </li>
    </ul>
  </aside>
</template>

<style scoped>
#sidebar {
  grid-area: sidebar;
  height: 100%;
  background-color: #428286;
  overflow-y: auto;
  transition: all 0.5s;
}
.sidebar-title {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 30px;
  color: #f0f4f5;
  font-weight: bold;
}
.close-icon {
  cursor: pointer;
  display: none;
}
.sidebar-list {
  padding: 0;
  list-style-type: none;
}
.sidebar-list-item {
  padding: 20px 30px;
  font-size: 14px;
  font-weight: 600;
  color: #e2e8f0;
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
  border-left: 4px solid transparent;
}
.active-item {
  background-color: rgba(255, 255, 255, 0.15);
  color: #ffffff;
  border-left: 4px solid #38bdf8;
}
@media screen and (max-width: 992px) {
  #sidebar {
    display: none;
    position: fixed;
    z-index: 999;
    width: 260px;
  }
  .sidebar-responsive {
    display: block !important;
  }
  .close-icon {
    display: block;
  }
}
</style>
