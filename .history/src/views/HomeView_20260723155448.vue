<script setup lang="ts">
/**
 * HomeView.vue
 * Serves as the landing page with a hero section and quick-access links for the general public.
 */
import { List, Map as MapIcon, Network } from 'lucide-vue-next'
import lroLogo from '../assets/lro-logo.png'
import heroBanner from '../assets/home-hero-banner.jpg'

const emit = defineEmits(['change-view'])
</script>

<template>
  <div class="hero-banner" :style="{ backgroundImage: `url(${heroBanner})` }">
    <div class="hero-banner-overlay"></div>
    <img :src="lroLogo" alt="Logan River Observatory" class="hero-logo" />
  </div>

  <div class="home-container">
    <div class="hero-block">
      <div class="hero-text-group">
        <h2 class="hero-title">Current Basin Conditions</h2>
        <p class="hero-subtitle">
          Explore real-time climate, hydrology, and water quality data streams. This open-access
          dashboard provides live tracking of environmental conditions across the Logan River Basin.
        </p>
      </div>
    </div>

    <div class="navigation-grid">
      <div class="nav-card card-blue" @click="emit('change-view', 'list')">
        <div class="card-header-row">
          <div class="icon-frame frame-blue">
            <List :size="20" />
          </div>
          <h3>Station List</h3>
        </div>
        <p class="card-desc">
          Browse active monitoring stations throughout the basin. View a summary of current water
          flow, temperatures, and key water quality metrics in a clean, sortable list.
        </p>
        <span class="card-action-text text-blue">Open List View →</span>
      </div>

      <div class="nav-card card-green" @click="emit('change-view', 'map')">
        <div class="card-header-row">
          <div class="icon-frame frame-green">
            <MapIcon :size="20" />
          </div>
          <h3>Interactive Map</h3>
        </div>
        <p class="card-desc">
          Locate physical sensor installations that are currently operational by the Logan River
          Observatory. Click on individual stations to view geographic relationships and explore
          live, localized data streams.
        </p>
        <span class="card-action-text text-green">Open Map View →</span>
      </div>

      <div class="nav-card card-blue" @click="emit('change-view', 'schematic')">
        <div class="nav-card-content">
          <div class="card-header-row">
            <div class="icon-frame frame-blue">
              <Network :size="20" />
            </div>
            <h3>Hydrologic Schematic</h3>
          </div>
          <p class="card-desc">
            View a simplified diagram of the Logan River system. Trace the water's path as it flows
            from mountain streams down into valley channels and community canals.
          </p>
        </div>
        <span class="card-action-text text-blue">Open Schematic View →</span>
      </div>
    </div>
    <div class="hero-text-group">
      <h2 class="hero-title">Scope</h2>
      <p class="hero-subtitle">
        The Logan River Observatory (LRO) Dashboard is designed to provide the public with easy
        access to Cache Valley watershed data. While HydroServer - the underlying data management
        app - offers robust functionality, its complexity can present a barrier for general users.
        The LRO Dashboard serves as a user-friendly interface, translating raw data into clear,
        real-time informationn. For more details on site and variable information, please visit
        HydroServer by clicking the top right corner icon or view the help page.
      </p>
    </div>
    <div class="hero-text-group">
      <h2 class="hero-title">Future Updates</h2>
      <ul class="hero-subtitle">
        <li>Display ΔQ between stations</li>
        <li>Expand historical data visualizations</li>
        <li>Mobile-responsive design improvements</li>
        <li>Data source references and comparisons(USGS, DRWi, etc.)</li>
        <li>Climate stations added to all views</li>
      </ul>
    </div>
  </div>
</template>

<style scoped>
.home-container {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  width: 100%;
  max-width: 1440px;
  margin: 0;
  padding: 2.5rem 3rem 4rem 2.5rem;
  box-sizing: border-box;
}

.hero-block {
  text-align: left;
  margin: 2.5rem 0 3.5rem 0;
}

/* Full-bleed photo banner - lives outside .home-container's padding/max-width entirely (see
   the template) so it spans exactly from the sidebar's edge to the browser's right edge, same
   as .main-container itself. No rounded corners, no padding-driven inset. margin-top leaves a
   strip of white space above it instead of starting flush with the viewport edge. */
.hero-banner {
  position: relative;
  overflow: hidden;
  min-height: 260px;
  margin-top: 2rem;
  display: flex;
  align-items: flex-end;
  background-size: cover;
  background-position: center 45%;
  background-repeat: no-repeat;
  background-color: #073763;
}

.hero-banner-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    100deg,
    rgba(7, 55, 99, 0.4) 0%,
    rgba(7, 55, 99, 0.05) 40%,
    rgba(7, 55, 99, 0.05) 65%,
    rgba(7, 55, 99, 0.3) 100%
  );
}

