<script setup lang="ts">
/*
SchematicView.vue - Renders one schematic page (Upper Logan Canyon / Lower Logan River /
Blacksmith Fork River, selected by the `slug` route param) as a Vue Flow node/edge diagram,
driven entirely by the page's public/schematics/{slug}.json config. The config only says what
each node IS (kind + connectsTo + side) - this file derives where it goes and how it connects;
Vue Flow just owns node positioning, edge routing, and pan/zoom/touch once handed that.
*/
import { ref, computed, onMounted, onBeforeUnmount, watch, nextTick, markRaw, provide } from 'vue'
import { useRouter } from 'vue-router'
import {
  VueFlow,
  MarkerType,
  useVueFlow,
  type Node as VFNode,
  type Edge as VFEdge,
} from '@vue-flow/core'
import { Controls, ControlButton } from '@vue-flow/controls'
import { Droplets } from 'lucide-vue-next'
import '@vue-flow/core/dist/style.css'
import '@vue-flow/controls/dist/style.css'
import {
  type Station,
  type SchematicSlug,
  type SchematicPageConfig,
  type SchematicNode as SchematicNodeData,
  WATER_VARIBALES,
} from '../hydroService'
import SchematicNode from '../components/SchematicNode.vue'
import StationCard from '../components/StationCard.vue'

const props = defineProps<{
  slug: SchematicSlug
  sites: Station[]
  loading: boolean
  activeWaterways?: string[]
  // Manifest-ordered {slug, label} list from App.vue - drives the mobile tab bar below so
  // it reflects whichever schematic JSON files an adopter has configured, in manifest order.
  schematicNav: { slug: SchematicSlug; label: string }[]
  selectedVariable?: string
}>()

const router = useRouter()
const { fitView, onNodesInitialized } = useVueFlow()

const nodeTypes = { schematic: markRaw(SchematicNode) }

// Short display name for the currently selected data variable, e.g. "Discharge" - strips the
// parenthetical unit off WATER_VARIBALES' label, which is shown separately (see variableUnit).
const variableLabel = computed(() => {
  const match = WATER_VARIBALES.find((v) => v.id === props.selectedVariable)
  return match?.label.replace(/\s*\([^)]*\)\s*$/, '') ?? props.selectedVariable ?? ''
})

// Just the unit, e.g. "cfs" - pulled from the same parenthetical WATER_VARIBALES strips above.
const variableUnit = computed(() => {
  const match = WATER_VARIBALES.find((v) => v.id === props.selectedVariable)
  return match?.label.match(/\(([^)]+)\)/)?.[1] ?? ''
})

const page = ref<SchematicPageConfig | null>(null)
const pageLoadFailed = ref(false)
const selectedStation = ref<Station | null>(null)
const isCompact = ref(false)
const wideChains = ref(false)
// 992px, same as the sidebar's own collapse point - separate from isCompact (768px, used for
// the mobile station-sheet behavior) so the mobile system-select dropdown's visibility range
// is independent of that.
const isNarrowNav = ref(false)

// Must stay comfortably wider than the fixed node width set in SchematicNode.vue, so
// adjacent columns never overlap.
const COL_WIDTH = 520
const ROW_HEIGHT = 130

// Keep in sync with SchematicNode.vue's .schematic-node / .kind-junction widths.
const NODE_WIDTH = 360
const JUNCTION_WIDTH = 10

// The main channel's lane. A direct trunk attachment is always +/-1 from this. A multi-stop
// chain extends further out from there (see computeLayout's wideChains handling) rather than
// adding more fixed lanes.
const CENTER_COL = 2

// Above this viewport width, a multi-stop canal/chain branches out sideways (one column per
// stop) instead of stacking vertically - see computeLayout(). Below it (including all mobile
// widths), chains always stack vertically since there's no room to spread out.
const WIDE_CHAINS_BREAKPOINT = 1200

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

