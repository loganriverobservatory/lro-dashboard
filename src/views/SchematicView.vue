<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { Droplets, ArrowDown, Info } from 'lucide-vue-next'

// We map out your topology exactly as you listed it from top to bottom
const riverNodes = ref([
  { id: 'franklin', name: 'Logan River: Franklin Basin', type: 'main-stem' },
  { id: 'beaver', name: 'Beaver Creek (Flows into Logan River)', type: 'tributary' },
  { id: 'tony_grove', name: 'Logan River: Tony Grove', type: 'main-stem' },
  { id: 'ricks', name: 'Ricks Spring (Flows into Logan River)', type: 'tributary' },
  { id: 'temple', name: 'Temple Fork (Flows into Logan River)', type: 'tributary' },
  { id: 'above_wood', name: 'Logan River: Above Wood Camp', type: 'main-stem' },
  { id: 'wood_camp', name: 'Logan River: Wood Camp Bridge', type: 'main-stem' },
  { id: 'right_hand', name: 'Right Hand Fork (Flows into Logan River)', type: 'tributary' },
  { id: 'guinivah', name: 'Logan River: Guinivah Campground', type: 'main-stem' },
  { id: 'dewitt', name: 'Dewitt Springs (Flows into Logan River)', type: 'tributary' },
  { id: 'water_lab', name: 'Logan River: Water Lab', type: 'main-stem' },
  { id: 'mainstreet', name: 'Logan River: Main Street', type: 'main-stem' },
  { id: 'spring_creek', name: 'Spring Creek (Flows into Logan River)', type: 'tributary' },

  // Blacksmith River system branching and feeding in
  {
    id: 'blacksmith_header',
    name: '--- Blacksmith Fork Tributary System ---',
    type: 'system-divider',
  },
  {
    id: 'hollow_rd',
    name: 'Blacksmith River: Hollow Road (Top of Blacksmith)',
    type: 'sub-branch',
  },
  { id: 'seventeen_s', name: 'Blacksmith River: 1700 S', type: 'sub-branch' },
  {
    id: 'confluence',
    name: 'Blacksmith River: Above Confluence with Logan River',
    type: 'tributary',
  },

  // Back to the lower Logan main stem
  { id: 'thousand_w', name: 'Logan River: 1000 West', type: 'main-stem' },
  { id: 'mendon_rd', name: 'Logan River: Mendon Road', type: 'main-stem' },

  // Independent basins dumping straight into Cutler Reservoir
  {
    id: 'cutler_header',
    name: '--- Independent Cutler Reservoir Inflows ---',
    type: 'system-divider',
  },
  {
    id: 'little_bear',
    name: 'Little Bear River: Mendon Road (Runs into Cutler separately)',
    type: 'sub-branch',
  },
  {
    id: 'spring_creek_mendon',
    name: 'Spring Creek: Mendon Road (Runs into Cutler separately)',
    type: 'sub-branch',
  },

  // The ultimate endpoint
  { id: 'cutler', name: 'Logan River: Cutler Reservoir (System Terminus)', type: 'terminus' },
])

const loading = ref(false)
</script>

<template>
  <div class="schematic-container">
    <div class="schematic-card">
      <div class="header-block">
        <Droplets :size="28" class="title-icon" />
        <h2>Hydrologic Network Schematic</h2>
      </div>
      <p class="subtitle">
        Linear topological layout tracking the flow paths, tributaries, and confluences of the Logan
        River basin from highest upstream source to the Cutler Reservoir terminus.
      </p>

      <div class="network-diagram">
        <div v-for="(node, index) in riverNodes" :key="node.id" class="node-row" :class="node.type">
          <div class="line-column">
            <div
              v-if="node.type !== 'system-divider'"
              class="indicator-dot"
              :class="node.type"
            ></div>
            <div
              v-if="index < riverNodes.length - 1 && node.type !== 'system-divider'"
              class="vertical-flow-line"
            ></div>
          </div>

          <div class="content-column">
            <div class="station-plate" :class="node.type">
              <span class="station-name">{{ node.name }}</span>
              <div
                v-if="node.type === 'main-stem' || node.type === 'sub-branch'"
                class="live-data-badge"
              >
                <span class="flow-value">Active Station</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="footer-legend">
        <div class="legend-item">
          <div class="legend-dot main-stem"></div>
          Solid Black Text: Main Channel
        </div>
        <div class="legend-item">
          <div class="legend-dot tributary"></div>
          Indented Box: Lateral Inflow / Spring
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Layout Enclosure matching your clean white panel upgrades */
.schematic-container {
  width: 100%;
  max-width: 1000px;
  margin: 0 auto;
  box-sizing: border-box;
}

.schematic-card {
  background: #ffffff;
  padding: 3rem 2.5rem;
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

/* Explicit high contrast solid black text rules */
h2,
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
  line-height: 1.6;
  margin: 0 0 3rem 0;
}

/* Diagram Structure Mapping matrix */
.network-diagram {
  display: flex;
  flex-direction: column;
  position: relative;
  margin-left: 20px;
}

.node-row {
  display: flex;
  align-items: stretch;
  min-height: 64px;
}

/* Tracking connection geometry */
.line-column {
  width: 40px;
  position: relative;
  display: flex;
  justify-content: center;
}

.vertical-flow-line {
  position: absolute;
  top: 24px;
  bottom: -40px;
  width: 4px;
  background-color: #0284c7; /* Classic blue river track line */
  z-index: 1;
}

/* Different Node Types geometry mapping */
.indicator-dot {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #ffffff;
  border: 4px solid #01377d;
  margin-top: 10px;
  z-index: 2;
}

.indicator-dot.tributary {
  border-color: #0284c7;
  background: #e0f2fe;
}

.indicator-dot.terminus {
  border-color: #ea580c;
  border-radius: 4px;
}

/* Layout alignment shifts based on your topological hierarchy inputs */
.content-column {
  flex-grow: 1;
  padding-bottom: 24px;
  display: flex;
  align-items: center;
}

.station-plate {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  padding: 10px 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  max-width: 650px;
  transition: background-color 0.2s;
}

.station-plate:hover {
  background: #f1f5f9;
}

.station-name {
  font-size: 0.95rem;
  font-weight: 700;
}

/* Indent Tributaries so they look visually distinct as lateral branch feeding sources */
.node-row.tributary .station-plate,
.node-row.sub-branch .station-plate {
  margin-left: 30px;
  border-left: 4px solid #38bdf8;
  background: #ffffff;
}

/* Header Separator Bounding Boxes for Sub-basins */
.node-row.system-divider {
  min-height: auto;
  padding: 20px 0 10px 0;
}
.node-row.system-divider .station-name {
  font-size: 0.85rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #64748b !important; /* Soft descriptive helper accent text */
}
.node-row.system-divider .station-plate {
  background: transparent;
  border: none;
  padding: 0;
}

/* Terminus Highlight at the very bottom */
.node-row.terminus .station-plate {
  border: 2px solid #ea580c;
  background: #fff7ed;
}

.live-data-badge {
  background-color: #e2e8f0;
  padding: 4px 10px;
  border-radius: 6px;
}

.flow-value {
  font-size: 0.75rem;
  font-weight: 800;
}

.footer-legend {
  margin-top: 2rem;
  padding-top: 1.5rem;
  border-top: 1px solid #e2e8f0;
  display: flex;
  gap: 24px;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.85rem;
  font-weight: 600;
}

.legend-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  border: 3px solid #01377d;
}
.legend-dot.tributary {
  border-color: #0284c7;
}
</style>
