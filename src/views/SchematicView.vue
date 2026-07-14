<script setup lang="ts">
/*
SchematicView.vue - Renders one schematic page (Upper Logan Canyon / Lower Logan River /
Blacksmith Fork River, selected by the `slug` route param) as a Vue Flow node/edge diagram,
driven entirely by the page's public/schematics/{slug}.json config. The config only says what
each node IS (kind + connectsTo + side) - this file derives where it goes and how it connects;
Vue Flow just owns node positioning, edge routing, and pan/zoom/touch once handed that.
*/
import { ref, computed, onMounted, watch, markRaw, provide } from 'vue'
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

// Persistent tab bar so switching systems doesn't require going back to the sidebar.
// Upstream-to-downstream order, not the object-key order marie-branch's SchematicHub uses.
const SYSTEMS: { slug: SchematicSlug; label: string }[] = [
  { slug: 'upper-logan', label: 'Upper Logan Canyon' },
  { slug: 'lower-logan', label: 'Lower Logan River' },
  { slug: 'blacksmith-fork', label: 'Blacksmith Fork River' },
  { slug: 'little-bear', label: 'Little Bear River' },
]

const nodeTypes = { schematic: markRaw(SchematicNode) }

const page = ref<SchematicPageConfig | null>(null)
const pageLoadFailed = ref(false)
const selectedStation = ref<Station | null>(null)
const isCompact = ref(false)

// Must stay comfortably wider than the fixed node width set in SchematicNode.vue, so
// adjacent columns never overlap.
const COL_WIDTH = 320
const ROW_HEIGHT = 150

// Keep in sync with SchematicNode.vue's .schematic-node / .kind-junction widths.
const NODE_WIDTH = 240
const JUNCTION_WIDTH = 10

// The main channel's lane. Left/right lanes are always +/-1 from this - there's no extra
// lane per side; branches that share a side stack vertically instead (see computeLayout).
const CENTER_COL = 2

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

// Generic river-system labels - when one of these sits before the colon in a live display
// name, it's pure boilerplate (the diagram already conveys which system you're on via the
// page and trunk position), so it gets dropped. Matches the same river names used elsewhere
// for group colors (WATERWAY_COLORS / SCHEMATIC_ACCENT_COLORS).
const RIVER_SYSTEM_LABELS = ['Logan River', 'Blacksmith Fork River', 'Little Bear River']

// Schematic-only display shortening. Two unrelated patterns show up in live display names,
// and they need opposite treatment:
//  - "Logan River: Franklin Basin" - generic river prefix, specific place after the colon.
//    Drop the prefix, keep the place: "Franklin Basin".
//  - "Right Hand Fork: Before Confluence with Logan River" - here the SPECIFIC name (the
//    tributary itself) is the prefix, and "Before Confluence with ..." is the boilerplate.
//    Keep the prefix, drop the rest entirely: "Right Hand Fork".
// Telling them apart: is the prefix one of the generic river-system labels, or a specific
// tributary/creek/fork name? Only in the former case is there a fallback needed at all - a
// couple of mainstem stations have nothing BUT "Before Confluence with X" after a generic
// prefix (e.g. "Logan River: Before Confluence with Cutler Reservoir"), so that case falls
// back to showing the confluence target itself.
// Only ever applied to display text - matching against live stations always uses the raw
// name, before this runs.
function shortenForSchematic(name: string): string {
  const colonIndex = name.indexOf(':')
  if (colonIndex === -1) return name.trim()

  const prefix = name.slice(0, colonIndex).trim()
  const rest = name.slice(colonIndex + 1).trim()

  if (!RIVER_SYSTEM_LABELS.includes(prefix)) {
    // Specific tributary/creek/fork name - that IS the useful identifier, so keep it and
    // drop the redundant "Before Confluence with the main channel" that follows.
    return prefix
  }

  const confluenceMatch = rest.match(/Before Confluence with\s+(?:the\s+)?(.+)$/i)
  return confluenceMatch ? confluenceMatch[1]!.trim() : rest
}

// The trunk is everything that sits inline on the main channel: real gauge stations
// (mainstem), invisible confluence dots (junction), and a 'link' node with no connectsTo -
// a page-boundary card that's just the next stop on the channel, not a side attachment
// (e.g. upper-logan's "Continue to Lower Logan River" card).
function isTrunk(node: SchematicNodeData): boolean {
  return (
    node.kind === 'mainstem' || node.kind === 'junction' || (node.kind === 'link' && !node.connectsTo)
  )
}

// Everything else attaches to the trunk, or chains onto another attachment, via connectsTo.
function isBranch(node: SchematicNodeData): boolean {
  return node.kind === 'tributary' || node.kind === 'diversion' || (node.kind === 'link' && !!node.connectsTo)
}

interface Layout {
  col: number
  row: number
}

