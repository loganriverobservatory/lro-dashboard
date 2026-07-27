<script setup lang="ts">
/** * AppHeader.vue
 * Top navigation: the List/Map/Schematic view switcher, plus the mobile sidebar toggle.
 * Home/Help/HydroServer moved to AppSidebar's footer to make room - see AppSidebar.vue.
 * Communicates with App.vue to control the sidebar and view state.
 */
import { Menu, List, Map as MapIcon, MapPin } from 'lucide-vue-next'

// dashboardTitle comes from App.vue (ultimately public/config.json) with a default here so the
// app still renders sensibly if a deployment's config.json omits it - unlike the API endpoints
// in hydroService.ts's setApiConfig(), a missing header label isn't a functional break, so it
// doesn't need to fail loudly.
const props = withDefaults(
  defineProps<{
    dashboardTitle?: string
    // Drives which of List/Map/Schematic reads as active - see App.vue's currentView, which
    // already tracks 'schematic' for any /schematic/* route (see its isSchematicRoute watcher).
    currentView: string
  }>(),
  {
    dashboardTitle: 'Dashboard',
  },
)

const emit = defineEmits(['toggle-sidebar', 'change-view'])
</script>

<template>
  <header class="header">
    <div class="menu-icon" @click="emit('toggle-sidebar')">
      <Menu :size="22" />
    </div>

    <div class="header-left">
      <span class="dashboard-tag">{{ dashboardTitle }}</span>
    </div>

    <div class="header-right">
      <div
        class="nav-action-btn"
        :class="{ 'nav-action-active': currentView === 'list' }"
        @click="emit('change-view', 'list')"
        title="List View"
      >
        <List :size="20" class="nav-icon" />
        <span class="nav-label">List</span>
      </div>

      <div
        class="nav-action-btn"
        :class="{ 'nav-action-active': currentView === 'map' }"
        @click="emit('change-view', 'map')"
        title="Map View"
      >
        <MapIcon :size="20" class="nav-icon" />
        <span class="nav-label">Map</span>
      </div>

      <div
        class="nav-action-btn"
        :class="{ 'nav-action-active': currentView === 'schematic' }"
        @click="emit('change-view', 'schematic')"
        title="Schematic View"
      >
        <MapPin :size="20" class="nav-icon" />
        <span class="nav-label">Schematic</span>
      </div>
    </div>
  </header>
</template>

<style scoped>
.header {
  grid-area: header;
  height: 70px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  background-color: #073763;
  box-shadow: 0 2px 4px 0 rgba(0, 0, 0, 0.1);
  position: relative;
  z-index: 10;
}

.header-left {
  display: flex;
  align-items: center;
}

.dashboard-tag {
  font-size: 1rem;
  font-weight: 600;
  color: #ffffff;
  letter-spacing: -0.01em;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-left: auto;
}

.nav-action-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
  border-radius: 8px;
  cursor: pointer;
  color: #e2e8f0;
  transition: all 0.22s cubic-bezier(0.4, 0, 0.2, 1);
}

.nav-icon {
  transition: transform 0.2s ease;
}

.nav-label {
  font-size: 0.85rem;
  font-weight: 600;
}

/* Hover effects adjusted to play nicely on the dark slate/gray-blue base background */
.nav-action-btn:hover {
  background-color: rgba(255, 255, 255, 0.12);
  color: #ffffff;
}

.nav-action-btn:hover .nav-icon {
  transform: translateY(-1px);
}

.nav-action-active {
  background-color: rgba(255, 255, 255, 0.18);
  color: #ffffff;
}

.menu-icon {
  display: none;
  color: #ffffff;
  cursor: pointer;
  padding: 8px;
  border-radius: 8px;
  transition: background-color 0.2s;
}

.menu-icon:hover {
  background-color: rgba(255, 255, 255, 0.12);
}

@media screen and (max-width: 992px) {
  .menu-icon {
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .dashboard-tag {
    display: none;
  }

  .nav-label {
    display: none;
  }

  .nav-action-btn {
    padding: 8px;
  }
}
</style>