// Places one trunk node's own attached branches (its "forest": every branch node whose
// connectsTo chain leads back to this trunk node before reaching any other trunk node),
// starting at rootRow. A direct trunk attachment always stacks vertically below any sibling
// sharing the same attachment point and side, in both layouts. A CHAIN CONTINUATION (attaching
// to another branch card, not the trunk itself) also stacks vertically when wideChains is
// false - but when wideChains is true, it instead extends sideways from its immediate anchor,
// staying on the same row, so a multi-stop canal reads as a left-to-right row of cards instead
// of a tall stack (only on screens wide enough to have room for that - see
// WIDE_CHAINS_BREAKPOINT). Used twice by computeLayout(): once to measure how many rows a
// trunk node's forest needs (so trunk spacing can reserve enough room), and once for real,
// once that spacing is known.
function placeForest(
  nodesById: Map<string, SchematicNodeData>,
  rootId: string,
  rootRow: number,
  forest: SchematicNodeData[],
  layoutOut: Map<string, Layout>,
  wideChains: boolean,
) {
  const occupied = new Set<string>()
  const nextFreeRowByGroup = new Map<string, number>()

  // Multiple passes: a chain link can't be placed until whatever it connectsTo (the root, or
  // another branch node in this same forest) already has a position. Each pass places
  // anything whose anchor is now known; repeats until nothing new gets placed. This handles a
  // simple one-hop branch and a multi-hop chain (a canal with several stops along it) the same
  // way, without needing to walk chains explicitly.
  let pending = forest.slice()
  let progressed = true
  while (pending.length && progressed) {
    progressed = false
    const stillPending: SchematicNodeData[] = []
    for (const node of pending) {
      const anchor = node.connectsTo ? nodesById.get(node.connectsTo) : undefined
      if (!anchor) {
        stillPending.push(node)
        continue
      }
      const isRootAttachment = anchor.id === rootId
      const anchorPos = isRootAttachment ? { col: CENTER_COL, row: rootRow } : layoutOut.get(anchor.id)
      if (!anchorPos) {
        stillPending.push(node)
        continue
      }

      const side = node.side ?? 'left'
      const outward = side === 'left' ? -1 : 1
      let col: number
      let row: number

      if (wideChains && !isRootAttachment) {
        col = anchorPos.col + outward
        row = anchorPos.row
        while (occupied.has(`${col}:${row}`)) col += outward
      } else {
        col = CENTER_COL + outward
        const groupKey = `${anchor.id}:${side}`
        row = nextFreeRowByGroup.get(groupKey) ?? anchorPos.row
        while (occupied.has(`${col}:${row}`)) row++
        nextFreeRowByGroup.set(groupKey, row + 1)
      }

      layoutOut.set(node.id, { col, row })
      occupied.add(`${col}:${row}`)
      progressed = true
    }
    pending = stillPending
  }

  // Anything left has a missing or cyclic connectsTo (malformed data) - place it rather than
  // silently dropping it from the diagram, so a bad edit is visible instead of invisible.
  pending.forEach((node) => {
    const side = node.side ?? 'left'
    const col = side === 'left' ? CENTER_COL - 1 : CENTER_COL + 1
    let row = rootRow
    while (occupied.has(`${col}:${row}`)) row++
    layoutOut.set(node.id, { col, row })
    occupied.add(`${col}:${row}`)
  })
}