// Derives every node's (col, row) from kind + connectsTo + side + file order alone - this
// replaces hand-typed row/col numbers. Trunk nodes get a row equal to their position in the
// file. A branch node's row starts at the row of whatever it connectsTo (so a single lateral
// lines up flush with its attachment point) and stacks downward from there when that slot's
// taken - either by a chain ahead of it, or a sibling branch sharing the same attachment
// point and side.
function computeLayout(page: SchematicPageConfig): Map<string, Layout> {
  const nodesById = new Map(page.nodes.map((n) => [n.id, n]))
  const layout = new Map<string, Layout>()
  const occupied = new Set<string>()

  page.nodes.filter(isTrunk).forEach((n, i) => {
    const row = i + 1
    layout.set(n.id, { col: CENTER_COL, row })
    occupied.add(`${CENTER_COL}:${row}`)
  })

  // Multiple passes: a chain link can't be placed until whatever it connectsTo (a trunk node
  // or another branch node) already has a position. Each pass places anything whose anchor
  // is now known; repeats until nothing new gets placed. This handles a simple one-hop
  // branch and a multi-hop chain (a canal with several stops along it) the same way, without
  // needing to walk chains explicitly.
  const nextFreeRowByGroup = new Map<string, number>()
  let pending = page.nodes.filter(isBranch)
  let progressed = true
  while (pending.length && progressed) {
    progressed = false
    const stillPending: SchematicNodeData[] = []
    for (const node of pending) {
      const anchor = node.connectsTo ? nodesById.get(node.connectsTo) : undefined
      const anchorLayout = anchor ? layout.get(anchor.id) : undefined
      if (!anchorLayout) {
        stillPending.push(node)
        continue
      }

      const side = node.side ?? 'left'
      const col = side === 'left' ? CENTER_COL - 1 : CENTER_COL + 1
      const groupKey = `${anchor!.id}:${side}`
      let row = nextFreeRowByGroup.get(groupKey) ?? anchorLayout.row
      while (occupied.has(`${col}:${row}`)) row++

      layout.set(node.id, { col, row })
      occupied.add(`${col}:${row}`)
      nextFreeRowByGroup.set(groupKey, row + 1)
      progressed = true
    }
    pending = stillPending
  }

  // Anything left has a missing or cyclic connectsTo (malformed data) - place it rather than
  // silently dropping it from the diagram, so a bad edit is visible instead of invisible.
  pending.forEach((node) => {
    const side = node.side ?? 'left'
    const col = side === 'left' ? CENTER_COL - 1 : CENTER_COL + 1
    let row = 1
    while (occupied.has(`${col}:${row}`)) row++
    layout.set(node.id, { col, row })
    occupied.add(`${col}:${row}`)
  })

  return layout
}

const layoutByPage = computed(() => (page.value ? computeLayout(page.value) : new Map<string, Layout>()))

const vfNodes = computed<VFNode[]>(() => {
  if (!page.value) return []
  const layout = layoutByPage.value
  return page.value.nodes.map((node: SchematicNodeData): VFNode => {
    const pos = layout.get(node.id) ?? { col: CENTER_COL, row: 1 }
    const xOffset = node.kind === 'junction' ? (NODE_WIDTH - JUNCTION_WIDTH) / 2 : 0
    const isStationKind = node.kind === 'mainstem' || node.kind === 'tributary' || node.kind === 'diversion'
    const liveStation = isStationKind ? findLiveStation(node.name) : undefined
    return {
      id: node.id,
      type: 'schematic',
      position: { x: pos.col * COL_WIDTH + xOffset, y: pos.row * ROW_HEIGHT },
      data: {
        kind: node.kind,
        name: shortenForSchematic(node.name),
        label: node.label,
        description: node.description,
        colorGroup: node.colorGroup,
        terminus: node.terminus,
        linkTo: node.linkTo,
        liveStation: liveStation
          ? { ...liveStation, displayName: shortenForSchematic(liveStation.displayName) }
          : undefined,
      },
    }
  })
})

const STYLE_PRESETS = {
  main: { stroke: '#1e293b', strokeWidth: 4 },
  in: { stroke: '#475569', strokeWidth: 3 }, // tributary, or a link flowing toward its anchor
  out: { stroke: '#c2703d', strokeWidth: 3 }, // diversion flowing away from its anchor
} as const

