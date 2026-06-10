<script setup lang="ts">
/*
SchematicView.vue - Displays a schematic of the river system with station cards embedded in their relative positions
*/
import { ref, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { Droplets, Maximize2, Minimize2 } from 'lucide-vue-next'
import { type Station, WATERWAY_COLORS } from '../hydroService'
import StationCard from '../components/StationCard.vue'

const props = defineProps<{
  sites: Station[]
  loading: boolean
  activeWaterways?: string[]
}>()

function findLiveStation(schematicName: string): Station | undefined {
  const match = props.sites.find((site) => {
    const liveName = site.displayName.toLowerCase()
    const targetName = schematicName.toLowerCase()
    return liveName.includes(targetName) || targetName.includes(liveName)
  })
  if (!match) return undefined
  if (props.activeWaterways && !props.activeWaterways.includes(match.tributary ?? ''))
    return undefined
  return match
}

const loganMainStem = ref([
  { id: 'franklin', name: 'Logan River: Franklin Basin', row: 1, type: 'source' },
  { id: 'beaver_junc', name: 'Beaver Creek Junction', row: 2, type: 'line-junction' },
  { id: 'tony_grove', name: 'Logan River: Tony Grove', row: 3, type: 'gauge' },
  { id: 'ricks_junc', name: 'Ricks Spring Junction', row: 4, type: 'line-junction' },
  { id: 'temple_junc', name: 'Temple Fork Junction', row: 5, type: 'line-junction' },
  { id: 'above_wood', name: 'Logan River: Above Wood Camp', row: 6, type: 'gauge' },
  { id: 'wood_camp', name: 'Logan River: Wood Camp Bridge', row: 7, type: 'gauge' },
  { id: 'right_hand_junc', name: 'Right Hand Fork Junction', row: 8, type: 'line-junction' },
  { id: 'guinivah', name: 'Logan River: Guinavah Campground', row: 9, type: 'gauge' },
  { id: 'dewitt_junc', name: 'Dewitt Springs Junction', row: 10, type: 'line-junction' },
  { id: 'water_lab', name: 'Logan River: Utah Water Research Laboratory', row: 11, type: 'gauge' },
  { id: 'mainstreet', name: 'Logan River: Main Street', row: 12, type: 'gauge' },
  { id: 'spring_creek_junc', name: 'Spring Creek Junction', row: 13, type: 'line-junction' },
  { id: 'bsf_confluence', name: 'Blacksmith Fork Confluence', row: 14, type: 'line-junction' },
  { id: 'thousand_w', name: 'Logan River: 1000 West', row: 15, type: 'gauge' },
  { id: 'mendon_rd', name: 'Logan River: Mendon Road', row: 16, type: 'gauge' },
  {
    id: 'before_cutler',
    name: 'Logan River: Before Confluence with Cutler Reservoir',
    row: 17,
    type: 'gauge',
  },
])

const leftTributaries = ref([
  { id: 'beaver', name: 'Beaver Creek', row: 1, juncId: 'beaver_junc' },
  { id: 'ricks', name: 'Ricks Spring', row: 3, juncId: 'ricks_junc' },
  { id: 'temple', name: 'Temple Fork', row: 4, juncId: 'temple_junc' },
  { id: 'right_hand', name: 'Right Hand Fork', row: 7, juncId: 'right_hand_junc' },
  { id: 'dewitt', name: 'Dewitt Springs', row: 9, juncId: 'dewitt_junc' },
  { id: 'spring_creek', name: 'Spring Creek', row: 12, juncId: 'spring_creek_junc' },
])

const blacksmithSystem = ref([
  { id: 'hollow_rd', name: 'Blacksmith Fork River: Hollow Road', row: 11 },
  { id: 'seventeen_s', name: 'Blacksmith Fork River: 1700 South Footbridge', row: 12 },
  {
    id: 'bsf_before_conf',
    name: 'Blacksmith Fork River: Before Confluence with Logan River',
    row: 13,
  },
])

const cutlerInflows = ref([
  {
    id: 'little_bear',
    name: 'Little Bear River: Mendon Road',
    row: 15,
    tributary: 'Little Bear River',
  },
  {
    id: 'spring_creek_mendon',
    name: 'Spring Creek: Mendon Road',
    row: 16,
    tributary: 'Spring Creek',
  },
])

const gridContainerRef = ref<HTMLElement | null>(null)
const paths = ref({ logan: '', blacksmith: '', cutlerLittleBear: '', cutlerSpringCreek: '' })
const leftTribPaths = ref<Record<string, string>>({})
const linesReady = ref(false)

const NATURAL_WIDTH = 950
const isCompact = ref(false)
const schematicScale = ref(1)
const wrapperHeight = ref<number | null>(null)
const selectedStation = ref<Station | null>(null)
// Mobile-only: when true the diagram renders at natural size and the user pans
// around it (for anyone who can't read the shrunk-to-fit version).
const zoomed = ref(false)

function openStation(site: Station | undefined) {
  if (!isCompact.value || !site) return
  selectedStation.value = site
}

function closeStation() {
  selectedStation.value = null
}

const updateLineCoordinates = async () => {
  await nextTick()
  if (!gridContainerRef.value) return

  const containerEl = gridContainerRef.value.querySelector('.schematic-stage') as HTMLElement
  if (!containerEl) return

  const containerRect = containerEl.getBoundingClientRect()
  const currentScale = schematicScale.value || 1

  const getMarkerCenter = (id: string) => {
    const el = containerEl.querySelector(`[data-marker="${id}"]`)
    if (!el) return { x: 0, y: 0, left: 0, right: 0 }
    const rect = el.getBoundingClientRect()
    return {
      x: (rect.left + rect.width / 2 - containerRect.left) / currentScale,
      y: (rect.top + rect.height / 2 - containerRect.top) / currentScale,
      left: (rect.left - containerRect.left) / currentScale,
      right: (rect.right - containerRect.left) / currentScale,
    }
  }

  const terminusEl = containerEl.querySelector('[data-marker="terminus_card"]')
  let reservoirTopY = containerRect.height / currentScale
  let reservoirBlueX = 0
  let reservoirOrangeX1 = 0

  if (terminusEl) {
    const tRect = terminusEl.getBoundingClientRect()
    reservoirTopY = (tRect.top - containerRect.top) / currentScale - 30
    const blueNodePt = getMarkerCenter('before_cutler')
    reservoirBlueX = blueNodePt.x
    reservoirOrangeX1 = blueNodePt.x + 200
  }

  let loganPathStr = ''
  loganMainStem.value.forEach((node, idx) => {
    const pt = getMarkerCenter(node.id)
    if (idx === 0) loganPathStr += `M ${pt.x},${pt.y}`
    else loganPathStr += ` L ${pt.x},${pt.y}`
  })

  if (terminusEl) {
    loganPathStr += ` L ${reservoirBlueX},${reservoirTopY}`
  }
  paths.value.logan = loganPathStr

  leftTributaries.value.forEach((trib) => {
    const startPt = getMarkerCenter(trib.id)
    const juncPt = getMarkerCenter(trib.juncId)

    if (startPt.x > 0 && juncPt.x > 0) {
      const curveRadius = 30
      const cardBottomY = startPt.y + 32

      if (trib.id === 'temple' || trib.id === 'right_hand') {
        leftTribPaths.value[trib.id] =
          `M ${startPt.x},${cardBottomY} ` +
          `V ${juncPt.y - curveRadius} ` +
          `Q ${startPt.x},${juncPt.y} ${startPt.x - curveRadius},${juncPt.y} ` +
          `L ${juncPt.x + 40},${juncPt.y}`
      } else {
        leftTribPaths.value[trib.id] =
          `M ${startPt.x},${cardBottomY} ` +
          `V ${juncPt.y - curveRadius} ` +
          `Q ${startPt.x},${juncPt.y} ${startPt.x + curveRadius},${juncPt.y} ` +
          `L ${juncPt.x - 40},${juncPt.y}`
      }
    }
  })

  const bsf1 = getMarkerCenter('hollow_rd')
  const bsf2 = getMarkerCenter('seventeen_s')
  const bsf3 = getMarkerCenter('bsf_before_conf')
  const confCenter = getMarkerCenter('bsf_confluence')
  const curveRadius = 30
  const turnY = confCenter.y

  paths.value.blacksmith =
    `M ${bsf1.x},${bsf1.y} ` +
    `L ${bsf2.x},${bsf2.y} ` +
    `L ${bsf3.x},${bsf3.y} ` +
    `V ${turnY - curveRadius} ` +
    `Q ${bsf3.x},${turnY} ${bsf3.x - curveRadius},${turnY} ` +
    `L ${confCenter.x + 35},${turnY}`

  const tightCurve = 10

  const lbElement = getMarkerCenter('little_bear')
  const lbTurnX = reservoirOrangeX1
  const lbTurnY = lbElement.y
  paths.value.cutlerLittleBear =
    `M ${lbElement.left},${lbTurnY} ` +
    `L ${lbTurnX + tightCurve},${lbTurnY} ` +
    `Q ${lbTurnX},${lbTurnY} ${lbTurnX},${lbTurnY + tightCurve} ` +
    `L ${lbTurnX},${reservoirTopY}`

  const availableWidth = gridContainerRef.value.clientWidth

  // Spring Creek: Mendon Road drops straight down into the Cutler terminus at
  // every screen size (it previously curved out to the right on desktop).
  const scmElement = getMarkerCenter('spring_creek_mendon')
  const dropX = scmElement.x
  paths.value.cutlerSpringCreek = `M ${dropX},${scmElement.y + 32} ` + `L ${dropX},${reservoirTopY}`

  const fitScale = Math.min(1, availableWidth / NATURAL_WIDTH)
  const naturalHeight = containerRect.height / currentScale
  isCompact.value = fitScale < 1
  if (!isCompact.value) {
    zoomed.value = false
    selectedStation.value = null
  }
  // Zoom mode (mobile): render at natural size (scale 1) and let the wrapper
  // pan. Otherwise scale to fit the available width.
  schematicScale.value = isCompact.value && zoomed.value ? 1 : fitScale
  wrapperHeight.value = isCompact.value ? naturalHeight * fitScale : null

  attachObserver()
  linesReady.value = true
}

let resizeObserver: ResizeObserver | null = null
let rafId = 0
let fontsReady = false

const ensureFontsReady = async () => {
  if (fontsReady) return
  try {
    await (document as { fonts?: { ready?: Promise<unknown> } }).fonts?.ready
  } catch {
    // Fail-safe
  }
  fontsReady = true
}

const scheduleRedraw = () => {
  cancelAnimationFrame(rafId)
  const run = () => {
    rafId = requestAnimationFrame(() => {
      rafId = requestAnimationFrame(() => updateLineCoordinates())
    })
  }
  if (fontsReady) run()
  else ensureFontsReady().then(run)
}

const attachObserver = () => {
  if (resizeObserver || !gridContainerRef.value) return
  resizeObserver = new ResizeObserver(() => scheduleRedraw())
  resizeObserver.observe(gridContainerRef.value)
}

const estimateScaleFromViewport = () => {
  const approxAvailable = window.innerWidth - 64
  const est = Math.min(1, approxAvailable / NATURAL_WIDTH)
  schematicScale.value = est
  isCompact.value = est < 1
}

onMounted(() => {
  estimateScaleFromViewport()
  scheduleRedraw()
  window.addEventListener('resize', scheduleRedraw)
})

onUnmounted(() => {
  cancelAnimationFrame(rafId)
  if (resizeObserver) resizeObserver.disconnect()
  resizeObserver = null
  window.removeEventListener('resize', scheduleRedraw)
})

watch(
  () => props.loading,
  (isLoading) => {
    if (isLoading) {
      linesReady.value = false
    } else {
      scheduleRedraw()
    }
  },
)

watch(
  () => props.sites,
  () => scheduleRedraw(),
  { deep: true },
)

// Re-measure and re-apply scale when the user toggles zoom.
watch(zoomed, () => scheduleRedraw())

function waterwayBg(color: string | undefined): string {
  if (!color) return '#94a3b818'
  return color + '18'
}
</script>

<template>
  <div class="schematic-container">
    <div class="header-block">
      <Droplets :size="28" class="title-icon" />
      <h2>Logan River System Schematic</h2>
    </div>

    <p class="subtitle">
      Tracking how tributary sub-basins flow together and connect into the lower watershed.
    </p>

    <button
      v-if="isCompact && !loading"
      type="button"
      class="zoom-toggle"
      :aria-pressed="zoomed"
      @click="zoomed = !zoomed"
    >
      <Maximize2 v-if="!zoomed" :size="16" />
      <Minimize2 v-else :size="16" />
      {{ zoomed ? 'Fit to screen' : 'Enlarge diagram' }}
    </button>

    <p v-if="isCompact && !loading && !zoomed" class="mobile-hint">
      <span class="hint-dot"></span>
      Tap any station to enlarge its readings.
    </p>

    <p v-if="isCompact && !loading && zoomed" class="mobile-hint">
      <span class="hint-dot"></span>
      Drag to pan around the diagram.
    </p>

    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
      <p>Aligning network telemetry lines...</p>
    </div>

    <div
      v-else
      class="schematic-grid-wrapper"
      :class="{ 'is-compact': isCompact, 'is-zoomed': isCompact && zoomed }"
      ref="gridContainerRef"
      :style="!zoomed && wrapperHeight ? { height: wrapperHeight + 'px' } : {}"
    >
      <div
        class="schematic-stage"
        :class="{ 'is-ready': linesReady }"
        :style="{
          transform: `scale(${schematicScale})`,
          transformOrigin: 'top left',
          width: NATURAL_WIDTH + 'px',
        }"
      >
        <svg class="global-routing-svg" :class="{ 'lines-ready': linesReady }">
          <defs>
            <marker
              id="black-arrow"
              markerWidth="8"
              markerHeight="8"
              refX="0"
              refY="4"
              orient="auto-start-reverse"
            >
              <path
                d="M 0 1 L 7 4 L 0 7 z"
                fill="#1e293b"
                style="shape-rendering: geometricPrecision"
              />
            </marker>
            <marker
              id="dark-gray-arrow"
              markerWidth="8"
              markerHeight="8"
              refX="0"
              refY="4"
              orient="auto-start-reverse"
            >
              <path
                d="M 0 1 L 7 4 L 0 7 z"
                fill="#475569"
                style="shape-rendering: geometricPrecision"
              />
            </marker>
            <marker
              id="light-gray-arrow"
              markerWidth="8"
              markerHeight="8"
              refX="0"
              refY="4"
              orient="auto-start-reverse"
            >
              <path
                d="M 0 1 L 7 4 L 0 7 z"
                fill="#94a3b8"
                style="shape-rendering: geometricPrecision"
              />
            </marker>
          </defs>

          <path
            :d="paths.logan"
            fill="none"
            stroke="#1e293b"
            stroke-width="4"
            stroke-linejoin="round"
            stroke-linecap="round"
            marker-end="url(#black-arrow)"
          />

          <path
            v-for="(pathD, id) in leftTribPaths"
            :key="id"
            :d="pathD"
            fill="none"
            stroke="#475569"
            stroke-width="4"
            stroke-linejoin="round"
            marker-end="url(#dark-gray-arrow)"
          />

          <path
            :d="paths.blacksmith"
            fill="none"
            stroke="#475569"
            stroke-width="4"
            stroke-linejoin="round"
            stroke-linecap="butt"
            marker-end="url(#dark-gray-arrow)"
          />

          <path
            :d="paths.cutlerLittleBear"
            fill="none"
            stroke="#94a3b8"
            stroke-width="4"
            stroke-linejoin="round"
            stroke-linecap="round"
            marker-end="url(#light-gray-arrow)"
          />

          <path
            :d="paths.cutlerSpringCreek"
            fill="none"
            stroke="#94a3b8"
            stroke-width="4"
            stroke-linejoin="round"
            stroke-linecap="round"
            marker-end="url(#light-gray-arrow)"
          />
        </svg>

        <div class="schematic-grid">
          <div
            v-for="node in leftTributaries"
            :key="node.id"
            :class="[
              'grid-cell',
              node.id === 'temple' || node.id === 'right_hand' ? 'col-3' : 'col-1',
            ]"
            :style="{
              gridRow: node.row,
              backgroundColor: waterwayBg(WATERWAY_COLORS[node.name]),
            }"
            :data-marker="node.id"
          >
            <StationCard
              v-if="findLiveStation(node.name)"
              :site="findLiveStation(node.name)!"
              compact
              @click="openStation(findLiveStation(node.name))"
            />
            <div v-else class="node-card inflow-card-left">
              <div class="inflow-content-wrapper">
                <span class="node-title">{{ node.name }}</span>
              </div>
            </div>
          </div>

          <div
            v-for="node in loganMainStem"
            :key="node.id"
            class="grid-cell col-2"
            :style="{
              gridRow: node.row,
              backgroundColor: waterwayBg(WATERWAY_COLORS['Logan River: Main Stem']),
            }"
            :data-marker="node.id"
          >
            <template v-if="findLiveStation(node.name)">
              <StationCard
                :site="findLiveStation(node.name)!"
                compact
                @click="openStation(findLiveStation(node.name))"
              />
            </template>
            <template v-else>
              <div
                v-if="node.type === 'line-junction'"
                :data-marker="node.id"
                class="junction-spacer"
              ></div>
              <div v-else class="node-card main-stem-card">
                <span class="node-title">{{ node.name }}</span>
                <div class="routing-label"></div>
              </div>
            </template>
          </div>

          <div
            v-for="node in blacksmithSystem"
            :key="node.id"
            class="grid-cell col-3"
            :style="{
              gridRow: node.row,
              backgroundColor: waterwayBg(WATERWAY_COLORS['Blacksmith Fork River']),
            }"
            :data-marker="node.id"
          >
            <StationCard
              v-if="findLiveStation(node.name)"
              :site="findLiveStation(node.name)!"
              compact
              @click="openStation(findLiveStation(node.name))"
            />
            <div v-else class="node-card bsf-card">
              <span class="node-title">{{ node.name }}</span>
            </div>
          </div>

          <div
            v-for="node in cutlerInflows"
            :key="node.id"
            class="grid-cell col-3"
            :style="{
              gridRow: node.row,
              backgroundColor: waterwayBg(WATERWAY_COLORS[node.tributary]),
            }"
            :data-marker="node.id"
          >
            <StationCard
              v-if="findLiveStation(node.name)"
              :site="findLiveStation(node.name)!"
              compact
              @click="openStation(findLiveStation(node.name))"
            />
            <div v-else class="node-card independent-card">
              <span class="node-title">{{ node.name }}</span>
              <div class="routing-label">Direct to Cutler Terminus</div>
            </div>
          </div>

          <div
            class="terminus-grid-cell"
            style="grid-row: 18; grid-column: 1 / span 3"
            data-marker="terminus_card"
          >
            <div class="terminus-card">
              <Droplets :size="26" class="terminus-icon" />
              <div class="terminus-details">
                <h3>SYSTEM TERMINUS: Cutler Reservoir</h3>
                <p>Ultimate drainage collection basin for all main channels and lateral streams.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="selectedStation" class="station-sheet-backdrop" @click="closeStation">
      <div class="station-sheet" @click.stop>
        <button class="sheet-close" type="button" aria-label="Close" @click="closeStation">
          &times;
        </button>
        <StationCard :site="selectedStation!" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.schematic-container {
  font-size: 1rem;
  font-weight: 600;
  color: #073763;
  letter-spacing: -0.01em;
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  padding: 2.5rem 2rem;
  box-sizing: border-box;
}

