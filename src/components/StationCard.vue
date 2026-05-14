<script setup lang="ts">
// This allows App.vue to pass the "site" data into this card
defineProps(['site'])

function formatDate(dateStr: string) {
  if (!dateStr) return ''
  const date = new Date(dateStr)

  // This version shows: "May 14, 12:00 PM"
  return date.toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}
</script>

<template>
  <div class="station-card">
    <h2 class="location-name">{{ site.displayName }}</h2>

    <div class="card-body">
      <div v-if="site.observation" class="measurement-container">
        <div class="value-row">
          <span class="value">{{ Number(site.observation.result).toFixed(2) }}</span>
          <span class="unit">cfs</span>
        </div>

        <p class="timestamp">Updated: {{ formatDate(site.observation.phenomenonTime) }}</p>
      </div>

      <div v-else class="status-msg">
        <div class="spinner"></div>
        Updating...
      </div>

      <p class="description">{{ site.description }}</p>
    </div>
  </div>
</template>

<style scoped>
.station-card {
  background: white;
  padding: 2rem;
  border-radius: 12px;
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
  border: 1px solid #f1f5f9;
  margin-bottom: 2rem;
}

/* src/components/StationCard.vue style section */
.location-name {
  font-size: 1.6rem; /* Slightly larger */
  font-weight: 800;
  color: #0f172a;
  margin: 0 0 0.75rem 0;
  line-height: 1.2;
  /* This prevents the name from feeling cluttered */
  display: block;
}

.value {
  font-size: 4rem; /* Big impact for the live number */
  font-weight: 900;
  color: #0284c7;
  line-height: 1;
}

.unit {
  font-size: 1.25rem;
  font-weight: 700;
  color: #64748b;
  margin-left: 0.5rem;
}

.timestamp {
  font-size: 0.9rem;
  color: #64748b;
  font-weight: 500;
  margin-top: 0.25rem;
  text-transform: none;
  letter-spacing: normal;
}

.description {
  margin-top: 1.5rem;
  font-size: 0.85rem;
  color: #64748b;
  line-height: 1.5;
  font-style: italic;
}
</style>
