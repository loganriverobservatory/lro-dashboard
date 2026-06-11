// Sparkline.vue - Display sparkline chart for recent observations of each station.

<template>
  <v-progress-linear v-if="loading" color="secondary" indeterminate />
  <div v-else-if="!loading && canShowSparkline">
    <div class="w-full">
      <div
        class="h-[60px] w-full cursor-pointer"
        :style="sparklineContainerStyle"
        @click="handleEmit"
      >
        <svg
          v-if="sparklinePaths.line.length"
          class="h-full w-full"
          :viewBox="`0 0 ${SPARKLINE_WIDTH} ${SPARKLINE_HEIGHT}`"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient :id="`sparklineGradient-${stationId}`" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" :stop-color="sparklineColors.line" stop-opacity="0.35" />
              <stop offset="100%" :stop-color="sparklineColors.line" stop-opacity="0.0" />
            </linearGradient>
          </defs>

          <path
            v-for="(d, index) in sparklinePaths.area"
            :key="`area-${index}`"
            :d="d"
            :fill="`url(#sparklineGradient-${stationId})`"
            stroke="none"
          />

          <path
            v-for="(d, index) in sparklinePaths.line"
            :key="`line-${index}`"
            :d="d"
            :stroke="sparklineColors.line"
            stroke-width="1.5"
            fill="none"
            vector-effect="non-scaling-stroke"
            stroke-linejoin="round"
            stroke-linecap="round"
          />
        </svg>
      </div>
    </div>
  </div>
  <div v-else class="text-caption text-grey-darken-1 italic">No recent history</div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { getFreshnessStatus, type StaObservation } from '../hydroService'

const props = defineProps({
  stationId: {
    type: String,
    required: true,
  },
  latestObservation: {
    type: Object as () => StaObservation | null,
    default: null,
  },
})

const emit = defineEmits<{
  (e: 'openChart'): void
}>()

const handleEmit = () => {
  emit('openChart')
}

const sparklineObservations = ref<[string, number][]>([])
const loading = ref(true)

const SPARKLINE_WIDTH = 180
const SPARKLINE_HEIGHT = 80
const PADDING = 6

const sparklinePaths = computed(() => {
  const points = sparklineObservations.value
    .map(([time, val]) => ({ x: new Date(time).getTime(), y: val }))
    .filter((p) => Number.isFinite(p.y))

  if (!points.length) return { line: [], area: [] }

  points.sort((a, b) => a.x - b.x)

  let xMin = Math.min(...points.map((p) => p.x))
  let xMax = Math.max(...points.map((p) => p.x))
  let yMin = Math.min(...points.map((p) => p.y))
  let yMax = Math.max(...points.map((p) => p.y))

  if (xMin === xMax) {
    xMin -= 1
    xMax += 1
  }
  if (yMin === yMax) {
    yMin -= 1
    yMax += 1
  }

  const scaleX = (val: number) => ((val - xMin) / (xMax - xMin)) * SPARKLINE_WIDTH
  const scaleY = (val: number) =>
    SPARKLINE_HEIGHT -
    PADDING * 2 -
    ((val - yMin) / (yMax - yMin)) * (SPARKLINE_HEIGHT - PADDING * 2) +
    PADDING

  const zeroY = scaleY(Math.max(0, Math.min(yMax, yMin)))

  const linePath = points
    .map((p, idx) => `${idx === 0 ? 'M' : 'L'}${scaleX(p.x)} ${scaleY(p.y)}`)
    .join(' ')
  const firstX = scaleX(points[0].x)
  const lastX = scaleX(points[points.length - 1].x)
  const areaPath = `${linePath} L${lastX} ${zeroY} L${firstX} ${zeroY} Z`

  return { line: [linePath], area: [areaPath] }
})

const sparklineColors = computed(() => {
  const status = getFreshnessStatus(props.latestObservation)
  if (status === 'current') return { line: '#16a34a', border: '#e2e8f0' }
  if (status === 'stale') return { line: '#d97706', border: '#e2e8f0' }
  return { line: '#94a3b8', border: '#e2e8f0' }
})

const sparklineContainerStyle = computed(() => ({
  height: `80px`,
  width: '100%',
  border: `1px solid ${sparklineColors.value.border}`,
  borderRadius: '6px',
  overflow: 'hidden',
  backgroundColor: '#f8fafc',
}))

const canShowSparkline = computed(() => sparklineObservations.value.length > 1)

async function fetchRecentHistory(id: string) {
  try {
    loading.value = true
    const url = `https://lro.hydroserver.org/api/sensorthings/v1.1/Datastreams('${id}')/Observations?$top=48&$orderby=phenomenonTime desc&$select=result,phenomenonTime`
    const res = await fetch(url)
    const data = await res.json()

    if (data.value) {
      sparklineObservations.value = data.value
        .filter((o: any) => o.result !== null && o.phenomenonTime)
        .map((o: any) => [o.phenomenonTime, Number(o.result)])
    }
  } catch (err) {
    console.error('Sparkline fetch failure:', err)
  } finally {
    loading.value = false
  }
}

watch(
  () => props.stationId,
  (newId) => {
    if (newId) fetchRecentHistory(newId)
  },
  { immediate: true },
)
</script>