.schematic-grid-wrapper {
  position: relative;
  width: 100%;
  overflow-x: auto;
  padding-bottom: 1rem;
}

.schematic-grid-wrapper.is-compact {
  overflow: hidden;
  padding-bottom: 0;
}

/* Zoom mode: let the enlarged diagram be panned in both directions. */
.schematic-grid-wrapper.is-compact.is-zoomed {
  overflow: auto;
  -webkit-overflow-scrolling: touch;
}

.schematic-stage {
  position: relative;
  width: 100%;
  min-width: 950px;
  margin: 0 auto;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.schematic-stage.is-ready {
  opacity: 1;
}

.schematic-grid {
  display: grid;
  grid-template-columns: 1.1fr 1.3fr 1.1fr;
  grid-template-rows: repeat(17, auto) auto;
  row-gap: 32px;
  column-gap: 60px;
  align-items: center;
  position: relative;
  z-index: 2;
  min-width: 950px;
}

.global-routing-svg {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 1;
  shape-rendering: geometricPrecision;
  min-width: 950px;
  opacity: 0;
  transition: opacity 0.25s ease;
}

.global-routing-svg.lines-ready {
  opacity: 1;
}

.header-block {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 0.5rem;
}

.title-icon {
  color: #01377d;
}

h2 {
  font-size: 1.8rem;
  font-weight: 1000;
  color: #073763;
  letter-spacing: -0.01em;
  margin: 0;
}

.subtitle {
  color: #475569;
  font-family:
    system-ui,
    -apple-system,
    BlinkMacSystemFont,
    'Segoe UI',
    Roboto,
    sans-serif;
  font-size: 1.05rem;
  font-weight: 400;
  line-height: 1.5;
  margin: 0 0 2.5rem 0;
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem;
  gap: 15px;
  color: #64748b;
}

.spinner {
  width: 32px;
  height: 32px;
  border: 3px solid #e2e8f0;
  border-top: 3px solid #01377d;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.col-1 {
  grid-column: 1;
}

.col-2 {
  grid-column: 2;
}

.col-3 {
  grid-column: 3;
}

.grid-cell {
  display: flex;
  flex-direction: column;
  width: 100%;
  position: relative;
}

.junction-spacer {
  min-height: 64px;
}

.node-card {
  background: #ffffff;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  padding: 12px;
  min-height: 64px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02);
  box-sizing: border-box;
}

