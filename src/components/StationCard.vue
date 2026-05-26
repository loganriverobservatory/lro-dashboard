<script setup lang="ts">
/** * StationCard.vue
 */
import { type Station } from '../hydroService'

const props = withDefaults(
  defineProps<{
    site: Station
    compact?: boolean
  }>(),
  {
    compact: false,
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
  if (!dateStr) return 'color-stale'

  const obsTime = new Date(dateStr).getTime()
  const millisecondsAgo = Date.now() - obsTime
  const hoursAgo = millisecondsAgo / (1000 * 60 * 60)

  if (hoursAgo <= 4) {
    return 'color-fresh'
  } else if (hoursAgo <= 24) {
    return 'color-warning'
  } else {
    return 'color-stale'
  }
}
</script>

<template>
  <div
    :class="[
      'station-card',
      { 'card-stale': !isDataFresh(site.observation), 'is-compact': compact },
    ]"
  >
    <div class="card-header">
      <h2 class="location-name">{{ site.displayName }}</h2>
      <span
        :class="['status-badge', isDataFresh(site.observation) ? 'badge-online' : 'badge-offline']"
      >
        {{ isDataFresh(site.observation) ? 'Live' : 'Offline' }}
      </span>
    </div>

    <div class="card-body">
      <div v-if="site.observation === null" class="status-msg">
        <div class="spinner"></div>
        Updating...
      </div>

      <div v-else class="measurement-container">
        <div v-if="isDataFresh(site.observation)" class="value-row">
          <span :class="['value', getFreshnessClass(site.observation.phenomenonTime)]">
            {{ Number(site.observation.result).toFixed(2) }}
          </span>
          <span class="unit">cfs <span class="unit-expansion">cubic feet per second</span></span>
        </div>

        <div v-else class="value-row offline-row">
          <span class="value fallback-text">No Live Data Available</span>
        </div>

        <p v-if="site.observation && site.observation.phenomenonTime" class="timestamp">
          Last Reading: {{ formatDate(site.observation.phenomenonTime) }}
        </p>
      </div>

      <p v-if="site.description && !compact" class="description">{{ site.description }}</p>
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
</style>