// Derives every node's (col, row) from kind + connectsTo + side + file order alone - this
// replaces hand-typed row/col numbers. Trunk row spacing is NOT fixed at 1 - each trunk node's
// gap to the next one is sized to fit whatever its own attached branches need (measured with a
// first "dry run" placement, below), so a long canal chain grows the diagram taller (or, in
// wideChains mode, wider - see placeForest) instead of spilling into the next junction's own
// branches. side/column is never adjusted to dodge a collision - it stays exactly what the
// JSON says (side is meant to reflect which bank of the river a station is really on), the
// diagram just expands to fit it.
function computeLayout(page: SchematicPageConfig, wideChains: boolean): Map<string, Layout> {
  const nodesById = new Map(page.nodes.map((n) => [n.id, n]))
  const trunkNodes = page.nodes.filter(isTrunk)
  const branchNodes = page.nodes.filter(isBranch)

  // Which trunk node "owns" a branch node - walks connectsTo up until it reaches a trunk node,
  // so a multi-hop chain is attributed to the trunk node at its root, not an intermediate link.
  function ownerTrunkOf(node: SchematicNodeData): string | undefined {
    let current: SchematicNodeData | undefined = node
    const seen = new Set<string>()
    while (current && !seen.has(current.id)) {
      seen.add(current.id)
      if (isTrunk(current)) return current.id
      current = current.connectsTo ? nodesById.get(current.connectsTo) : undefined
    }
    return undefined
  }

  const forestByTrunk = new Map<string, SchematicNodeData[]>()
  for (const node of branchNodes) {
    const owner = ownerTrunkOf(node)
    if (!owner) continue
    if (!forestByTrunk.has(owner)) forestByTrunk.set(owner, [])
    forestByTrunk.get(owner)!.push(node)
  }

  // Pass 1: assign trunk rows, growing the gap after each trunk node to fit whatever its own
  // forest needs (measured via a throwaway placement, starting that forest at a local row
  // equal to the trunk node's own row).
  let row = 1
  const layout = new Map<string, Layout>()
  trunkNodes.forEach((t) => {
    layout.set(t.id, { col: CENTER_COL, row })

    const forest = forestByTrunk.get(t.id) ?? []
    const probeLayout = new Map<string, Layout>()
    placeForest(nodesById, t.id, row, forest, probeLayout, wideChains)
    let maxRow = row
    probeLayout.forEach((pos) => {
      if (pos.row > maxRow) maxRow = pos.row
    })

    row = Math.max(row + 1, maxRow + 1)
  })

  // Pass 2: place every branch for real, now that trunk spacing has already reserved enough
  // room for it.
  trunkNodes.forEach((t) => {
    const forest = forestByTrunk.get(t.id) ?? []
    placeForest(nodesById, t.id, layout.get(t.id)!.row, forest, layout, wideChains)
  })

  // Anything whose connectsTo never resolved back to a trunk node (malformed/cyclic data) -
  // place it rather than silently dropping it from the diagram.
  branchNodes.forEach((node) => {
    if (layout.has(node.id)) return
    const side = node.side ?? 'left'
    const col = side === 'left' ? CENTER_COL - 1 : CENTER_COL + 1
    const occupied = new Set(Array.from(layout.values()).map((p) => `${p.col}:${p.row}`))
    let r = 1
    while (occupied.has(`${col}:${r}`)) r++
    layout.set(node.id, { col, row: r })
  })

  return layout
}

const layoutByPage = computed(() =>
  page.value ? computeLayout(page.value, wideChains.value) : new Map<string, Layout>(),
)

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

// The mobile system-select dropdown navigates on change, same destination as clicking a tab.
function onSystemSelect(event: Event) {
  const target = event.target as HTMLSelectElement
  router.push(`/schematic/${target.value}`)
}

function updateBreakpoints() {
  isCompact.value = window.innerWidth <= 768
  isNarrowNav.value = window.innerWidth <= 992
  wideChains.value = window.innerWidth >= WIDE_CHAINS_BREAKPOINT
}

// Re-fits the view to every node on the current page - shared by initial load, switching
// systems, the "Reset" control button, and window resize, so the diagram never keeps a stale
// pan/zoom from a different viewport size or a previously-viewed system.
function resetView() {
  fitView({ padding: 0.05 })
}

let resizeTimer: ReturnType<typeof setTimeout> | null = null

// Debounced resize handler - re-checks breakpoints and re-fits the view shortly after
// resizing stops, instead of on every tick.
function handleResize() {
  if (resizeTimer) clearTimeout(resizeTimer)
  resizeTimer = setTimeout(async () => {
    updateBreakpoints()
    await nextTick()
    resetView()
  }, 150)
}

onNodesInitialized(() => {
  resetView()
})

onMounted(() => {
  updateBreakpoints()
  window.addEventListener('resize', handleResize)
  loadPage()
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize)
  if (resizeTimer) clearTimeout(resizeTimer)
})