const vfEdges = computed<VFEdge[]>(() => {
  if (!page.value) return []
  const layout = layoutByPage.value
  const nodesById = new Map(page.value.nodes.map((n) => [n.id, n]))
  const colOf = (id: string) => layout.get(id)?.col ?? CENTER_COL
  // Pick vertical (top/bottom) handles when both ends share a column — this is what keeps
  // the main channel a single straight line — or horizontal (left/right) handles when a
  // lateral tributary/diversion sits in a different column, so it branches cleanly out to
  // the side instead of routing through a boxy up/down S-curve.
  function makeEdge(
    id: string,
    source: SchematicNodeData,
    target: SchematicNodeData,
    preset: (typeof STYLE_PRESETS)[keyof typeof STYLE_PRESETS],
  ): VFEdge {
    const sourceCol = colOf(source.id)
    const targetCol = colOf(target.id)
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
      id,
      source: source.id,
      target: target.id,
      sourceHandle,
      targetHandle,
      type: edgeShape,
      style: { stroke: preset.stroke, strokeWidth: preset.strokeWidth },
      // Main-channel edges only get an arrowhead where they actually land on a station
      // card (mainstem) - into a junction's barely-visible dot, an arrowhead has nothing
      // to visually land on and just reads as noise. Lateral tributary/diversion
      // connectors always keep theirs, since each is its own short hop where direction is
      // the whole point.
      markerEnd:
        preset === STYLE_PRESETS.main && target.kind !== 'mainstem'
          ? undefined
          : { type: MarkerType.ArrowClosed, color: preset.stroke, width: 16, height: 16 },
    }
  }

  const edges: VFEdge[] = []

  const trunk = page.value.nodes.filter(isTrunk)
  for (let i = 0; i < trunk.length - 1; i++) {
    edges.push(makeEdge(`trunk-${trunk[i]!.id}-${trunk[i + 1]!.id}`, trunk[i]!, trunk[i + 1]!, STYLE_PRESETS.main))
  }

  page.value.nodes.forEach((node) => {
    if (!isBranch(node) || !node.connectsTo) return
    const target = nodesById.get(node.connectsTo)
    if (!target) return

    // 'diversion' flows away from its anchor, so the arrowhead needs to land on the
    // diversion, not the anchor — swap source/target rather than juggling markerStart vs
    // markerEnd, so every edge can just use markerEnd.
    const reversed = node.kind === 'diversion'
    const preset = reversed ? STYLE_PRESETS.out : STYLE_PRESETS.in
    edges.push(makeEdge(`branch-${node.id}`, reversed ? target : node, reversed ? node : target, preset))

    if (node.returnsTo) {
      const returnTarget = nodesById.get(node.returnsTo)
      if (returnTarget) edges.push(makeEdge(`return-${node.id}`, node, returnTarget, STYLE_PRESETS.in))
    }
  })

  return edges
})

// SchematicNode.vue can't receive props directly (Vue Flow controls what it passes to a
// custom node type), so a "view full system" button on any node reaches navigation via
// inject('navigateToSystem') instead. 'link'-kind nodes (a whole-card navigation link, no
// button) go through onNodeClick below instead, same as the rest of node-click handling.
provide('navigateToSystem', (slug: SchematicSlug) => router.push(`/schematic/${slug}`))

function onNodeClick({ node }: { node: VFNode }) {
  const data = node.data as VFNode['data'] & {
    kind: SchematicNodeData['kind']
    linkTo?: SchematicSlug
    liveStation?: Station
  }
  if (data.kind === 'link' && data.linkTo) {
    router.push(`/schematic/${data.linkTo}`)
    return
  }
  if (isCompact.value && data.liveStation) {
    // data.liveStation's displayName has been shortened for the on-canvas card - the detail
    // popup should show the real, full name, so look the station back up by id rather than
    // reuse that shortened copy.
    selectedStation.value =
      props.sites.find((site) => site.id === data.liveStation!.id) ?? data.liveStation
  }
}

function closeStation() {
  selectedStation.value = null
}

function updateIsCompact() {
  isCompact.value = window.innerWidth <= 768
}

onNodesInitialized(() => {
  fitView({ padding: 0.05 })
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
    <div class="system-tabs">
      <button
        v-for="system in SYSTEMS"
        :key="system.slug"
        type="button"
        class="system-tab"
        :class="{ active: system.slug === slug }"
        @click="router.push(`/schematic/${system.slug}`)"
      >
        {{ system.label }}
      </button>
    </div>

    <div class="header-row">
      <div v-if="!isCompact" class="header-block">
        <Droplets :size="22" class="title-icon" />
        <h2>{{ page?.title ?? 'Logan River System Schematic' }}</h2>
        <span v-if="page?.subtitle" class="subtitle-inline">{{ page.subtitle }}</span>
      </div>

      <p v-if="!loading && page" class="schematic-hint">
        <span class="hint-dot"></span>
        Scroll to zoom, drag to pan the schematic.
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

/* The sidebar's own schematic submenu already covers this navigation whenever it's
   permanently visible - only show these as a replacement once the sidebar collapses to a
   toggleable overlay, matching App.vue's own sidebar-collapse breakpoint. */
.system-tabs {
  display: none;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 0.6rem;
}

@media screen and (max-width: 992px) {
  .system-tabs {
    display: flex;
  }
}

.system-tab {
  padding: 6px 14px;
  border-radius: 9999px;
  border: 1px solid #cbd5e1;
  background: #ffffff;
  color: #334155;
  font-family: inherit;
  font-weight: 600;
  font-size: 0.8rem;
  cursor: pointer;
  transition:
    background 0.18s ease,
    color 0.18s ease,
    border-color 0.18s ease;
}

.system-tab:hover {
  background: #eff6ff;
  border-color: #bfdbfe;
}

.system-tab.active {
  background: #01377d;
  border-color: #01377d;
  color: #ffffff;
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

.schematic-hint {
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
