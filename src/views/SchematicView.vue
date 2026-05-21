<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick } from 'vue'
import { Droplets, ArrowDown, CornerDownRight } from 'lucide-vue-next'

const loganMainStem = ref([
  { id: 'franklin', name: 'Logan River: Franklin Basin', row: 1, type: 'source' },
  { id: 'beaver', name: 'Beaver Creek', row: 2, type: 'inflow-left' },
  { id: 'tony_grove', name: 'Logan River: Tony Grove', row: 3, type: 'gauge' },
  { id: 'ricks', name: 'Ricks Spring', row: 4, type: 'inflow-left' },
  { id: 'temple', name: 'Temple Fork', row: 5, type: 'inflow-left' },
  { id: 'above_wood', name: 'Logan River: Above Wood Camp', row: 6, type: 'gauge' },
  { id: 'wood_camp', name: 'Logan River: Wood Camp Bridge', row: 7, type: 'gauge' },
  { id: 'right_hand', name: 'Right Hand Fork', row: 8, type: 'inflow-left' },
  { id: 'guinivah', name: 'Logan River: Guinivah Campground', row: 9, type: 'gauge' },
  { id: 'dewitt', name: 'Dewitt Springs', row: 10, type: 'inflow-left' },
  { id: 'water_lab', name: 'Logan River: Water Lab', row: 11, type: 'gauge' },
  { id: 'mainstreet', name: 'Logan River: Main Street', row: 12, type: 'gauge' },
  { id: 'spring_creek', name: 'Spring Creek', row: 13, type: 'inflow-left' },
  { id: 'bsf_confluence', name: 'Blacksmith Fork Confluence', row: 14, type: 'confluence-node' },
  { id: 'thousand_w', name: 'Logan River: 1000 West', row: 15, type: 'gauge' },
  { id: 'mendon_rd', name: 'Logan River: Mendon Road', row: 16, type: 'gauge' },
  {
    id: 'before_cutler',
    name: 'Logan River: Before Confluence with Cutler Reservoir',
    row: 17,
    type: 'gauge',
  },
])

const blacksmithSystem = ref([
  { id: 'hollow_rd', name: 'Blacksmith River: Hollow Road', row: 11, type: 'bsf-card' },
  { id: 'seventeen_s', name: 'Blacksmith River: 1700 S', row: 12, type: 'bsf-card' },
])

const cutlerInflows = ref([
  {
    id: 'little_bear',
    name: 'Little Bear River: Mendon Road',
    row: 15,
    type: 'independent-inflow',
  },
  {
    id: 'spring_creek_mendon',
    name: 'Spring Creek: Mendon Road',
    row: 16,
    type: 'independent-inflow',
  },
])

// Vector Overlay Coordinates state
const gridContainerRef = ref<HTMLElement | null>(null)
const paths = ref({
  logan: '',
  blacksmith: '',
  cutlerLittleBear: '',
  cutlerSpringCreek: '',
})

