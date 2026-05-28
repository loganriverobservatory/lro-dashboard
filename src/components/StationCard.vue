<script setup lang="ts">
/** * StationCard.vue */
import { computed } from 'vue'
import { type Station } from '../hydroService'

const props = withDefaults(
  defineProps<{
    site: Station
    compact?: boolean
    mapMode?: boolean // True when used inside a Map popup
  }>(),
  {
    compact: false,
    mapMode: false,
  },
)

const UNIT_DESCRIPTIONS: Record<string, string> = {
  cfs: 'cubic feet per second',
  degC: 'degrees Celsius',
  'mg/L': 'milligrams per liter',
  'µS/cm': 'microsiemens per centimeter',
}

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

function isDataFresh(observation: Station['observation']): boolean {
  if (
    !observation ||
    observation.result === -9999 ||
    observation.result === null ||
    !observation.phenomenonTime
  ) {
    return false
  }

  const obsTime = new Date(observation.phenomenonTime).getTime()
  const twentyFourHoursAgo = Date.now() - 24 * 60 * 60 * 1000

  return obsTime > twentyFourHoursAgo
}

function getFreshnessClass(dateStr: string | undefined): string {
  if (!dateStr) return 'color-stale'

  const obsTime = new Date(dateStr).getTime()
  const hoursAgo = (Date.now() - obsTime) / (1000 * 60 * 60)

  if (hoursAgo <= 4) return 'color-fresh'
  if (hoursAgo <= 24) return 'color-warning'
  return 'color-stale'
}

const shortDisplayName = computed(() => {
  // get rid of this when the new variable data thing is up
  const name = props.site?.displayName || ''
  return name.split(':')[0].trim()
})

const parsedMeasurements = computed(() => {
  const obs = props.site?.observation
  if (!obs) return []

  if (Array.isArray(obs)) {
    return obs.map((m) => ({
      label: m.label || m.name,
      value: Number(m.result).toFixed(2),
      unit: m.unit || '',
      time: m.phenomenonTime,
      fresh: isDataFresh(m),
    }))
  }

  return [
    {
      label: 'Discharge',
      value: Number(obs.result).toFixed(2),
      unit: obs.unit || 'cfs',
      time: obs.phenomenonTime,
      fresh: isDataFresh(obs),
    },
  ]
})

const hasAnyLiveTelemetry = computed(() => {
  return parsedMeasurements.value.some((m) => m.fresh)
})
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
      <h2 class="location-name">
        {{ mapMode ? shortDisplayName : site.displayName }}
      </h2>
      <span
        v-if="!mapMode"
        :class="['status-badge', hasAnyLiveTelemetry ? 'badge-online' : 'badge-offline']"
      >
        {{ hasAnyLiveTelemetry ? 'Live' : 'Offline' }}
      </span>
    </div>

    <div class="card-body">
      <div v-if="site.observation === null" class="status-msg">
        <div class="spinner"></div>
        Updating...
      </div>

      <div v-else class="measurement-container">
        <div v-for="metric in parsedMeasurements" :key="metric.label" class="metric-row">
          <div v-if="metric.fresh" class="value-row">
            <span class="metric-label" v-if="parsedMeasurements.length > 1">
              {{ metric.label }}:
            </span>
            <span :class="['value', getFreshnessClass(metric.time)]">
              {{ metric.value }}
            </span>
            <span class="unit">
              {{ metric.unit }}
              <span
                v-if="UNIT_DESCRIPTIONS[metric.unit] && !compact && !mapMode"
                class="unit-expansion"
              >
                {{ UNIT_DESCRIPTIONS[metric.unit] }}
              </span>
            </span>
          </div>
        </div>

        <div v-if="!hasAnyLiveTelemetry" class="value-row offline-row">
          <span class="value fallback-text">No Live Data Available</span>
        </div>

        <p v-if="parsedMeasurements[0]?.time && !mapMode" class="timestamp">
          Last Reading: {{ formatDate(parsedMeasurements[0].time) }}
        </p>
      </div>

      <p v-if="site.description && !compact && !mapMode" class="description">
        {{ site.description }}
      </p>
    </div>
  </div>