.main-stem-card {
  border: 2px solid #01377d;
  background: #f8fafc;
}

.node-title {
  font-size: 0.88rem;
  font-weight: 700;
  color: #334155;
}

.inflow-content-wrapper {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  justify-content: center;
}

.inflow-card-left {
  border-right: 4px solid #16a34a;
  background: #f0fdf4;
}

.bsf-card {
  border-left: 4px solid #16a34a;
}

.independent-card {
  border-left: 4px solid #ea580c;
}

.routing-label {
  font-size: 0.72rem;
  font-weight: 800;
  color: #ea580c !important;
  text-transform: uppercase;
  margin-top: 4px;
}

.terminus-grid-cell {
  display: flex;
  justify-content: center;
  width: 100%;
  margin-top: 2rem;
  position: relative;
  z-index: 5;
}

.terminus-card {
  width: 100%;
  max-width: 720px;
  background: #fff7ed;
  border: 2px solid #ea580c;
  border-radius: 12px;
  padding: 1.5rem;
  display: flex;
  align-items: center;
  gap: 16px;
  box-shadow: 0 4px 12px rgba(234, 88, 12, 0.08);
}

.terminus-icon {
  color: #ea580c;
}

.terminus-details h3 {
  margin: 0;
  font-size: 1.2rem;
  font-weight: 800;
  color: #7c2d12;
}

