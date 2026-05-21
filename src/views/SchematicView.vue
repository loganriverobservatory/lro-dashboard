<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick, computed } from 'vue'
import { Droplets, ArrowDown, CornerDownRight } from 'lucide-vue-next'

// 1. Using your exact required Station interface format!
export interface Station {
  id: string
  displayName: string
  description: string
  observation: any
  // Internal layout assistants (can be optional or stamped by the service)
  row?: number
  type?: string
}

const props = defineProps<{
  sites?: Station[]
  loading?: boolean
}>()

// 2. Updated Backups to use your exact "displayName" property
const backupLogan = [
  {
    id: 'franklin',
    displayName: 'Logan River: Franklin Basin',
    row: 1,
    type: 'source',
    description: '',
    observation: null,
  },
  {
    id: 'beaver',
    displayName: 'Beaver Creek',
    row: 2,
    type: 'inflow-left',
    description: '',
    observation: null,
  },
  {
    id: 'tony_grove',
    displayName: 'Logan River: Tony Grove',
    row: 3,
    type: 'gauge',
    description: '',
    observation: null,
  },
  {
    id: 'ricks',
    displayName: 'Ricks Spring',
    row: 4,
    type: 'inflow-left',
    description: '',
    observation: null,
  },
  {
    id: 'temple',
    displayName: 'Temple Fork',
    row: 5,
    type: 'inflow-left',
    description: '',
    observation: null,
  },
  {
    id: 'above_wood',
    displayName: 'Logan River: Above Wood Camp',
    row: 6,
    type: 'gauge',
    description: '',
    observation: null,
  },
  {
    id: 'wood_camp',
    displayName: 'Logan River: Wood Camp Bridge',
    row: 7,
    type: 'gauge',
    description: '',
    observation: null,
  },
  {
    id: 'right_hand',
    displayName: 'Right Hand Fork',
    row: 8,
    type: 'inflow-left',
    description: '',
    observation: null,
  },
  {
    id: 'guinivah',
    displayName: 'Logan River: Guinivah Campground',
    row: 9,
    type: 'gauge',
    description: '',
    observation: null,
  },
  {
    id: 'dewitt',
    displayName: 'Dewitt Springs',
    row: 10,
    type: 'inflow-left',
    description: '',
    observation: null,
  },
  {
    id: 'water_lab',
    displayName: 'Logan River: Water Lab',
    row: 11,
    type: 'gauge',
    description: '',
    observation: null,
  },
  {
    id: 'mainstreet',
    displayName: 'Logan River: Main Street',
    row: 12,
    type: 'gauge',
    description: '',
    observation: null,
  },
  {
    id: 'spring_creek',
    displayName: 'Spring Creek',
    row: 13,
    type: 'inflow-left',
    description: '',
    observation: null,
  },
  {
    id: 'bsf_confluence',
    displayName: 'Blacksmith Fork Confluence',
    row: 14,
    type: 'confluence-node',
    description: '',
    observation: null,
  },
  {
    id: 'thousand_w',
    displayName: 'Logan River: 1000 West',
    row: 15,
    type: 'gauge',
    description: '',
    observation: null,
  },
  {
    id: 'mendon_rd',
    displayName: 'Logan River: Mendon Road',
    row: 16,
    type: 'gauge',
    description: '',
    observation: null,
  },
  {
    id: 'before_cutler',
    displayName: 'Logan River: Before Confluence with Cutler Reservoir',
    row: 17,
    type: 'gauge',
    description: '',
    observation: null,
  },
]

const backupBlacksmith = [
  {
    id: 'hollow_rd',
    displayName: 'Blacksmith River: Hollow Road',
    row: 11,
    type: 'bsf-card',
    description: '',
    observation: null,
  },
  {
    id: 'seventeen_s',
    displayName: 'Blacksmith River: 1700 S',
    row: 12,
    type: 'bsf-card',
    description: '',
    observation: null,
  },
]

const backupCutler = [
  {
    id: 'little_bear',
    displayName: 'Little Bear River: Mendon Road',
    row: 15,
    type: 'independent-inflow',
    description: '',
    observation: null,
  },
  {
    id: 'spring_creek_mendon',
    displayName: 'Spring Creek: Mendon Road',
    row: 16,
    type: 'independent-inflow',
    description: '',
    observation: null,
  },
]