</template>

<style scoped>
.station-card {
  background: #ffffff;
  padding: 1.75rem;
  border-radius: 16px;
  box-shadow:
    0 4px 6px -1px rgba(0, 0, 0, 0.05),
    0 2px 4px -1px rgba(0, 0, 0, 0.03);
  border: 1px solid #e2e8f0;
  margin-bottom: 1.5rem;
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
  background: #f8fafc;
  border-left: 4px solid #cbd5e1;
  box-shadow: none;
}

.card-stale:hover {
  transform: none;
  box-shadow: none;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
  margin-bottom: 1rem;
}

.location-name {
  font-size: 1.35rem;
  font-weight: 700;
  color: #1e293b;
  line-height: 1.3;
  margin: 0;
}

.status-badge {
  font-size: 0.75rem;
  font-weight: 600;
  padding: 0.25rem 0.6rem;
  border-radius: 9999px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.badge-online {
  background-color: #dcfce7;
  color: #166534;
}

.badge-offline {
  background-color: #f1f5f9;
  color: #475569;
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

.value {
  font-size: 3.5rem;
  font-weight: 800;
  letter-spacing: -0.03em;
  line-height: 1;
}

.fallback-text {
  font-size: 1.5rem;
  color: #64748b;
  font-weight: 600;
  letter-spacing: normal;
}

.color-fresh {
  color: #16a34a;
}
.color-warning {
  color: #d97706;
}
.color-stale {
  color: #64748b;
}

.unit {
  font-size: 1.1rem;
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
  font-size: 0.85rem;
  color: #64748b;
  font-weight: 500;
  margin-top: 0.5rem;
  margin-bottom: 0;
}

.description {
  margin-top: 1.25rem;
  padding-top: 1rem;
  border-top: 1px dashed #e2e8f0;
  font-size: 0.85rem;
  color: #64748b;
  line-height: 1.6;
  font-style: italic;
}

.status-msg {
  display: flex;
  align-items: center;
  gap: 10px;
  color: #64748b;
  font-style: italic;
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

/* Variant A: Schematic Compact Tiles */
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

/* Variant B: Map Leaflet Popover Specific Overrides */
.station-card.is-map {
  background: rgba(
    255,
    255,
    255,
    0.95
  ) !important; /* Solid background hides overlap better than transparent grey */
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

/* The outer grey border of the arrow */
.station-card.is-map::before {
  content: '';
  position: absolute;
  top: 100%; /* Pushes it to the very bottom edge */
  left: 50%;
  transform: translateX(-50%); /* Centers it perfectly */
  border-width: 7px;
  border-style: solid;
  border-color: #94a3b8 transparent transparent transparent; /* Matches your border color */
}

.station-card.is-map .metric-row,
.station-card.is-map .value-row {
  margin: 0 !important;
  padding: 0 !important;
  line-height: 1 !important;
}

/* The inner white fill of the arrow */
.station-card.is-map::after {
  content: '';
  position: absolute;
  top: 100%;
  left: 50%;
  transform: translateX(-50%);
  border-width: 6px; /* Slightly smaller to sit inside the border */
  border-style: solid;
  border-color: rgba(255, 255, 255, 0.95) transparent transparent transparent; /* Matches background */
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

/* Fixes any text contrast issues over the bare map */
.station-card.is-map .location-name {
  font-size: 0.7rem !important;
  font-weight: 700;
  color: #0f172a;
}

.station-card.is-map .value {
  font-size: 1.2rem !important;
  line-height: 1 !important; /* Forces the text box to shrink */
  margin: 0 !important;
  padding: 0 !important;
}

.station-card.is-map .unit {
  font-size: 0.75rem !important;
}
</style>
