<script setup lang="ts">
/** * AppHeader.vue
 * Handles top navigation and communicates with App.vue to control the sidebar and view state.
 */
import { Menu, Home, HelpCircle } from 'lucide-vue-next'
import hslogo from '../assets/hydroserver-icon.png'

// Branding comes from App.vue (ultimately public/config.json) with defaults here so the app
// still renders sensibly if a deployment's config.json omits any of these - unlike the API
// endpoints in hydroService.ts's setApiConfig(), a missing header label isn't a functional
// break, so it doesn't need to fail loudly.
const props = withDefaults(
  defineProps<{
    dashboardTitle?: string
    headerNav?: { home?: string; help?: string }
    externalLink?: { url?: string; label?: string }
  }>(),
  {
    dashboardTitle: 'Dashboard',
    headerNav: () => ({}),
    externalLink: () => ({}),
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
      <div class="nav-action-btn" @click="emit('change-view', 'home')" title="Go to Homepage">
        <Home :size="20" class="nav-icon" />
        <span class="nav-label">{{ headerNav.home ?? 'Home' }}</span>
      </div>

      <div class="nav-action-btn" @click="emit('change-view', 'help')" title="View Help">
        <HelpCircle :size="20" class="nav-icon" />
        <span class="nav-label">{{ headerNav.help ?? 'Help' }}</span>
      </div>

      <a
        v-if="props.externalLink.url"
        :href="props.externalLink.url"
        target="_blank"
        rel="noopener noreferrer"
        class="nav-action-btn brand-link"
        :title="`Open ${props.externalLink.label ?? 'external site'}`"
      >
        <img
          :src="hslogo"
          alt=""
          style="
            height: 22px;
            width: auto;
            object-fit: contain;
            vertical-align: middle;
            margin-right: 4px;
            filter: brightness(0) invert(1);
            image-rendering: -webkit-optimize-contrast;
            image-rendering: crisp-edges;

            opacity: 1;
          "
        />
        <span class="nav-label">{{ props.externalLink.label ?? 'External Link' }}</span>
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

.brand-link {
  text-decoration: none;
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

.nav-action-btn:hover img {
  filter: brightness(0) invert(1) !important;
  opacity: 1 !important;
  transform: translateY(-1px);
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

  .nav-label {
    display: none;
  }

  .nav-action-btn {
    padding: 8px;
  }
}
</style>
