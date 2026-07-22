<script setup lang="ts">
/*
SchematicNode.vue - the single custom Vue Flow node component used by every card on a
schematic page (SchematicView.vue). Branches on data.kind instead of registering a separate
Vue Flow node type per kind, since every kind shares the same handle setup.
*/
import { computed, inject } from 'vue'
import { Position, Handle, type NodeProps } from '@vue-flow/core'
import { ChevronRight } from 'lucide-vue-next'
import {
  type Station,
  type NodeKind,
  type SchematicSlug,
  WATERWAY_COLORS,
  SCHEMATIC_ACCENT_COLORS,
} from '../hydroService'
import StationCard from './StationCard.vue'

interface SchematicNodeData {
  kind: NodeKind
  name: string
  label?: string
  description?: string
  colorGroup?: string
  terminus?: boolean
  linkTo?: SchematicSlug
  liveStation?: Station
}

const props = defineProps<NodeProps<SchematicNodeData>>()

// Vue Flow controls what props a custom node type receives, so there's no normal prop
// channel from SchematicView down to here - it provide()s this instead.
const navigateToSystem = inject<(slug: SchematicSlug) => void>('navigateToSystem')

function onLinkClick() {
  if (props.data.linkTo) navigateToSystem?.(props.data.linkTo)
}

// Full-strength version of the same color used for bgColor's tint - drawn as the card's
// border so the border always matches whichever data source (USGS/DWRi/Logan River
// Observatory) this station's own colorGroup resolves to.
const borderColor = computed(() => {
  const group = resolvedColorGroup.value
  if (!group) return undefined
  return WATERWAY_COLORS[group] ?? SCHEMATIC_ACCENT_COLORS[group]
})

// Picks which colorGroup key actually drives this card's tint. Whenever a live station is
// matched, ITS OWN real data source (USGS / DWRi / HydroServer) wins over whatever colorGroup
// the schematic JSON happens to have set - so cards always color-match their true data source
// even if the JSON's colorGroup is stale, inconsistent, or mid-edit (no JSON change needed to
// fix a wrong tint). Only falls back to the JSON's own colorGroup for cards with no live
// station attached (junction/link/placeholder cards), since there's nothing to derive from
// there.
const resolvedColorGroup = computed(() => {
  const station = props.data.liveStation
  if (station) {
    if (station.isUSGS) return 'USGS'
    if (station.isDWRi) return 'DWRi'
    return station.tributary ?? props.data.colorGroup
  }
  return props.data.colorGroup
})
</script>

<template>
  <div class="schematic-node" :class="`kind-${data.kind}`">
    <!-- Every node gets handles on all four sides: the vertical pair (top/bottom) carries
    the main channel straight through, the horizontal pair (left/right) is what lets a
    lateral tributary/diversion branch cleanly out to the side instead of routing through
    an up/down S-curve. SchematicView picks which pair a given edge uses based on whether
    the two nodes it connects share a column (vertical) or not (horizontal). -->
    <Handle
      id="t-top"
      type="target"
      :position="Position.Top"
      :connectable="false"
      class="schematic-handle"
    />
    <Handle
      id="t-left"
      type="target"
      :position="Position.Left"
      :connectable="false"
      class="schematic-handle"
    />
    <Handle
      id="t-right"
      type="target"
      :position="Position.Right"
      :connectable="false"
      class="schematic-handle"
    />

    <div v-if="data.kind === 'junction'" class="junction-dot" />

    <!-- A pure navigation card (no live data of its own) - the whole card is the click
    target, handled by SchematicView's onNodeClick rather than inject, same as every other
    node-click case. -->
    <button v-else-if="data.kind === 'link'" type="button" class="link-card">
      <span class="node-title">{{ data.label ?? data.name }}</span>
    </button>

    <template v-else>
      <div v-if="data.terminus" class="terminus-card">
        <h3>{{ data.name }}</h3>
      </div>

      <div v-else class="station-wrapper" :style="{ borderColor: borderColor }">
        <StationCard v-if="data.liveStation" :site="data.liveStation" compact />
        <div v-else class="node-card placeholder-card">
          <span class="node-title">{{ data.name }}</span>
        </div>
      </div>
      <!-- A real station that also happens to sit at a page boundary (e.g. Water Lab
      linking into Lower Logan) gets this extra button instead of being its own 'link'
      card. @click.stop keeps it from also triggering onNodeClick's mobile station-sheet
      tap handling on the same click. -->
      <button v-if="data.linkTo" type="button" class="node-link-btn" @click.stop="onLinkClick">
        <span>{{ data.label ?? 'View full system' }}</span>
        <ChevronRight :size="14" />
      </button>
    </template>

    <Handle
      id="s-bottom"
      type="source"
      :position="Position.Bottom"
      :connectable="false"
      class="schematic-handle"
    />
    <Handle
      id="s-left"
      type="source"
      :position="Position.Left"
      :connectable="false"
      class="schematic-handle"
    />
    <Handle
      id="s-right"
      type="source"
      :position="Position.Right"
      :connectable="false"
      class="schematic-handle"
    />
  </div>
</template>

<style scoped>
/* Every node type shares this exact width so that nodes in the same column line up on a
   shared center x — otherwise a variable-width card (long vs short station name) throws
   off the main channel's straight vertical line and every branch's connection point. */
.schematic-node {
  position: relative;
  width: 380px;
  box-sizing: border-box;
}

.schematic-handle {
  opacity: 0;
  pointer-events: none;
}

/* Vue Flow's default handle CSS offsets each handle a few px outside the node border,
   which leaves a visible gap between an edge's end and the card it's supposedly
   connecting to. Pin them flush to the border instead. */