// 3. Computed Filters checking for live data vs backup structures
const loganMainStem = computed(() => {
  if (props.sites && props.sites.length > 0) {
    return props.sites
      .filter((s) => s.type !== 'bsf-card' && s.type !== 'independent-inflow')
      .sort((a, b) => (a.row || 0) - (b.row || 0))
  }
  return backupLogan
})

const blacksmithSystem = computed(() => {
  if (props.sites && props.sites.length > 0) {
    return props.sites
      .filter((s) => s.type === 'bsf-card')
      .sort((a, b) => (a.row || 0) - (b.row || 0))
  }
  return backupBlacksmith
})

const cutlerInflows = computed(() => {
  if (props.sites && props.sites.length > 0) {
    return props.sites
      .filter((s) => s.type === 'independent-inflow')
      .sort((a, b) => (a.row || 0) - (b.row || 0))
  }
  return backupCutler
})

// 4. Line Positioning Engine
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

  const terminusEl = gridContainerRef.value.querySelector('[data-marker="terminus_card"]')
  let reservoirTopY = containerRect.height
  let reservoirBlueX = 0
  let reservoirOrangeX1 = 0
  let reservoirOrangeX2 = 0

  if (terminusEl) {
    const tRect = terminusEl.getBoundingClientRect()
    reservoirTopY = tRect.top - containerRect.top

    const mainStemLastId =
      loganMainStem.value[loganMainStem.value.length - 1]?.id || 'before_cutler'
    const springCreekId = cutlerInflows.value[1]?.id || 'spring_creek_mendon'

    const blueNodePt = getMarkerCenter(mainStemLastId)
    const orangeNodePt = getMarkerCenter(springCreekId)

    reservoirBlueX = blueNodePt.x
    reservoirOrangeX1 = orangeNodePt.x + 50
    reservoirOrangeX2 = orangeNodePt.x + 20
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

  const bsfId1 = blacksmithSystem.value[0]?.id || 'hollow_rd'
  const bsfId2 = blacksmithSystem.value[1]?.id || 'seventeen_s'
  const bsf1 = getMarkerCenter(bsfId1)
  const bsf2 = getMarkerCenter(bsfId2)
  const confLeft = getMarkerCenter('bsf_confluence', 'left')
  paths.value.blacksmith = `M ${bsf1.x},${bsf1.y} L ${bsf2.x},${bsf2.y} V ${confLeft.y - 30} Q ${bsf2.x},${confLeft.y} ${bsf2.x - 40},${confLeft.y} L ${confLeft.x},${confLeft.y}`

  const lbId = cutlerInflows.value[0]?.id || 'little_bear'
  const scId = cutlerInflows.value[1]?.id || 'spring_creek_mendon'
  const lbCenter = getMarkerCenter(lbId)
  const lbRightEdgeX = lbCenter.x + 135
  paths.value.cutlerLittleBear = `M ${lbCenter.x},${lbCenter.y} L ${lbRightEdgeX},${lbCenter.y} L ${reservoirOrangeX1},${lbCenter.y} L ${reservoirOrangeX1},${reservoirTopY}`

  const scmCenter = getMarkerCenter(scId)
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
    <div v-if="props.loading" class="loading-overlay">
      <p>Synchronizing network matrix streams...</p>
    </div>

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
                <span class="node-title font-highlight">{{ node.displayName }}</span>
              </div>
            </div>

            <div v-else-if="node.type === 'inflow-left'" class="node-card inflow-card">
              <div class="inflow-content-wrapper">
                <CornerDownRight :size="16" class="arrow-inflow-blue" />
                <span class="node-title">{{ node.displayName }}</span>
              </div>
            </div>

            <div v-else class="node-card main-stem-card">
              <span class="node-title">{{ node.displayName }}</span>
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
              <span class="node-title">{{ node.displayName }}</span>
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
              <span class="node-title">{{ node.displayName }}</span>
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
.schematic-grid-wrapper {
  position: relative;
  width: 100%;
}
.global-routing-svg {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 1;
}
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
.inflow-content-wrapper {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
}
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
.bsf-card {
  border-left: 4px solid #16a34a;
}
.arrow-down-green {
  color: #16a34a !important;
  margin-top: 4px;
}
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
.loading-overlay {
  background: #f8fafc;
  padding: 10px 20px;
  border-radius: 6px;
  font-weight: bold;
  margin-bottom: 1rem;
  text-align: center;
  border: 1px dashed #cbd5e1;
}
</style>