watch(
  () => props.slug,
  async () => {
    selectedStation.value = null
    await loadPage()
    // Wait for vfNodes/vfEdges (and Vue Flow's own internal node measurement) to catch up to
    // the new page before fitting - onNodesInitialized alone doesn't reliably re-fire on every
    // slug switch since the node *elements* persist across pages, only their data changes.
    await nextTick()
    resetView()
  },
)
</script>

<template>
  <div class="schematic-container">
    <!-- Mobile-only (see isNarrowNav) top row: a compact system-switcher dropdown (navigates
    on change, same destination as the sidebar's own schematic submenu) plus the interaction
    hint beside it - neither collapses, both stay visible the whole time. -->
    <div v-if="isNarrowNav" class="mobile-top-row">
      <select
        class="mobile-system-select"
        :value="slug"
        aria-label="Switch schematic system"
        @change="onSystemSelect"
      >
        <option v-for="system in schematicNav" :key="system.slug" :value="system.slug">
          {{ system.label }}
        </option>
      </select>

      <p v-if="!loading && page" class="schematic-hint">
        <span class="hint-dot"></span>
        Scroll to zoom, drag to pan the schematic.
      </p>

      <span v-if="variableLabel" class="variable-indicator">
        {{ variableLabel }} shown in {{ variableUnit }}
      </span>
    </div>

    <div class="header-row">
      <div v-if="!isCompact" class="header-block">
        <Droplets :size="22" class="title-icon" />
        <h2>{{ page?.title ?? 'Logan River System Schematic' }}</h2>
        <span v-if="page?.subtitle" class="subtitle-inline">{{ page.subtitle }}</span>
      </div>

      <div v-if="!isNarrowNav" class="header-right-group">
        <p v-if="!loading && page" class="schematic-hint">
          <span class="hint-dot"></span>
          Scroll to zoom, drag to pan the schematic.
        </p>

        <span v-if="variableLabel" class="variable-indicator">
          {{ variableLabel }} shown in {{ variableUnit }}
        </span>
      </div>
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
        :min-zoom="0.15"
        :max-zoom="1.5"
        :fit-view-on-init="true"
        @node-click="onNodeClick"
      >
        <!-- show-fit-view is off since the labeled ControlButton below replaces the stock
        icon-only fit-view button with the same action, rather than duplicating it. -->
        <Controls :show-interactive="false" :show-fit-view="false">
          <ControlButton title="Reset view" class="reset-control-btn" @click="resetView">
            Reset
          </ControlButton>
        </Controls>
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

/* Mobile-only top row (see isNarrowNav): a compact system-switcher dropdown next to the
   interaction hint - a dropdown rather than a row of tab buttons so it stays small, leaving
   room for the hint beside it. Neither collapses; the sidebar's own schematic submenu already
   covers this navigation whenever it's permanently visible. */
.mobile-top-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 0.6rem;
}

.mobile-system-select {
  flex: 0 1 auto;
  width: auto;
  max-width: 55%;
  padding: 10px 14px;
  border-radius: 10px;
  border: 1px solid #cbd5e1;
  background: #ffffff;
  color: #073763;
  font-family: inherit;
  font-weight: 700;
  font-size: 0.9rem;
  cursor: pointer;
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

.header-right-group {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

/* Page-level "Discharge shown in cfs" indicator, replacing what used to be repeated on every
   single station card (see SchematicNode.vue - the per-card unit text is hidden there now). */
.variable-indicator {
  font-size: 0.72rem;
  font-weight: 600;
  color: #64748b;
  font-family:
    system-ui,
    -apple-system,
    BlinkMacSystemFont,
    'Segoe UI',
    Roboto,
    sans-serif;
  white-space: nowrap;
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

/* Wider than Vue Flow's default square icon button (28px) so "Reset" reads as text, not a
   cramped icon - the rest of the control bar's zoom in/out/lock buttons are left untouched. */
.reset-control-btn {
  width: auto !important;
  padding: 0 10px !important;
  font-size: 0.7rem;
  font-weight: 700;
  font-family: inherit;
  letter-spacing: 0.02em;
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
