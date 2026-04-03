<template>
  <svg
    ref="svgEl"
    class="drawing-canvas w-full h-full bg-white cursor-crosshair"
    :viewBox="viewBox"
    @mousedown="onMouseDown"
    @mousemove="onMouseMove"
    @mouseup="onMouseUp"
    @mouseleave="onMouseUp"
    @dblclick="onDblClick"
    @wheel.prevent="onWheel"
    @contextmenu.prevent="onContextMenu"
  >
    <!-- Bonds -->
    <g class="bonds-layer">
      <g
        v-for="bond in mol.bonds"
        :key="bond.index"
        class="bond"
        @mousedown.stop="onBondMouseDown($event, bond)"
      >
        <BondRenderer :bond="bond" :atoms="mol.atoms" :selected="selectedBonds.has(bond.index)" />
      </g>
    </g>

    <!-- Bond being drawn (preview) -->
    <line
      v-if="drawPreview"
      :x1="drawPreview.x1"
      :y1="drawPreview.y1"
      :x2="drawPreview.x2"
      :y2="drawPreview.y2"
      class="stroke-chem-400 stroke-2 opacity-60 pointer-events-none"
      stroke-dasharray="4 2"
    />

    <!-- Atoms -->
    <g class="atoms-layer">
      <g
        v-for="atom in mol.atoms"
        :key="atom.index"
        :transform="`translate(${atom.x}, ${atom.y})`"
        class="atom"
        @mousedown.stop="onAtomMouseDown($event, atom)"
      >
        <AtomLabel
          :atom="atom"
          :implicit-h="mol.implicitH ? mol.implicitH(atom.index) : 0"
          :selected="selectedAtoms.has(atom.index)"
        />
      </g>
    </g>
  </svg>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import AtomLabel from './AtomLabel.vue'
import BondRenderer from './BondRenderer.vue'
import { BondOrder } from '@/lib/chemistry/bond.js'

const props = defineProps({
  mol:             { type: Object,  required: true },
  activeTool:      { type: String,  default: 'bond' },
  activeBondOrder: { type: Number,  default: 1 },
  activeAtom:      { type: String,  default: 'C' },
  gridSnap:        { type: Number,  default: 0 },
})

const emit = defineEmits([
  'atom-add',
  'atom-move',
  'atom-move-end',
  'atom-click',
  'bond-add',
  'bond-click',
  'erase-atom',
  'erase-bond',
  'selection-change',
])

const svgEl         = ref(null)
const selectedAtoms = ref(new Set())
const selectedBonds = ref(new Set())
const drawPreview   = ref(null)
const dragState     = ref(null)   // { type: 'atom', index, startX, startY }

// ── Viewport transform ─────────────────────────────────────────────────────
const panX      = ref(0)
const panY      = ref(0)
const zoom      = ref(1)
const VIEW_W    = 800
const VIEW_H    = 600

const viewBox = computed(() => {
  const w = VIEW_W / zoom.value
  const h = VIEW_H / zoom.value
  const x = -panX.value / zoom.value + (VIEW_W - w) / 2
  const y = -panY.value / zoom.value + (VIEW_H - h) / 2
  return `${-w / 2 - panX.value} ${-h / 2 - panY.value} ${w} ${h}`
})

// ── Coordinate helpers ─────────────────────────────────────────────────────

function svgCoords(event) {
  const svg = svgEl.value
  if (!svg) return { x: 0, y: 0 }
  const pt  = svg.createSVGPoint()
  pt.x = event.clientX
  pt.y = event.clientY
  const svgP = pt.matrixTransform(svg.getScreenCTM().inverse())
  return { x: svgP.x, y: svgP.y }
}

function snap(v) {
  if (!props.gridSnap) return v
  return Math.round(v / props.gridSnap) * props.gridSnap
}

function nearestAtom(x, y, radius = 15) {
  let best = null, bestDist = radius
  for (const atom of props.mol.atoms) {
    const d = Math.hypot(atom.x - x, atom.y - y)
    if (d < bestDist) { best = atom; bestDist = d }
  }
  return best
}

// ── Tool handlers ─────────────────────────────────────────────────────────

let bondFromAtom = null

function onMouseDown(event) {
  const { x, y } = svgCoords(event)
  const sx = snap(x), sy = snap(y)

  if (props.activeTool === 'bond') {
    const hit = nearestAtom(x, y)
    if (hit) {
      bondFromAtom = hit
      drawPreview.value = { x1: hit.x, y1: hit.y, x2: hit.x, y2: hit.y }
    } else {
      // Add a new atom then start bond from it
      emit('atom-add', { symbol: props.activeAtom, x: sx, y: sy })
      bondFromAtom = null
    }
  } else if (props.activeTool === 'select') {
    selectedAtoms.value = new Set()
    selectedBonds.value = new Set()
  }
}

function onMouseMove(event) {
  if (props.activeTool === 'bond' && bondFromAtom) {
    const { x, y } = svgCoords(event)
    drawPreview.value = { x1: bondFromAtom.x, y1: bondFromAtom.y, x2: x, y2: y }
  }
  if (dragState.value) {
    const { x, y } = svgCoords(event)
    emit('atom-move', { index: dragState.value.index, x: snap(x), y: snap(y) })
  }
}

function onMouseUp(event) {
  if (props.activeTool === 'bond' && bondFromAtom) {
    const { x, y } = svgCoords(event)
    const hit = nearestAtom(x, y)
    if (hit && hit.index !== bondFromAtom.index) {
      emit('bond-add', { beginAtom: bondFromAtom.index, endAtom: hit.index, order: props.activeBondOrder })
    } else if (!hit) {
      // Add new atom + bond
      emit('atom-add', { symbol: props.activeAtom, x: snap(x), y: snap(y), connectTo: bondFromAtom.index, bondOrder: props.activeBondOrder })
    }
    bondFromAtom  = null
    drawPreview.value = null
  }
  if (dragState.value) {
    const { x, y } = svgCoords(event)
    emit('atom-move-end', { index: dragState.value.index, x: snap(x), y: snap(y) })
    dragState.value = null
  }
}

function onDblClick(event) {
  const { x, y } = svgCoords(event)
  const hit = nearestAtom(x, y, 20)
  if (hit) emit('atom-click', { atom: hit, double: true })
}

function onAtomMouseDown(event, atom) {
  if (props.activeTool === 'select') {
    dragState.value = { type: 'atom', index: atom.index }
    selectedAtoms.value = new Set([atom.index])
  } else if (props.activeTool === 'erase') {
    emit('erase-atom', atom.index)
  } else if (props.activeTool === 'bond') {
    bondFromAtom = atom
    drawPreview.value = { x1: atom.x, y1: atom.y, x2: atom.x, y2: atom.y }
  }
}

function onBondMouseDown(event, bond) {
  if (props.activeTool === 'erase') {
    emit('erase-bond', bond.index)
  } else if (props.activeTool === 'bond') {
    emit('bond-click', bond)
  } else if (props.activeTool === 'select') {
    selectedBonds.value = new Set([bond.index])
  }
}

function onWheel(event) {
  const factor = event.deltaY < 0 ? 1.1 : 0.9
  zoom.value = Math.min(10, Math.max(0.1, zoom.value * factor))
}

function onContextMenu(event) {
  // Reserved for future context menu
}
</script>

<style scoped>
.drawing-canvas {
  touch-action: none;
  user-select: none;
}
.bond {
  cursor: pointer;
}
.atom {
  cursor: pointer;
}
</style>
