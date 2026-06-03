<script setup lang="ts">
/** * AppHeader.vue
 * Handles top navigation and communicates with App.vue to control the sidebar and view state.
 */
import { Menu, Home, HelpCircle } from 'lucide-vue-next'
import hslogo from '../assets/hydroserver-icon.png'

const emit = defineEmits(['toggle-sidebar', 'change-view'])
</script>

<template>
  <header class="header">
    <div class="menu-icon" @click="emit('toggle-sidebar')">
      <Menu :size="22" />
    </div>

    <div class="header-left">
      <span class="dashboard-tag">Logan River Observatory Dashboard</span>
    </div>

    <div class="header-right">
      <div class="nav-action-btn" @click="emit('change-view', 'home')" title="Go to Homepage">
        <Home :size="20" class="nav-icon" />
        <span class="nav-label">Home</span>
      </div>

      <div class="nav-action-btn" @click="emit('change-view', 'help')" title="View Help">
        <HelpCircle :size="20" class="nav-icon" />
        <span class="nav-label">Help</span>
      </div>

      <a
        href="https://lro.hydroserver.org/"
        target="_blank"
        rel="noopener noreferrer"
        class="nav-action-btn brand-link"
        title="Open HydroServer"
      >
        <img
          :src="hslogo"
          alt="HydroServer Icon"
          style="
            height: 24px;
            width: auto;
            object-fit: contain;
            vertical-align: middle;
            margin-right: 1px;
          "
        />
        <span class="nav-label">HydroServer</span>
      </a>
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
  color: #ffffff; /* Crisp white header text */
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
  color: #e2e8f0; /* Soft bright gray text for unselected state */
  transition: all 0.22s cubic-bezier(0.4, 0, 0.2, 1);
}

.brand-link {
  text-decoration: none;
}

.nav-icon {
  transition: transform 0.2s ease;
}

.droplet-icon {
  width: 20px;
  height: 20px;
}

.nav-label {
  font-size: 0.85rem;
  font-weight: 600;
}

/* Hover effects adjusted to play nicely on the dark slate/gray-blue base background */
.nav-action-btn:hover {
  background-color: rgba(255, 255, 255, 0.12); /* Subtle overlay alpha block */
  color: #ffffff; /* Fully pops to crisp white on hover */
}

.nav-action-btn:hover .nav-icon {
  transform: translateY(-1px);
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

  /* Collapse the action buttons to icons only so the row fits a phone width
     instead of pushing "HydroServer" off the right edge. */
  .nav-label {
    display: none;
  }

  .nav-action-btn {
    padding: 8px;
  }
}
</style>
