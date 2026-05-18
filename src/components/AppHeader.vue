<script setup lang="ts">
/** * AppHeader.vue
 * Handles top navigation and communicates with App.vue to control the sidebar and view state.
 */
import { Menu, Search, Home, HelpCircle, Droplets } from 'lucide-vue-next'

// Emits let this child component send messages up to App.vue
const emit = defineEmits(['toggle-sidebar', 'change-view'])
</script>

<template>
  <header class="header">
    <div class="menu-icon" @click="emit('toggle-sidebar')">
      <Menu :size="24" />
    </div>

    <div class="header-left">
      <Search :size="20" />
    </div>

    <div class="header-right">
      <Home :size="22" class="nav-icon" @click="emit('change-view', 'home')" />
      <HelpCircle :size="22" class="nav-icon" />
      <Droplets :size="22" class="nav-icon" />
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
  padding: 0 30px;
  background-color: #ffffff;
  box-shadow: 0 6px 7px -3px rgba(0, 0, 0, 0.35);
}
.header .lucide {
  color: #334155;
  cursor: pointer;
}
.nav-icon {
  cursor: pointer;
  transition: transform 0.2s;
  margin-left: 15px;
}
.nav-icon:hover {
  transform: scale(1.1);
  color: #38bdf8;
}
.menu-icon {
  display: none;
}
@media screen and (max-width: 992px) {
  .menu-icon {
    display: block;
    cursor: pointer;
  }
}
</style>
