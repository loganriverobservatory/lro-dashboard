<script setup lang="ts">
/** * AppHeader.vue
 * Handles top navigation and communicates with App.vue to control the sidebar and view state.
 */
import { Menu, Home, HelpCircle, Droplets } from 'lucide-vue-next'

const emit = defineEmits(['toggle-sidebar', 'change-view'])
</script>

<template>
  <header class="header">
    <div class="menu-icon" @click="emit('toggle-sidebar')">
      <Menu :size="22" />
    </div>

    <div class="header-left">
      <span class="dashboard-tag">Logan River Observatory</span>
    </div>

    <div class="header-right">
      <div class="nav-action-btn" @click="emit('change-view', 'home')" title="Go to Homepage">
        <Home :size="20" class="nav-icon" />
        <span class="nav-label">Home</span>
      </div>

      <div class="nav-action-btn" title="Help / Documentation">
        <HelpCircle :size="20" class="nav-icon" />
        <span class="nav-label">Help</span>
      </div>

      <div class="nav-action-btn" title="HydroServer Status">
        <Droplets :size="20" class="nav-icon" />
        <span class="nav-label">Status</span>
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
  background-color: #ffffff;
  box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  border-bottom: 1px solid #e2e8f0;
  position: relative;
  z-index: 10;
}

.header-left {
  display: flex;
  align-items: center;
}

.dashboard-tag {
  font-size: 0.95rem;
  font-weight: 700;
  color: #475569;
  letter-spacing: -0.01em;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.nav-action-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 8px;
  cursor: pointer;
  color: #475569;
  transition: all 0.2s ease;
}

.nav-icon {
  transition: transform 0.2s ease;
}

.nav-label {
  font-size: 0.85rem;
  font-weight: 600;
}

.nav-action-btn:hover {
  background-color: #f1f5f9;
  color: #0284c7;
}

.nav-action-btn:hover .nav-icon {
  transform: translateY(-1px);
}

.menu-icon {
  display: none;
  color: #475569;
  cursor: pointer;
  padding: 8px;
  border-radius: 8px;
  transition: background-color 0.2s;
}

.menu-icon:hover {
  background-color: #f1f5f9;
  color: #0284c7;
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
}
</style>