.schematic-node :deep(.vue-flow__handle) {
  width: 1px;
  height: 1px;
  min-width: 1px;
  min-height: 1px;
  border: none;
  background: transparent;
}
.schematic-node :deep(.vue-flow__handle-top) {
  top: 0;
}
.schematic-node :deep(.vue-flow__handle-bottom) {
  bottom: 0;
}
/* Vue Flow centers left/right handles at 50% of each node's OWN height by default — a
   tall station card and a tiny junction dot then meet at very different Y offsets even
   when their rows line up, producing a small dogleg instead of a straight connector.
   Pin every node type to the same fixed offset from its own top edge instead, matching
   roughly where a junction dot's center sits, so aligned rows always meet flush. */
.schematic-node :deep(.vue-flow__handle-left) {
  left: 0;
  top: 13px;
  transform: none;
}
.schematic-node :deep(.vue-flow__handle-right) {
  right: 0;
  top: 13px;
  transform: none;
}

.station-wrapper {
  border-radius: 20px;
  padding: 0;
  width: 100%;
  box-sizing: border-box;
  border: 7px solid transparent;
  overflow: hidden;
}

/* Name/value sized up from StationCard's native .is-compact sizing (0.9rem/1.6rem) so the
   text fills more of the card's fixed 360px width instead of sitting small within it. */
.station-wrapper :deep(.station-card.is-compact) {
  position: relative;
  padding: 0.35rem 0.5rem;
}
.station-wrapper :deep(.card-header) {
  margin-bottom: 0.1rem;
  margin-top: 0;
}
.station-wrapper :deep(.title-with-link) {
  min-width: 0;
}
.station-wrapper :deep(.metric-row) {
  margin-bottom: 0.05rem;
}
.station-wrapper :deep(.location-name) {
  font-size: 2rem !important;
  line-height: 1.1 !important;
  margin: 0;
  white-space: normal;
  overflow-wrap: break-word;
}
.station-wrapper :deep(.value) {
  font-size: clamp(1.8rem, 5vw, 2.4rem) !important;
}
.station-wrapper :deep(.timestamp) {
  display: none;
}
.station-wrapper :deep(.status-badge) {
  display: none;
}
/* Value snaps to the card's right edge, leaving the left side to the name above it - the unit
   is hidden here since SchematicView.vue now shows it once for the whole page ("Discharge
   shown in cfs") instead of repeating it on every single card. */
.station-wrapper :deep(.value-row) {
  display: flex;
  justify-content: flex-end;
  align-items: baseline;
}
.station-wrapper :deep(.unit) {
  display: none;
}
/* Hyperlink icon moves out of the header's inline flow to the card's top-right corner,
   directly above the right-aligned value below it. card-header/title-with-link get right
   padding reserved so a long name wraps before reaching under the icon instead of overlapping. */
.station-wrapper :deep(.external-site-link) {
  position: absolute;
  top: 4px;
  right: 4px;
  margin-left: 0;
  font-size: 0.8rem;
}
.station-wrapper :deep(.link-svg) {
  width: 1.5rem !important;
  height: 1.5rem !important;
}
.station-wrapper :deep(.card-header),
.station-wrapper :deep(.title-with-link) {
  padding-right: 22px;
}

.node-card {
  background: #ffffff;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  padding: 16px;
  min-height: 76px;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02);
  box-sizing: border-box;
}

.node-title {
  font-size: 2rem;
  font-weight: 700;
  color: #334155;
}

/* Narrower than the standard 280px node so its handles hug the small visible dot instead
   of sitting at the edges of an invisible 280px box. SchematicView.vue knows this width
   too and offsets the node's x position to keep its center aligned with everything else
   in its column. */
.kind-junction {
  width: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Confluence points are deliberately de-emphasized to near-invisible - just enough of a
   mark that a branch's connector line has somewhere to visibly terminate, not a focal
   point competing with the station cards. */
.junction-dot {
  width: 6px;
  height: 6px;
  box-sizing: border-box;
  border-radius: 50%;
  background: #1e293b;
  opacity: 0.35;
}

.terminus-card {
  width: 100%;
  background: #fff7ed;
  border: 2px solid #ea580c;
  border-radius: 12px;
  padding: 2rem 1.4rem;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 12px rgba(234, 88, 12, 0.08);
  box-sizing: border-box;
}

.terminus-card h3 {
  margin: 0;
  font-size: 2rem;
  font-weight: 800;
  color: #7c2d12;
  text-align: center;
}

.link-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
  background: #eff6ff;
  border: 1.5px dashed #93c5fd;
  border-radius: 10px;
  padding: 1.5rem 1.4rem;
  min-height: 80px;
  box-sizing: border-box;
  cursor: pointer;
  color: #1d4ed8;
  font-family: inherit;
  transition: background 0.18s ease;
}

.link-card:hover {
  background: #dbeafe;
}

.link-card .node-title {
  font-size: 2rem;
  color: #1d4ed8;
}

/* The secondary "view full system" button that can appear below a normal station/terminus
   card - smaller and less prominent than .link-card, since here it's a bonus action on a
   card that already has its own primary content, not the entire point of the card. */
.node-link-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  width: 100%;
  margin-top: 8px;
  padding: 8px 12px;
  background: #eff6ff;
  border: 1px solid #bfdbfe;
  border-radius: 8px;
  box-sizing: border-box;
  cursor: pointer;
  color: #1d4ed8;
  font-size: 0.8rem;
  font-weight: 700;
  font-family: inherit;
  transition: background 0.18s ease;
}

.node-link-btn:hover {
  background: #dbeafe;
}
</style>