/* No background chip behind the logo - a drop-shadow does the contrast work instead, so the
   logo's own colors show directly against the photo. Sized to nearly fill the banner's own
   height - a literal 5x of the prior size would be taller than this shorter banner and would
   have to overlap past its edge into the page below; ask if that overlapping-badge look is
   what you want instead and I'll set it up that way. */
.hero-logo {
  position: relative;
  z-index: 2;
  height: auto;
  max-height: 210px;
  max-width: min(900px, calc(100% - 5rem));
  object-fit: contain;
  display: block;
  margin: 0 0 1.5rem 2.5rem;
  filter: drop-shadow(1px 0 0 rgba(7, 55, 99, 0.85)) drop-shadow(-1px 0 0 rgba(7, 55, 99, 0.85))
    drop-shadow(0 1px 0 rgba(7, 55, 99, 0.85)) drop-shadow(0 -1px 0 rgba(7, 55, 99, 0.85))
    drop-shadow(0 6px 6px rgba(0, 0, 0, 0.4)) drop-shadow(0 14px 20px rgba(0, 0, 0, 0.3));
}

.hero-text-group {
  position: relative;
  z-index: 10;
  margin-top: 0.5rem;
}

.hero-title {
  font-size: 1.85rem;
  font-weight: 700;
  color: #0f172a;
  letter-spacing: -0.025em;
  margin: 0 0 0.75rem 0;
}

.hero-subtitle {
  font-size: 1.08rem;
  color: #475569;
  line-height: 1.6;
  margin: 0;
  max-width: 820px;
}

/* Balanced Grid Columns */
.navigation-grid {
  display: grid;
  grid-template-columns: repeat(
    3,
    minmax(280px, 400px)
  ); /* Restricts cards from becoming excessively wide */
  gap: 28px;
}

/* Base Card Styles */
.nav-card {
  border-radius: 14px;
  padding: 2rem;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  transition:
    transform 0.22s cubic-bezier(0.4, 0, 0.2, 1),
    box-shadow 0.22s cubic-bezier(0.4, 0, 0.2, 1),
    border-color 0.22s cubic-bezier(0.4, 0, 0.2, 1),
    background-color 0.22s ease;
}

/* Blue Card Specifics */
.card-blue {
  background-color: #f8fafc;
  border: 1px solid #e2e8f0;
}
.card-blue:hover {
  background-color: #f0f7ff;
  border-color: #3b82f6;
  transform: translateY(-4px);
  box-shadow: 0 12px 24px -4px rgba(59, 130, 246, 0.1);
}

/* Green Card Specifics */
.card-green {
  background-color: #f8fafc;
  border: 1px solid #e2e8f0;
}
.card-green:hover {
  background-color: #f0fdf4;
  border-color: #22c55e;
  transform: translateY(-4px);
  box-shadow: 0 12px 24px -4px rgba(34, 197, 94, 0.1);
}

.card-header-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 1.25rem;
}

/* Icon Frames */
.icon-frame {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background-color: #ffffff;
  border: 1px solid #e2e8f0;
  transition:
    background-color 0.22s ease,
    color 0.22s ease,
    border-color 0.22s ease;
}

.frame-blue {
  color: #2563eb;
}
.frame-green {
  color: #16a34a;
}

.card-blue:hover .frame-blue {
  background-color: #2563eb;
  border-color: #2563eb;
  color: #ffffff;
}

.card-green:hover .frame-green {
  background-color: #16a34a;
  border-color: #16a34a;
  color: #ffffff;
}

.nav-card h3 {
  font-size: 1.2rem;
  font-weight: 700;
  color: #1e293b;
  margin: 0;
}

.card-desc {
  font-size: 0.92rem;
  color: #64748b;
  line-height: 1.6;
  margin: 0 0 1.75rem 0;
  flex-grow: 1;
}

/* Action Link Text Color Synchronization */
.card-action-text {
  font-size: 0.9rem;
  font-weight: 700;
  color: #64748b;
  transition: color 0.22s ease;
}

.card-blue:hover .text-blue {
  color: #2563eb;
}
.card-green:hover .text-green {
  color: #16a34a;
}

/* Responsive Media Queries */
@media screen and (max-width: 1100px) {
  .navigation-grid {
    grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
    gap: 20px;
  }
}

@media screen and (max-width: 640px) {
  .home-container {
    padding: 1rem 1.25rem 2rem 1.25rem;
  }
  .hero-banner {
    min-height: 170px;
    margin-top: 1rem;
    background-position: center 45%;
  }
  .hero-logo {
    max-height: 110px;
    margin: 0 0 1rem 1.25rem;
  }
  .navigation-grid {
    grid-template-columns: 1fr;
    gap: 16px;
  }
}
</style>