const updateLineCoordinates = async () => {
  await nextTick()
  if (!gridContainerRef.value) return

  const containerRect = gridContainerRef.value.getBoundingClientRect()

  const getMarkerCenter = (id: string, position: 'center' | 'left' = 'center') => {
    const el = gridContainerRef.value?.querySelector(`[data-marker="${id}"]`)
    if (!el) return { x: 0, y: 0 }
    const rect = el.getBoundingClientRect()

    if (position === 'left') {
      return {
        x: rect.left - containerRect.left,
        y: rect.top + rect.height / 2 - containerRect.top,
      }
    }
    return {
      x: rect.left + rect.width / 2 - containerRect.left,
      y: rect.top + rect.height / 2 - containerRect.top,
    }
  }

  // Target coordinates on the top border of the Terminus reservoir card
  const terminusEl = gridContainerRef.value.querySelector('[data-marker="terminus_card"]')
  let reservoirTopY = containerRect.height
  let reservoirBlueX = 0
  let reservoirOrangeX1 = 0
  let reservoirOrangeX2 = 0

  if (terminusEl) {
    const tRect = terminusEl.getBoundingClientRect()
    reservoirTopY = tRect.top - containerRect.top

    const blueNodePt = getMarkerCenter('before_cutler')
    const orangeNodePt = getMarkerCenter('spring_creek_mendon')

    reservoirBlueX = blueNodePt.x
    // Anchor destinations spaced cleanly on the right half of the reservoir card
    reservoirOrangeX1 = orangeNodePt.x + 50
    reservoirOrangeX2 = orangeNodePt.x + 20
  }

  // 1. Primary Logan Trunk Line (Now tracks all the way through the new bottom confluence node)
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

  // 2. Blacksmith Hook Line
  const bsf1 = getMarkerCenter('hollow_rd')
  const bsf2 = getMarkerCenter('seventeen_s')
  const confLeft = getMarkerCenter('bsf_confluence', 'left')
  paths.value.blacksmith = `M ${bsf1.x},${bsf1.y} L ${bsf2.x},${bsf2.y} V ${confLeft.y - 30} Q ${bsf2.x},${confLeft.y} ${bsf2.x - 40},${confLeft.y} L ${confLeft.x},${confLeft.y}`

  // 3. Crisp Independent Line A: Little Bear River
  const lbCenter = getMarkerCenter('little_bear')
  const lbRightEdgeX = lbCenter.x + 135
  paths.value.cutlerLittleBear = `M ${lbCenter.x},${lbCenter.y} L ${lbRightEdgeX},${lbCenter.y} L ${reservoirOrangeX1},${lbCenter.y} L ${reservoirOrangeX1},${reservoirTopY}`

  // 4. Crisp Independent Line B: Spring Creek
  const scmCenter = getMarkerCenter('spring_creek_mendon')
  const scmRightEdgeX = scmCenter.x + 135
  paths.value.cutlerSpringCreek = `M ${scmCenter.x},${scmCenter.y} L ${scmRightEdgeX},${scmCenter.y} L ${reservoirOrangeX2},${scmCenter.y} L ${reservoirOrangeX2},${reservoirTopY}`
}

let resizeObserver: ResizeObserver | null = null

onMounted(() => {
  setTimeout(() => {
    updateLineCoordinates()
  }, 100)
  setTimeout(() => {
    updateLineCoordinates()
  }, 300)

  if (gridContainerRef.value) {
    resizeObserver = new ResizeObserver(() => {
      updateLineCoordinates()
    })
    resizeObserver.observe(gridContainerRef.value)
  }
  window.addEventListener('resize', updateLineCoordinates)
})

onUnmounted(() => {
  if (resizeObserver) resizeObserver.disconnect()
  window.removeEventListener('resize', updateLineCoordinates)
})
</script>

<template>
  <div class="schematic-container">
    <div class="schematic-card">
      <div class="header-block">
        <Droplets :size="28" class="title-icon" />
        <h2>Hydrologic Network Schematic Matrix</h2>
      </div>
      <p class="subtitle">
        Multi-column topology tracking parallel sub-basins entering the Cutler Reservoir basin.
      </p>

      <div class="schematic-grid-wrapper" ref="gridContainerRef">
        <svg class="global-routing-svg">
          <path
            :d="paths.logan"
            fill="none"
            stroke="#01377D"
            stroke-width="4"
            stroke-linejoin="round"
            stroke-linecap="round"
          />
          <path
            :d="paths.blacksmith"
            fill="none"
            stroke="#16a34a"
            stroke-width="4"
            stroke-linejoin="round"
            stroke-linecap="round"
          />
          <path
            :d="paths.cutlerLittleBear"
            fill="none"
            stroke="#ea580c"
            stroke-width="4"
            stroke-linejoin="round"
            stroke-linecap="round"
          />
          <path
            :d="paths.cutlerSpringCreek"
            fill="none"
            stroke="#ea580c"
            stroke-width="4"
            stroke-linejoin="round"
            stroke-linecap="round"
          />
        </svg>

        <div class="schematic-grid">
          <div class="grid-cell col-1 placeholder-cell"></div>

          <div
            v-for="node in loganMainStem"
            :key="node.id"
            class="grid-cell col-2"
            :style="{ gridRow: node.row }"
            :data-marker="node.id"
          >
            <div v-if="node.type === 'confluence-node'" class="node-card confluence-card">
              <div class="inflow-content-wrapper">
                <CornerDownRight :size="16" class="arrow-inflow-green" />
                <span class="node-title font-highlight">{{ node.name }}</span>
              </div>
            </div>

            <div v-else-if="node.type === 'inflow-left'" class="node-card inflow-card">
              <div class="inflow-content-wrapper">
                <CornerDownRight :size="16" class="arrow-inflow-blue" />
                <span class="node-title">{{ node.name }}</span>
              </div>
            </div>

            <div v-else class="node-card main-stem-card">
              <span class="node-title">{{ node.name }}</span>
              <ArrowDown :size="16" class="arrow-down-indicator" />
            </div>
          </div>

          <div
            v-for="node in blacksmithSystem"
            :key="node.id"
            class="grid-cell col-3"
            :style="{ gridRow: node.row }"
            :data-marker="node.id"
          >
            <div class="node-card bsf-card">
              <span class="node-title">{{ node.name }}</span>
              <ArrowDown :size="16" class="arrow-down-green" />
            </div>
          </div>

          <div
            v-for="node in cutlerInflows"
            :key="node.id"
            class="grid-cell col-3"
            :style="{ gridRow: node.row }"
            :data-marker="node.id"
          >
            <div class="node-card independent-card">
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
  </div>
