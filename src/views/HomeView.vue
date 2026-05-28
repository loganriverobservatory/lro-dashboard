<script setup lang="ts">
/** * HomeView.vue
 * Serves as the landing page with a hero section and quick-access links for the general public.
 */
import { Droplets, List, Map as MapIcon, Network } from 'lucide-vue-next'

const emit = defineEmits(['change-view'])
</script>

<template>
  <div class="home-container">
    <div class="hero-block">
      <div class="brand-title-row">
        <Droplets :size="36" class="hero-icon" />
        <h1>Logan River Observatory</h1>
      </div>
      <p class="hero-subtitle">
        Welcome to the real-time hydrologic monitoring and data visualization dashboard. Select a
        view below or use the sidebar navigation to explore active observatory stations.
      </p>
    </div>

    <div class="navigation-grid">
      <div class="nav-card" @click="emit('change-view', 'list')">
        <div class="card-header-row">
          <div class="icon-frame frame-blue">
            <List :size="20" />
          </div>
          <h3>Station List</h3>
        </div>
        <p class="card-desc">
          Browse all active monitoring stations in a sortable list. Scan current discharge levels
          and sensor health metrics across the basin in one view.
        </p>
        <span class="card-action-text">Open List View →</span>
      </div>

      <div class="nav-card" @click="emit('change-view', 'map')">
        <div class="card-header-row">
          <div class="icon-frame frame-emerald">
            <MapIcon :size="20" />
          </div>
          <h3>Interactive Map</h3>
        </div>
        <p class="card-desc">
          Locate physical sensor installations on an interactive map. View geographic relationships
          and check live data along the Logan River and its canal corridors.
        </p>
        <span class="card-action-text">Open Map View →</span>
      </div>

      <div class="nav-card" @click="emit('change-view', 'schematic')">
        <div class="card-header-row">
          <div class="icon-frame frame-sky">
            <Network :size="20" />
          </div>
          <h3>Hydrologic Schematic</h3>
        </div>
        <p class="card-desc">
          Explore a topological node map tracing parallel sub-basins, stream paths, and confluences
          across the watershed matrix.
        </p>
        <span class="card-action-text">Open Schematic View →</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.home-wrapper {
  width: 100%;
  min-height: 85vh;
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: #7d9ddd;
  padding: 2rem 1rem;
  box-sizing: border-box;
}

.home-page {
  max-width: 900px;
  width: 100%;
  display: flex;
  justify-content: center;
}

.home-container {
  width: 100%;
  padding: 3rem 2.5rem;
  box-sizing: border-box;
  background-color: #ffffff;
  border-radius: 16px;
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1);
}

.hero-block {
  text-align: left;
  margin-bottom: 3rem;
}

.brand-title-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 1rem;
}

.hero-icon {
  color: #0284c7;
}

.hero-block h1 {
  font-size: 2.25rem;
  font-weight: 800;
  color: #0f172a;
  margin: 0;
  letter-spacing: -0.02em;
}

.hero-subtitle {
  font-size: 1.1rem;
  color: #475569;
  line-height: 1.6;
  margin: 0;
}

.navigation-grid {
  display: grid;
  /* Updated minmax to 250px so three columns comfortably fit row layout space */
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 24px;
}

.nav-card {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  padding: 1.75rem;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease,
    border-color 0.2s ease;
}

.nav-card:hover {
  transform: translateY(-2px);
  background: #ffffff;
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.05);
  border-color: #cbd5e1;
}

.card-header-row {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 1rem;
}

.icon-frame {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 10px;
}

.frame-blue {
  background-color: #e0f2fe;
  color: #0369a1;
}

.frame-emerald {
  background-color: #dcfce7;
  color: #15803d;
}

/* Added background and token color for the new schematic icon frame */
.frame-sky {
  background-color: #e0f2fe;
  color: #0284c7;
}

.nav-card h3 {
  font-size: 1.2rem;
  font-weight: 700;
  color: #1e293b;
  margin: 0;
}

.card-desc {
  font-size: 0.9rem;
  color: #64748b;
  line-height: 1.5;
  margin: 0 0 1.5rem 0;
  flex-grow: 1;
}

.card-action-text {
  font-size: 0.85rem;
  font-weight: 700;
  color: #0284c7;
}
</style>
