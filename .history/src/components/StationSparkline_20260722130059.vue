<template>
  <div
    v-if="loading"
    class="w-full h-[80px] bg-slate-50 border border-slate-200 rounded-[6px] relative overflow-hidden flex items-center justify-center"
  >
    <div class="absolute top-0 left-0 w-full h-[3px] bg-blue-50 overflow-hidden">
      <div class="h-full bg-blue-500 animate-[pulse_1.5s_infinite] w-full"></div>
    </div>
    <span class="text-xs text-slate-400 font-medium tracking-wide animate-pulse"
      >Loading trend...</span
    >
  </div>

  <div v-else-if="!loading && canShowSparkline">
    <div class="w-full">
      <div class="w-full cursor-pointer" :style="sparklineContainerStyle" @click="handleEmit">
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

  <div
    v-else
    class="text-xs text-slate-400 italic font-medium h-[80px] flex items-center justify-center border border-dashed border-slate-200 rounded-[6px] bg-slate-50/50"
  >
    No recent history
  </div>
</template>

<script setup lang="ts">
/*
StationSparkline.vue - the small 48-hour trend chart shown inside a StationCard. Draws a plain
inline SVG line/area path itself rather than pulling in a charting library, since it only ever
needs one simple line. DWRi stations pass their history in via preloadedHistory (already fetched
in bulk); every other station fetches its own recent history directly here.
*/
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
  preloadedHistory: {
    type: Array as () => [string, number][] | undefined,
    default: undefined,
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
const PADDING = 12

// Scales the raw (time, value) history into SVG path strings for the line and its filled
// area-under-the-line, normalized to fit SPARKLINE_WIDTH x SPARKLINE_HEIGHT regardless of the
// data's actual time/value range.
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

  const scaleX = (val: number) =>
    PADDING + ((val - xMin) / (xMax - xMin)) * (SPARKLINE_WIDTH - PADDING * 2)
  const scaleY = (val: number) =>
    SPARKLINE_HEIGHT -
    PADDING * 2 -
    ((val - yMin) / (yMax - yMin)) * (SPARKLINE_HEIGHT - PADDING * 2) +
    PADDING

  const zeroY = scaleY(Math.max(yMin, Math.min(yMax, 0)))

  const linePath = points
    .map((p, idx) => `${idx === 0 ? 'M' : 'L'}${scaleX(p.x)} ${scaleY(p.y)}`)
    .join(' ')
  const firstX = scaleX(points[0]!.x)
  const lastX = scaleX(points[points.length - 1]!.x)
  const areaPath = `${linePath} L${lastX} ${zeroY} L${firstX} ${zeroY} Z`

  return { line: [linePath], area: [areaPath] }
})

// Line/border color follows the same freshness scheme as the station's main value.
const sparklineColors = computed(() => {
  const status = getFreshnessStatus(props.latestObservation)
  if (status === 'current') return { line: '#16a34a', border: '#e2e8f0' }
  if (status === 'stale') return { line: '#d97706', border: '#e2e8f0' }
  if (status === 'outdated') return { line: '#dc2626', border: '#e2e8f0' }
  return { line: '#94a3b8', border: '#e2e8f0' }
})

const sparklineContainerStyle = computed(() => ({
  height: `100%`,
  width: '100%',
  border: `1px solid ${sparklineColors.value.border}`,
  borderRadius: '6px',
  overflow: 'hidden',
  backgroundColor: '#f8fafc',
}))

const canShowSparkline = computed(() => sparklineObservations.value.length > 1)

// Fetches this station's last 48 hours of readings directly (USGS or HydroServer, by id
// prefix) - NOTE both URLs here are hardcoded rather than going through hydroService.ts's
// setApiConfig() endpoints, unlike the rest of the app's data fetching; a deployment that
// changes its HydroServer/USGS endpoints via config.json would need to also edit this function.
async function fetchRecentHistory(id: string) {
  try {
    loading.value = true

    if (id.startsWith('USGS-')) {
      const siteNum = id.replace('USGS-', '')
      const url = `https://waterservices.usgs.gov/nwis/iv/?sites=${siteNum}&parameterCd=00060&period=P2D&format=json`
      const res = await fetch(url)
      const data = await res.json()
      const values: any[] = data?.value?.timeSeries?.[0]?.values?.[0]?.value ?? []
      sparklineObservations.value = values
        .filter((v: any) => v.value !== '-999999' && v.value !== null && v.dateTime)
        .map((v: any) => [v.dateTime, Number(v.value)])
    } else {
      // $orderby is ignored by this API; filter by 48-hour window and sort client-side
      const since = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString()
      const url = `https://lro.hydroserver.org/api/sensorthings/v1.1/Datastreams('${id}')/Observations?$filter=phenomenonTime ge ${since}&$top=300&$select=result,phenomenonTime`
      const res = await fetch(url)
      const data = await res.json()
      if (data.value) {
        sparklineObservations.value = data.value
          .filter((o: any) => o.result !== null && o.phenomenonTime)
          .map((o: any) => [o.phenomenonTime, Number(o.result)])
      }
    }
  } catch (err) {
    console.error('Sparkline fetch failure:', err)
  } finally {
    loading.value = false
  }
}

// Uses preloadedHistory when the parent already has it (DWRi); otherwise fetches fresh on
// mount and whenever the station id changes.
watch(
  [() => props.stationId, () => props.preloadedHistory],
  ([newId, preloaded]) => {
    if (preloaded !== undefined) {
      sparklineObservations.value = preloaded
      loading.value = false
    } else if (newId) {
      fetchRecentHistory(newId)
    }
  },
  { immediate: true },
)
</script>
