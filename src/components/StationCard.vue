<script setup lang="ts">
import { computed } from 'vue'
import { type Station, getFreshnessStatus } from '../hydroService'

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

function isDataFresh(observation: any): boolean {
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
  const status = getFreshnessStatus(
    dateStr ? { '@iot.id': '', result: null, phenomenonTime: dateStr } : null,
  )
  return { current: 'color-fresh', stale: 'color-warning', outdated: 'color-stale', unknown: 'color-stale' }[status]
}

const shortDisplayName = computed(() => {
  const name = props.site?.displayName || ''
  return (name.split(':')[0] ?? name).trim()
})

const parsedMeasurements = computed(() => {
  const obs = props.site?.observation
  if (!obs) return []

  // If the station is offline but has a timestamp, pass a structural object
  // so it doesn't drop out of the rendering tree
  if (obs.result === null) {
    return [
      {
        label: '',
        value: '---',
        unit: props.site.unit || '',
        time: obs.phenomenonTime,
        fresh: false,
      },
    ]
  }

  if (Array.isArray(obs)) {
    return obs.map((m: any) => ({
      label: m.label || m.name,
      value: Number(m.result).toFixed(2),
      unit: m.unit || '',
      time: m.phenomenonTime,
      fresh: isDataFresh(m),
    }))
  }

  return [
    {
      label: '',
      value: Number(obs.result).toFixed(2),
      unit: props.site.unit || '',
      time: obs.phenomenonTime,
      fresh: isDataFresh(obs),
    },
  ]
})

const hasAnyLiveTelemetry = computed(() => {
  return parsedMeasurements.value.some((m) => m.fresh)
})

const isAwaitingTelemetry = computed(() => {
  return props.site.observation === null
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
      <div v-if="isAwaitingTelemetry" class="status-msg">
        <div class="spinner"></div>
        Updating...
      </div>

      <div v-else class="measurement-container">
        <div v-for="metric in parsedMeasurements" :key="metric.label" class="metric-row">
          <div v-if="metric.fresh" class="value-row">
            <span class="metric-label" v-if="parsedMeasurements.length > 1">
              {{ metric.label }}:
            </span>
            <span :class="['value', getFreshnessClass(metric.time || '')]">
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
          <span class="value fallback-text">{{ mapMode ? 'n/a' : 'No data available' }}</span>
        </div>

        <p v-if="site.observation?.phenomenonTime && !mapMode" class="timestamp">
          Last Reading: {{ formatDate(site.observation.phenomenonTime) }}
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
  /* Changed background color to a distinct off-white grey so it pop outs visibly on the dashboard view */
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
  align-items: flex-start;
  gap: 1rem;
  margin-bottom: 1rem;
}
.title-with-link {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex: 1;
}
.location-name {
  font-size: 1.35rem;
  font-weight: 700;
  color: #1e293b;
  line-height: 1.3;
  margin: 0;
}
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
  color: #475569;
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
  line-height: 1 !important;
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