.terminus-details p {
  margin: 4px 0 0 0;
  font-size: 0.85rem;
  color: #9a3412;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

.grid-cell.col-1 {
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 10px;
  box-sizing: border-box;
}

.grid-cell.col-2 {
  border: 1px solid #cbd5e1;
  border-radius: 12px;
  padding: 10px;
  box-sizing: border-box;
}

.grid-cell.col-3 {
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 10px;
  box-sizing: border-box;
}

.grid-cell[data-marker='temple'],
.grid-cell[data-marker='right_hand'] {
  border-color: #e2e8f0 !important;
}

.grid-cell[data-marker='beaver_junc'],
.grid-cell[data-marker='ricks_junc'],
.grid-cell[data-marker='temple_junc'],
.grid-cell[data-marker='right_hand_junc'],
.grid-cell[data-marker='dewitt_junc'],
.grid-cell[data-marker='spring_creek_junc'],
.grid-cell[data-marker='bsf_confluence'] {
  background-color: transparent !important;
  border-color: transparent !important;
  box-shadow: none !important;
  padding: 0 !important;
}

/* Mobile zoom toggle */
.zoom-toggle {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 44px;
  margin: 0 0 1rem 0;
  padding: 0 18px;
  border: 1px solid #bfdbfe;
  border-radius: 9999px;
  background: #eff6ff;
  color: #1d4ed8;
  font-family:
    system-ui,
    -apple-system,
    BlinkMacSystemFont,
    'Segoe UI',
    Roboto,
    sans-serif;
  font-size: 0.95rem;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.18s ease;
}

.zoom-toggle:hover {
  background: #dbeafe;
}

.mobile-hint {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin: 0 0 1.5rem 0;
  padding: 6px 12px;
  border-radius: 9999px;
  background: #eff6ff;
  border: 1px solid #bfdbfe;
  color: #1d4ed8;
  font-family:
    system-ui,
    -apple-system,
    BlinkMacSystemFont,
    'Segoe UI',
    Roboto,
    sans-serif;
  font-size: 0.85rem;
  font-weight: 600;
}

.hint-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #3b82f6;
  flex-shrink: 0;
}

.station-sheet-backdrop {
  position: fixed;
  inset: 0;
  z-index: 1000;
  background: rgba(15, 23, 42, 0.45);
  display: flex;
  align-items: flex-end;
  justify-content: center;
}

.station-sheet {
  position: relative;
  width: 100%;
  max-width: 560px;
  max-height: 85vh;
  overflow-y: auto;
  background: #ffffff;
  border-radius: 16px 16px 0 0;
  padding: 1.25rem 1rem 1.5rem;
  box-shadow: 0 -8px 30px rgba(0, 0, 0, 0.2);
  animation: sheet-up 0.22s ease;
}

@keyframes sheet-up {
  from {
    transform: translateY(100%);
  }
  to {
    transform: translateY(0);
  }
}

.sheet-close {
  position: absolute;
  top: 8px;
  right: 12px;
  z-index: 1;
  border: none;
  background: transparent;
  font-size: 1.8rem;
  line-height: 1;
  color: #64748b;
  cursor: pointer;
  padding: 4px 10px;
}

.sheet-close:hover {
  color: #1e293b;
}
</style>