</template>

<style scoped>
.schematic-container {
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  box-sizing: border-box;
}

.schematic-card {
  background: #ffffff;
  padding: 2.5rem;
  border-radius: 16px;
  border: 1px solid #e2e8f0;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
}

.header-block {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 0.5rem;
}

.title-icon {
  color: #0284c7;
}

/* Forced high contrast solid black text rules */
h2,
h3,
p,
span,
div {
  color: #000000 !important;
}

h2 {
  font-size: 1.75rem;
  font-weight: 800;
  margin: 0;
}

.subtitle {
  font-size: 1rem;
  margin: 0 0 2.5rem 0;
}

/* Container hosting both the layout elements and the canvas paths */
.schematic-grid-wrapper {
  position: relative;
  width: 100%;
}

/* Master SVG overlay canvas plane */
.global-routing-svg {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 1;
}

/* Three columns with optimal margins for outer bypass lines */
.schematic-grid {
  display: grid;
  grid-template-columns: 0.3fr 1.3fr 1.1fr;
  grid-template-rows: repeat(17, auto) auto;
  row-gap: 28px;
  column-gap: 55px;
  align-items: center;
  position: relative;
  z-index: 2;
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

.placeholder-cell {
  min-height: 0;
}

/* Base Node Card Geometry */
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

/* Central Star: Logan Main Stem Styling */
.main-stem-card {
  border: 2px solid #01377d;
  background: #fdfdfd;
  box-shadow: 0 4px 6px -1px rgba(1, 55, 125, 0.05);
}
.main-stem-card .node-title {
  font-size: 0.95rem;
  font-weight: 800;
}
.arrow-down-indicator {
  color: #01377d !important;
  margin-top: 4px;
}

.node-title {
  font-size: 0.88rem;
  font-weight: 700;
}
.font-highlight {
  font-weight: 800;
}

/* Inline Inflow Layout Architecture: Left aligned Arrow box mapping */
.inflow-content-wrapper {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
}

/* Lateral Blue Tributaries / Springs */
.inflow-card {
  border-left: 4px solid #38bdf8;
  background: #f0f9ff;
  align-items: flex-start;
  text-align: left;
  padding-left: 14px;
}
.arrow-inflow-blue {
  color: #0284c7 !important;
  flex-shrink: 0;
}

/* GREEN CONFLUENCE NODE */
.confluence-card {
  border-left: 4px solid #16a34a;
  background: #f0fdf4;
  border-top: 1px solid #cbd5e1;
  border-right: 1px solid #cbd5e1;
  border-bottom: 1px solid #cbd5e1;
  align-items: center;
  text-align: center;
}
.arrow-inflow-green {
  color: #16a34a !important;
  flex-shrink: 0;
}

/* Blacksmith Fork System Components */
.bsf-card {
  border-left: 4px solid #16a34a;
}
.arrow-down-green {
  color: #16a34a !important;
  margin-top: 4px;
}

/* Independent Inflows Draining Straight Down into Cutler Pool */
.independent-card {
  border-left: 4px solid #ea580c;
  align-items: center;
  text-align: center;
}
.routing-label {
  font-size: 0.72rem;
  font-weight: 800;
  color: #ea580c !important;
  text-transform: uppercase;
  margin-top: 4px;
}

/* Bottom Terminus Component Block inside Grid Layout */
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
}

.terminus-details p {
  margin: 4px 0 0 0;
  font-size: 0.85rem;
}
</style>
