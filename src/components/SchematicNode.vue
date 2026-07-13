<script setup lang="ts">
/*
SchematicNode.vue - the single custom Vue Flow node component used by every card on a
schematic page (SchematicView.vue). Branches on data.nodeType instead of registering a
separate Vue Flow node type per kind, since all four kinds share the same handle setup.
*/
import { computed } from 'vue'
import { Position, Handle, type NodeProps } from '@vue-flow/core'
import { Droplets, ChevronRight } from 'lucide-vue-next'
import {
  type Station,
  type SchematicNodeType,
  WATERWAY_COLORS,
  SCHEMATIC_ACCENT_COLORS,
} from '../hydroService'
import StationCard from './StationCard.vue'

interface SchematicNodeData {
  nodeType: SchematicNodeType
  name: string
  label?: string
  description?: string
  colorGroup?: string
  liveStation?: Station
}

const props = defineProps<NodeProps<SchematicNodeData>>()

const bgColor = computed(() => {
  const group = props.data.colorGroup
  if (!group) return undefined
  const color = WATERWAY_COLORS[group] ?? SCHEMATIC_ACCENT_COLORS[group]
  return color ? color + '18' : undefined
})
</script>

<template>
  <div class="schematic-node" :class="`node-type-${data.nodeType}`">
    <!-- Every node gets handles on all four sides: the vertical pair (top/bottom) carries
    the main channel straight through, the horizontal pair (left/right) is what lets a
    lateral tributary/diversion branch cleanly out to the side instead of routing through
    an up/down S-curve. SchematicView picks which pair a given edge uses based on whether
    the two nodes it connects share a column (vertical) or not (horizontal). -->
    <Handle id="t-top" type="target" :position="Position.Top" :connectable="false" class="schematic-handle" />
    <Handle id="t-left" type="target" :position="Position.Left" :connectable="false" class="schematic-handle" />
    <Handle id="t-right" type="target" :position="Position.Right" :connectable="false" class="schematic-handle" />

    <div v-if="data.nodeType === 'station'" class="station-wrapper" :style="{ backgroundColor: bgColor }">
      <StationCard v-if="data.liveStation" :site="data.liveStation" compact />
      <div v-else class="node-card placeholder-card">
        <span class="node-title">{{ data.name }}</span>
      </div>
    </div>

    <div v-else-if="data.nodeType === 'junction'" class="junction-dot" />

    <div v-else-if="data.nodeType === 'terminus'" class="terminus-card">
      <Droplets :size="22" class="terminus-icon" />
      <div class="terminus-details">
        <h3>SYSTEM TERMINUS: {{ data.name }}</h3>
        <p v-if="data.description">{{ data.description }}</p>
      </div>
    </div>

    <button v-else-if="data.nodeType === 'extension'" type="button" class="extension-card">
      <span class="node-title">{{ data.label ?? data.name }}</span>
      <ChevronRight :size="16" />
    </button>

    <Handle id="s-bottom" type="source" :position="Position.Bottom" :connectable="false" class="schematic-handle" />
    <Handle id="s-left" type="source" :position="Position.Left" :connectable="false" class="schematic-handle" />
    <Handle id="s-right" type="source" :position="Position.Right" :connectable="false" class="schematic-handle" />
  </div>
</template>

<style scoped>
/* Every node type shares this exact width so that nodes in the same column line up on a
   shared center x — otherwise a variable-width card (long vs short station name) throws
   off the main channel's straight vertical line and every branch's connection point. */
.schematic-node {
  position: relative;
  width: 300px;
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
  border-radius: 14px;
  padding: 8px;
  width: 100%;
  box-sizing: border-box;
}

/* The compact StationCard is tuned for a dense sidebar list — bump its type scale
   up for the schematic canvas, where each card has much more room to itself. */
.station-wrapper :deep(.station-card.is-compact) {
  padding: 1.1rem 1.3rem;
}
.station-wrapper :deep(.location-name) {
  font-size: 1.2rem;
}
.station-wrapper :deep(.value) {
  font-size: 2.5rem;
}
.station-wrapper :deep(.unit) {
  font-size: 1.05rem;
}
.station-wrapper :deep(.timestamp) {
  font-size: 0.85rem;
}
.station-wrapper :deep(.status-badge) {
  font-size: 0.72rem;
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
  font-size: 1rem;
  font-weight: 700;
  color: #334155;
}

/* Narrower than the standard 280px node so its handles hug the small visible dot instead
   of sitting at the edges of an invisible 280px box. SchematicView.vue knows this width
   too and offsets the node's x position to keep its center aligned with everything else
   in its column. */
.node-type-junction {
  width: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* A confluence point on the main stem — deliberately solid and sized to read as "this is
   where the tributary/diversion arrow actually meets the trunk line", not just an
   invisible routing waypoint. */
.junction-dot {
  width: 20px;
  height: 20px;
  box-sizing: border-box;
  border-radius: 50%;
  background: #1e293b;
  border: 3px solid #ffffff;
  box-shadow: 0 0 0 1.5px #1e293b;
}

.terminus-card {
  width: 100%;
  background: #fff7ed;
  border: 2px solid #ea580c;
  border-radius: 12px;
  padding: 1.15rem 1.4rem;
  display: flex;
  align-items: center;
  gap: 14px;
  box-shadow: 0 4px 12px rgba(234, 88, 12, 0.08);
  box-sizing: border-box;
}

.terminus-icon {
  color: #ea580c;
  flex-shrink: 0;
}

.terminus-details h3 {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 800;
  color: #7c2d12;
}

.terminus-details p {
  margin: 4px 0 0 0;
  font-size: 0.85rem;
  color: #9a3412;
}

.extension-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  width: 100%;
  background: #eff6ff;
  border: 1.5px dashed #93c5fd;
  border-radius: 8px;
  padding: 16px 18px;
  min-height: 76px;
  box-sizing: border-box;
  cursor: pointer;
  color: #1d4ed8;
  font-family: inherit;
  transition: background 0.18s ease;
}

.extension-card:hover {
  background: #dbeafe;
}

.extension-card .node-title {
  color: #1d4ed8;
}
</style>
