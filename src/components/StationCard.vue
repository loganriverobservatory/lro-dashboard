<script setup lang="ts">
/** * StationCard.vue
 * Displays real-time sensor data and location details for an individual river station.
 */
import { computed } from 'vue'
import { type Station } from '../hydroService'

const props = defineProps<{
  site: Station
}>()

// Format the date nicely for the UI
const formattedDate = computed(() => {
  if (!props.site.observation?.phenomenonTime) return 'Waiting for data...'
  return new Date(props.site.observation.phenomenonTime).toLocaleString()
})
</script>

<template>
  <div class="station-card">
    <div class="card-header">
      <h3 class="station-name">{{ site.displayName }}</h3>
      <span class="station-id">ID: {{ site.id }}</span>
    </div>

    <div class="card-body">
      <div class="reading-section">
        <span class="label">Current Discharge:</span>
        <span class="value">
          {{
            !site.observation
              ? 'Updating...'
              : site.observation.result === -9999
                ? 'n/a'
                : Number(site.observation.result).toFixed(1)
          }}
        </span>

        <span v-if="site.observation && site.observation.result !== -9999" class="unit"> cfs </span>
      </div>

      <p class="timestamp">Last updated: {{ formattedDate }}</p>

      <p v-if="site.description" class="description">
        {{ site.description }}
      </p>
    </div>
  </div>
</template>

<style scoped>
.station-card {
  background: white;
  border: 1px solid #e2e8f0;
  border-left: 6px solid #0284c7; /* Clean, static blue border */
  border-radius: 8px;
  padding: 1.25rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease;
}

.station-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1rem;
  border-bottom: 1px solid #f1f5f9;
  padding-bottom: 0.5rem;
}

.station-name {
  margin: 0;
  color: #1e293b;
  font-size: 1.1rem;
  font-weight: 600;
}

.station-id {
  font-size: 0.75rem;
  color: #94a3b8;
  background: #f8fafc;
  padding: 2px 6px;
  border-radius: 4px;
}

.reading-section {
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin-bottom: 0.25rem;
}

.label {
  color: #64748b;
  font-size: 0.9rem;
}

.value {
  font-size: 1.75rem;
  font-weight: 700;
  color: #0284c7;
}

.unit {
  color: #64748b;
  font-weight: 500;
}

.timestamp {
  margin: 0 0 0.75rem 0;
  font-size: 0.8rem;
  color: #94a3b8;
  font-style: italic;
}

.description {
  margin: 0;
  font-size: 0.85rem;
  color: #64748b;
  line-height: 1.4;
}
</style>
