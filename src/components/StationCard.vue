<script setup lang="ts">
/*
StationCard.vue - Displays a card for each station with its latest variable value, freshness status,
and a link to the full historical data on HydroServer. Used in ListView, MapView popups, and SchematicView.
*/
import { computed } from 'vue'
import { type Station, getFreshnessStatus } from '../hydroService'
// FIXED: Updated import path to match your multi-word component file name
import StationSparkline from './StationSparkline.vue'

const props = withDefaults(
  defineProps<{
    site: Station
    compact?: boolean
    mapMode?: boolean
  }>(),
  {
    compact: false,
    mapMode: false,
  },
)

function formatDate(dateStr: string | undefined): string {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return date.toLocaleString([], {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function getFreshnessClass(dateStr: string | undefined): string {
  if (!dateStr) return 'unknown'
  const status = getFreshnessStatus({ '@iot.id': '', result: null, phenomenonTime: dateStr })

  return {
    current: 'fresh',
    stale: 'warning',
    outdated: 'stale',
    unknown: 'unknown',
  }[status]
}

const shortDisplayName = computed(() => {
  const name = props.site?.displayName || ''
  return (name.split(':')[0] ?? name).trim()
})

const parsedMeasurements = computed(() => {
  const obs = props.site?.observation
  if (!obs) return []

  if (obs.result === null) {
    return [
      {
        label: '',
        value: '---',
        unit: props.site.unit || '',
        time: obs.phenomenonTime,
        fresh: false,
        displayable: false,
      },
    ]
  }

  const processObservation = (m: any) => {
    const status = getFreshnessStatus(m)
    return {
      label: m.label || m.name || '',
      value: Number(m.result).toFixed(2),
      unit: m.unit || props.site.unit || '',
      time: m.phenomenonTime,
      fresh: status === 'current',
      displayable: status !== 'unknown',
    }
  }

  if (Array.isArray(obs)) {
    return obs.map(processObservation)
  }

  return [processObservation(obs)]
})

const hasAnyLiveTelemetry = computed(() => {
  return parsedMeasurements.value.some((m) => m.fresh)
})

const hasDisplayableData = computed(() => {
  return parsedMeasurements.value.some((m) => m.displayable)
})

const isAwaitingTelemetry = computed(() => props.site.observation === null && !props.site.isPrivate)
</script>

<template>
  <div
    :class="[
      'station-card',
      {
        'card-stale': !hasAnyLiveTelemetry,
        'is-compact': compact || mapMode,
        'is-map': mapMode,
      },
    ]"
  >
    <div class="card-header">
      <div class="title-with-link">
        <h2 class="location-name">
          {{ mapMode ? shortDisplayName : site.displayName }}
        </h2>

        <a
          v-if="site.uuid"
          :href="`https://lro.hydroserver.org/sites/${site.uuid}`"
          target="_blank"
          rel="noopener noreferrer"
          class="external-site-link"
          title="Open complete historical data on HydroServer"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke-width="2.5"
            stroke="currentColor"
            class="link-svg"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"
            />
          </svg>
        </a>
      </div>

      <span
        v-if="!mapMode"
        :class="['status-badge', hasAnyLiveTelemetry ? 'badge-online' : 'badge-offline']"
      >
        {{ hasAnyLiveTelemetry ? 'Live' : 'Offline' }}
      </span>
    </div>

    <div class="card-body">
      <div v-if="site.isPrivate" class="status-msg not-available">Not Available</div>

      <div v-else-if="isAwaitingTelemetry" class="status-msg">
        <div class="spinner"></div>
        Updating...
      </div>

      <div v-else class="card-flex-layout">
        <div class="measurement-container">
          <div v-for="metric in parsedMeasurements" :key="metric.label" class="metric-row">
            <div v-if="metric.displayable" class="value-row">
              <span class="metric-label" v-if="parsedMeasurements.length > 1">
                {{ metric.label }}:
              </span>
              <span :class="['value', `color-${getFreshnessClass(metric.time || '')}`]">
                {{ metric.value }}
              </span>
              <span class="unit">
                {{ metric.unit }}
              </span>
            </div>
          </div>

          <div v-if="!hasDisplayableData" class="value-row offline-row">
            <span class="value fallback-text">{{ mapMode ? 'n/a' : 'No data available' }}</span>
          </div>

          <p v-if="site.observation?.phenomenonTime && !mapMode" class="timestamp">
            Last Reading: {{ formatDate(site.observation.phenomenonTime) }}
          </p>
        </div>

        <div v-if="!compact && !mapMode && site.id" class="sparkline-sidebar-wrapper">
          <div class="sparkline-title">Recent 48-Hour Trend</div>
          <StationSparkline :station-id="site.id" :latest-observation="site.observation" />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* ==========================================================================
   1. CORE LAYOUT & CARD CONTAINER
   ========================================================================== */
.station-card {
  position: relative;
  overflow: hidden;
  background: #ffffff;
  border-radius: 16px;
  padding: 0 clamp(0.5rem, 1vw + 0.2rem, 1.1rem) clamp(0.25rem, 0.5vw + 0.1rem, 0.75rem);
  box-shadow:
    0 4px 6px -1px rgba(0, 0, 0, 0.05),
    0 2px 4px -1px rgba(0, 0, 0, 0.03);
  border: 1px solid #e2e8f0;
  margin-bottom: 0;
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease;
}

.station-card:hover {
  transform: translateY(-2px);
  box-shadow:
    0 10px 15px -3px rgba(0, 0, 0, 0.05),
    0 4px 6px -2px rgba(0, 0, 0, 0.03);
}

.card-stale {
  background: #f1f5f9;
  border-left: 4px solid #94a3b8;
  box-shadow: none;
}
.card-stale:hover {
  transform: none;
  box-shadow: none;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  margin-bottom: 0.3rem;
}

.card-flex-layout {
  display: flex !important;
  flex-direction: row !important;
  justify-content: flex-start !important;
  align-items: center !important;
  gap: 1.5rem !important;
  flex-wrap: nowrap !important;
}

.metric-row {
  margin-bottom: 0.2rem;
}

/* ==========================================================================
   2. TYPOGRAPHY & ELEMENTS (Optimized with Fluid Sizing)
   ========================================================================== */
.title-with-link {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex: 1;
}

.location-name {
  font-size: clamp(1rem, 1.2vw + 0.6rem, 1.35rem); /* Adapts fluidly without media queries */
  font-weight: 700;
  color: #1e293b;
  line-height: 1.3;
}

.value {
  font-size: clamp(2rem, 3.5vw + 1rem, 3.5rem); /* Shrinks nicely on small mobile screens */
  font-weight: 800;
  letter-spacing: -0.03em;
  line-height: 1;
}

.unit {
  font-size: clamp(0.85rem, 0.5vw + 0.8rem, 1.1rem);
  font-weight: 600;
  color: #64748b;
  margin-left: 0.5rem;
}

.unit-expansion {
  font-size: 0.85rem;
  font-weight: 400;
  color: #94a3b8;
  display: inline-block;
  margin-left: 0.25rem;
}

.timestamp {
  font-size: clamp(0.75rem, 0.6vw + 0.45rem, 0.85rem); /* Dynamic timestamp sizing */
  color: #64748b;
  font-weight: 500;
  margin-top: 0.5rem;
  margin-bottom: 0;
}

.sparkline-sidebar-wrapper {
  width: 180px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  margin-top: -0.7rem;
}

.sparkline-title {
  font-size: clamp(0.65rem, 0.4vw + 0.4rem, 0.7rem); /* Dynamic trend header sizing */
  font-weight: 700;
  color: #94a3b8;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 0.35rem;
  text-align: right;
}

@media screen and (max-width: 480px) {
  .station-card {
    padding-bottom: 1.1rem !important;
  }

  .card-flex-layout {
    display: flex !important;
    flex-direction: row !important;
    justify-content: space-between !important;
    align-items: center !important;
    gap: 0.5rem !important;
    flex-wrap: nowrap !important;
    width: 100% !important;
  }

  .measurement-container {
    flex: 1 !important;
    min-width: 0 !important;
    max-width: calc(100% - 135px) !important;
    text-align: left !important;
  }

  .value {
    font-size: clamp(1.6rem, 6vw, 2.2rem) !important;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .sparkline-sidebar-wrapper {
    width: 100px !important;
    flex-shrink: 0 !important;
    margin-top: 0 !important;
    display: flex !important;
    flex-direction: column !important;
    /*margin-bottom: 0 !important;*/
    overflow: hidden !important;
  }

  .sparkline-title {
    text-align: right !important;
    font-size: 0.55rem !important;
    margin-bottom: 0.15rem !important;
    white-space: nowrap !important;
    width: 100% !important;
  }

  :deep(.w-full) {
    height: 40px !important;
  }

  unit-expansion {
    display: none !important;
  }
}

/* UI Badges, SVGs & Utilities */
.external-site-link {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: #64748b;
  padding: 6px;
  border-radius: 6px;
  transition: all 0.2s ease;
  margin-left: 4px;
}
.external-site-link:hover {
  color: #2563eb;
  background-color: #eff6ff;
}
.link-svg {
  width: 1.25rem;
  height: 1.25rem;
}
.status-badge {
  font-size: 0.75rem;
  font-weight: 600;
  padding: 0.25rem 0.6rem;
  border-radius: 9999px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  flex-shrink: 0;
}
.badge-online {
  background-color: #dcfce7;
  color: #166534;
}
.badge-offline {
  background-color: #e2e8f0;
  color: #334155;
}
.measurement-container {
  flex: 1;
}
.metric-row {
  margin-bottom: 0.5rem;
}
.metric-label {
  font-size: 0.95rem;
  font-weight: 700;
  color: #475569;
  margin-right: 0.5rem;
}
.fallback-text {
  font-size: 1.5rem;
  color: #64748b;
  font-weight: 600;
}
.color-fresh {
  color: #16a34a;
}
.color-warning {
  color: #d97706;
}
.color-stale {
  color: #973131;
}
.color-unknown {
  color: #64748b;
}
.status-msg {
  display: flex;
  align-items: center;
  gap: 10px;
  color: #64748b;
  font-style: italic;
}
.not-available {
  color: #94a3b8;
  font-size: 0.95rem;
}
.spinner {
  width: 16px;
  height: 16px;
  border: 2px solid #cbd5e1;
  border-top: 2px solid #0284c7;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}
@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

/* ==========================================================================
   3. RESPONSIVE MEDIA QUERIES (Unified Mobile Handling)
   ========================================================================== */
@media screen and (max-width: 480px) {
  .station-card {
    padding-bottom: 1.1rem !important;
  }
  .card-flex-layout {
    display: flex !important;
    flex-direction: row !important;
    justify-content: flex-start !important;
    align-items: flex-end !important;
    gap: 1.5rem !important;
    flex-wrap: nowrap !important;
  }
  .measurement-container {
    flex: 1 !important;
    min-width: 0 !important;
    max-width: calc(100% - 140px) !important;
    text-align: left !important;
  }
  .value {
    font-size: clamp(1.8rem, 5vw, 2.5rem) !important;
  }
  .sparkline-sidebar-wrapper {
    width: 110px !important;
    flex-shrink: 0 !important;
    margin-top: 0 !important;
    display: flex !important;
    flex-direction: column !important;
    overflow: hidden;
  }
  .sparkline-title {
    text-align: left !important;
    font-size: 0.52rem !important;
    letter-spacing: -0.01em !important;
    margin-bottom: 0.3rem !important;
    white-space: nowrap !important;
    width: 100% !important;
  }
  :deep(.w-full) {
    height: 40px !important;
  }
}

/* ==========================================================================
   4. ALTERNATE VIEW CONFIGURATIONS (Compact & Map Variants)
   ========================================================================== */
/* Compact View Modifications */
.station-card.is-compact {
  padding: 0.65rem 1rem;
  margin-bottom: 0;
  border-radius: 10px;
}
.station-card.is-compact .card-header {
  margin-bottom: 0.25rem;
  align-items: center;
}
.station-card.is-compact .location-name {
  font-size: 0.9rem;
  font-weight: 700;
}
.station-card.is-compact .status-badge {
  font-size: 0.65rem;
  padding: 0.15rem 0.4rem;
}
.station-card.is-compact .value {
  font-size: 1.6rem;
}
.station-card.is-compact .fallback-text {
  font-size: 1rem;
}
.station-card.is-compact .unit {
  font-size: 0.8rem;
  margin-left: 0.25rem;
}
.station-card.is-compact .unit-expansion {
  display: none;
}
.station-card.is-compact .timestamp {
  font-size: 0.7rem;
  margin-top: 0.25rem;
}
.station-card.is-compact .link-svg {
  width: 0.95rem;
  height: 0.95rem;
}

/* Map View Modifications */
.station-card.is-map {
  background: rgba(255, 255, 255, 0.95) !important;
  border: 1px solid #94a3b8 !important;
  padding: 1px 2px !important;
  border-radius: 4px;
  min-width: auto !important;
  margin: 0 !important;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2) !important;
  display: flex !important;
  flex-direction: column !important;
  align-items: center !important;
  text-align: center !important;
}
.station-card.is-map::before {
  content: '';
  position: absolute;
  top: 100%;
  left: 50%;
  transform: translateX(-50%);
  border-width: 7px;
  border-style: solid;
  border-color: #94a3b8 transparent transparent transparent;
}
.station-card.is-map .metric-row,
.station-card.is-map .value-row {
  margin: 0 !important;
  padding: 0 !important;
  line-height: 0.5 !important;
}
.station-card.is-map::after {
  content: '';
  position: absolute;
  top: 100%;
  left: 50%;
  transform: translateX(-50%);
  border-width: 6px;
  border-style: solid;
  border-color: rgba(255, 255, 255, 0.95) transparent transparent transparent;
}
.station-card.is-map .card-header {
  order: 2 !important;
  margin: -2px 0 0 0 !important;
  padding: 0 !important;
}
.station-card.is-map .card-body {
  order: 1 !important;
  margin: 0 !important;
  padding: 0 !important;
}
.station-card.is-map .location-name {
  font-size: 0.7rem !important;
  font-weight: 700;
  color: #0f172a;
}
.station-card.is-map .value {
  font-size: 1.2rem !important;
  line-height: 1 !important;
  margin: 0 !important;
  padding: 0 !important;
}
.station-card.is-map .unit {
  font-size: 0.75rem !important;
}
.station-card.is-map .link-svg {
  width: 1rem;
  height: 1rem;
}
</style>
