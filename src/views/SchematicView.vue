<script setup lang="ts">
/*
SchematicView.vue - Renders one schematic page (Upper Logan Canyon / Lower Logan River /
Blacksmith Fork River, selected by the `slug` route param) as a Vue Flow node/edge diagram,
driven entirely by the page's public/schematics/{slug}.json config. Replaces the previous
hand-rolled CSS grid + getBoundingClientRect()-measured SVG path drawing: Vue Flow owns node
positioning, edge routing, and pan/zoom/touch natively.
*/
import { ref, computed, onMounted, watch, markRaw } from 'vue'
import { useRouter } from 'vue-router'
import {
  VueFlow,
  MarkerType,
  useVueFlow,
  type Node as VFNode,
  type Edge as VFEdge,
} from '@vue-flow/core'
import { Controls } from '@vue-flow/controls'
import { Droplets } from 'lucide-vue-next'
import '@vue-flow/core/dist/style.css'
import '@vue-flow/controls/dist/style.css'
import {
  type Station,
  type SchematicSlug,
  type SchematicPageConfig,
  type SchematicNode as SchematicNodeData,
} from '../hydroService'
import SchematicNode from '../components/SchematicNode.vue'
import StationCard from '../components/StationCard.vue'

const props = defineProps<{
  slug: SchematicSlug
  sites: Station[]
  loading: boolean
  activeWaterways?: string[]
}>()

const router = useRouter()
const { fitView, onNodesInitialized } = useVueFlow()

const nodeTypes = { schematic: markRaw(SchematicNode) }

const page = ref<SchematicPageConfig | null>(null)
const pageLoadFailed = ref(false)
const selectedStation = ref<Station | null>(null)
const isCompact = ref(false)

// Must stay comfortably wider than the fixed node width set in SchematicNode.vue, so
// adjacent columns never overlap.
const COL_WIDTH = 420
const ROW_HEIGHT = 190

// Keep in sync with SchematicNode.vue's .schematic-node / .node-type-junction widths.
const NODE_WIDTH = 300
const JUNCTION_WIDTH = 30

async function loadPage() {
  page.value = null
  pageLoadFailed.value = false
  try {
    const res = await fetch(`/schematics/${props.slug}.json`, { cache: 'no-cache' })
    page.value = res.ok ? ((await res.json()) as SchematicPageConfig) : null
  } catch {
    page.value = null
  }
  pageLoadFailed.value = page.value === null
}

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

// A lateral node's own row doesn't always match the row of the junction it connects to,
// which draws a bent connector with an awkward gap. Snap it onto that row instead when the
// slot is free in its column, so it lines up flush; if two laterals would land on the same
// slot, leave both at their configured rows rather than stacking them. Only 'branch' edges
// (a single tributary/diversion attaching to one junction) qualify — 'thin' edges often
// converge multiple independent nodes onto one shared terminus, where forcing one of them
// to align would silently reorder them relative to each other.
function computeRowOverrides(page: SchematicPageConfig): Map<string, number> {
  const nodesById = new Map(page.nodes.map((n) => [n.id, n]))
  const attachTarget = new Map<string, string>()
  page.edges.forEach((edge) => {
    if (edge.style !== 'branch') return
    attachTarget.set(edge.from, edge.to)
  })

  const occupied = new Set(page.nodes.map((n) => `${n.col}:${n.row}`))
  const rowOverrides = new Map<string, number>()

  page.nodes.forEach((node) => {
    const targetId = attachTarget.get(node.id)
    const target = targetId ? nodesById.get(targetId) : undefined
    if (!target || target.row === node.row) return

    const slot = `${node.col}:${target.row}`
    if (occupied.has(slot)) return

    occupied.delete(`${node.col}:${node.row}`)
    occupied.add(slot)
    rowOverrides.set(node.id, target.row)
  })

  return rowOverrides
}

const vfNodes = computed<VFNode[]>(() => {
  if (!page.value) return []
  const rowOverrides = computeRowOverrides(page.value)
  return page.value.nodes.map((node: SchematicNodeData): VFNode => {
    const xOffset = node.type === 'junction' ? (NODE_WIDTH - JUNCTION_WIDTH) / 2 : 0
    const row = rowOverrides.get(node.id) ?? node.row
    return {
      id: node.id,
      type: 'schematic',
      position: { x: node.col * COL_WIDTH + xOffset, y: row * ROW_HEIGHT },
      data: {
        nodeType: node.type,
        name: node.name,
        label: node.label,
        description: node.description,
        targetSchematic: node.targetSchematic,
        colorGroup: node.colorGroup,
        liveStation: node.type === 'station' ? findLiveStation(node.name) : undefined,
      },
    }
  })
})

const STYLE_PRESETS = {
  main: { stroke: '#1e293b', strokeWidth: 4 },
  branch: { stroke: '#475569', strokeWidth: 3 },
  thin: { stroke: '#94a3b8', strokeWidth: 3 },
} as const

const vfEdges = computed<VFEdge[]>(() => {
  if (!page.value) return []
  const colById = new Map(page.value.nodes.map((n) => [n.id, n.col]))

  return page.value.edges.map((edge) => {
    // 'out' edges (diversions/canals) flow away from the junction, so the arrowhead
    // needs to land on the diversion, not the junction — swap source/target rather
    // than juggling markerStart vs markerEnd, so every edge can just use markerEnd.
    const reversed = edge.direction === 'out'
    const source = reversed ? edge.to : edge.from
    const target = reversed ? edge.from : edge.to
    const preset = STYLE_PRESETS[edge.style]

    // Pick vertical (top/bottom) handles when both ends share a column — this is what
    // keeps the main channel a single straight line — or horizontal (left/right) handles
    // when a lateral tributary/diversion sits in a different column, so it branches
    // cleanly out to the side instead of routing through a boxy up/down S-curve.
    const sourceCol = colById.get(source) ?? 0
    const targetCol = colById.get(target) ?? 0
    let sourceHandle = 's-bottom'
    let targetHandle = 't-top'
    let edgeShape: 'straight' | 'smoothstep' = 'straight'
    if (sourceCol < targetCol) {
      sourceHandle = 's-right'
      targetHandle = 't-left'
      edgeShape = 'smoothstep'
    } else if (sourceCol > targetCol) {
      sourceHandle = 's-left'
      targetHandle = 't-right'
      edgeShape = 'smoothstep'
    }

    return {
      id: edge.id,
      source,
      target,
      sourceHandle,
      targetHandle,
      type: edge.edgeType ?? edgeShape,
      style: { stroke: preset.stroke, strokeWidth: preset.strokeWidth },
      markerEnd: { type: MarkerType.ArrowClosed, color: preset.stroke, width: 16, height: 16 },
    }
  })
})

function onNodeClick({ node }: { node: VFNode }) {
  const data = node.data as VFNode['data'] & {
    nodeType: string
    targetSchematic?: SchematicSlug
    liveStation?: Station
  }
  if (data.nodeType === 'extension' && data.targetSchematic) {
    router.push(`/schematic/${data.targetSchematic}`)
    return
  }
  if (data.nodeType === 'station' && isCompact.value && data.liveStation) {
    selectedStation.value = data.liveStation
  }
}

function closeStation() {
  selectedStation.value = null
}

function updateIsCompact() {
  isCompact.value = window.innerWidth <= 768
}

onNodesInitialized(() => {
  fitView({ padding: 0.15 })
})

onMounted(() => {
  updateIsCompact()
  window.addEventListener('resize', updateIsCompact)
  loadPage()
})

watch(
  () => props.slug,
  () => {
    selectedStation.value = null
    loadPage()
  },
)
</script>

<template>
  <div class="schematic-container">
    <div class="header-row">
      <div class="header-block">
        <Droplets :size="22" class="title-icon" />
        <h2>{{ page?.title ?? 'Logan River System Schematic' }}</h2>
        <span v-if="page?.subtitle" class="subtitle-inline">{{ page.subtitle }}</span>
      </div>

      <p v-if="isCompact && !loading && page" class="mobile-hint">
        <span class="hint-dot"></span>
        Pinch or drag to pan and zoom. Tap a station for details.
      </p>
    </div>

    <div v-if="loading || !page" class="loading-state">
      <template v-if="pageLoadFailed">
        <p>Couldn't load this schematic page. Try refreshing.</p>
      </template>
      <template v-else>
        <div class="spinner"></div>
        <p>Loading schematic…</p>
      </template>
    </div>

    <div v-else class="vueflow-wrapper">
      <VueFlow
        :nodes="vfNodes"
        :edges="vfEdges"
        :node-types="nodeTypes"
        :nodes-draggable="false"
        :nodes-connectable="false"
        :elements-selectable="false"
        :pan-on-drag="true"
        :zoom-on-pinch="true"
        :zoom-on-double-click="false"
        :prevent-scrolling="true"
        :min-zoom="0.3"
        :max-zoom="1.5"
        :fit-view-on-init="true"
        @node-click="onNodeClick"
      >
        <Controls :show-interactive="false" />
      </VueFlow>
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
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  font-size: 1rem;
  font-weight: 600;
  color: #073763;
  letter-spacing: -0.01em;
  padding: 0.85rem 1.25rem;
  box-sizing: border-box;
}

@media screen and (max-width: 640px) {
  .schematic-container {
    padding: 0.6rem 0.6rem;
  }
}

.header-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 0.6rem;
}

.header-block {
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 10px;
}

.title-icon {
  color: #01377d;
  align-self: center;
}

h2 {
  font-size: 1.35rem;
  font-weight: 1000;
  color: #073763;
  letter-spacing: -0.01em;
  margin: 0;
}

.subtitle-inline {
  color: #475569;
  font-family:
    system-ui,
    -apple-system,
    BlinkMacSystemFont,
    'Segoe UI',
    Roboto,
    sans-serif;
  font-size: 0.9rem;
  font-weight: 400;
}

.mobile-hint {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin: 0;
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
  font-size: 0.8rem;
  font-weight: 600;
}

.hint-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #1d4ed8;
  flex-shrink: 0;
}

.loading-state {
  display: flex;
  flex: 1;
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

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

.vueflow-wrapper {
  position: relative;
  width: 100%;
  flex: 1;
  min-height: 320px;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  background: #f8fafc;
  touch-action: none;
  overflow: hidden;
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

.station-sheet :deep(.card-flex-layout) {
  flex-direction: column;
  align-items: stretch;
  gap: 0.75rem;
}
.station-sheet :deep(.sparkline-sidebar-wrapper) {
  width: 100%;
}
.station-sheet :deep(.sparkline-title) {
  text-align: left;
}
.station-sheet :deep(.sparkline-sidebar-wrapper .cursor-pointer) {
  height: auto !important;
  aspect-ratio: 9 / 4;
}
</style>
