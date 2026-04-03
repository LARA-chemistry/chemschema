<template>
  <g>
    <!-- Triple bond -->
    <template v-if="bond.order === 3">
      <line v-bind="lineProps(-OFFSET)" :class="lineClass" />
      <line v-bind="lineProps(0)"       :class="lineClass" />
      <line v-bind="lineProps(+OFFSET)" :class="lineClass" />
    </template>
    <!-- Double bond -->
    <template v-else-if="bond.order === 2">
      <line v-bind="lineProps(-OFFSET / 2)" :class="lineClass" />
      <line v-bind="lineProps(+OFFSET / 2)" :class="lineClass" />
    </template>
    <!-- Aromatic bond (dashed second line) -->
    <template v-else-if="bond.order === 4">
      <line v-bind="lineProps(0)"           :class="lineClass" />
      <line v-bind="lineProps(+OFFSET)"     :class="lineClass" stroke-dasharray="3 2" />
    </template>
    <!-- Wedge (up) -->
    <template v-else-if="bond.stereo === 1">
      <polygon :points="wedgePoints" :class="selected ? 'fill-chem-400' : 'fill-gray-800'" />
    </template>
    <!-- Dash (down) -->
    <template v-else-if="bond.stereo === 6">
      <line
        v-for="(dash, i) in dashLines"
        :key="i"
        v-bind="dash"
        :class="lineClass"
      />
    </template>
    <!-- Default single bond -->
    <template v-else>
      <line v-bind="lineProps(0)" :class="lineClass" />
    </template>
    <!-- Invisible wide hit area -->
    <line v-bind="baseLineProps" stroke-width="12" class="stroke-transparent" />
  </g>
</template>

<script setup>
import { computed } from 'vue'

const OFFSET = 3   // px offset for double/triple bonds

const props = defineProps({
  bond:     { type: Object,  required: true },
  atoms:    { type: Array,   required: true },
  selected: { type: Boolean, default: false },
})

const a1 = computed(() => props.atoms[props.bond.beginAtom] ?? { x: 0, y: 0 })
const a2 = computed(() => props.atoms[props.bond.endAtom]   ?? { x: 0, y: 0 })

const lineClass = computed(() =>
  props.selected
    ? 'stroke-chem-400 stroke-2'
    : 'stroke-gray-800 stroke-2',
)

// Perpendicular offset vector
const perp = computed(() => {
  const dx = a2.value.x - a1.value.x
  const dy = a2.value.y - a1.value.y
  const len = Math.hypot(dx, dy) || 1
  return { x: -dy / len, y: dx / len }
})

const baseLineProps = computed(() => ({
  x1: a1.value.x,
  y1: a1.value.y,
  x2: a2.value.x,
  y2: a2.value.y,
}))

function lineProps(offset) {
  const p = perp.value
  return {
    x1: a1.value.x + p.x * offset,
    y1: a1.value.y + p.y * offset,
    x2: a2.value.x + p.x * offset,
    y2: a2.value.y + p.y * offset,
  }
}

// Wedge bond polygon (solid triangle from a1 to a2)
const wedgePoints = computed(() => {
  const p   = perp.value
  const x1  = a1.value.x, y1 = a1.value.y
  const x2  = a2.value.x, y2 = a2.value.y
  const hw  = 4  // half-width at a2
  return [
    `${x1},${y1}`,
    `${x2 + p.x * hw},${y2 + p.y * hw}`,
    `${x2 - p.x * hw},${y2 - p.y * hw}`,
  ].join(' ')
})

// Dash bond lines (5 dashes from a1 to a2)
const dashLines = computed(() => {
  const n    = 5
  const p    = perp.value
  const x1   = a1.value.x, y1 = a1.value.y
  const x2   = a2.value.x, y2 = a2.value.y
  const lines = []
  for (let i = 0; i <= n; i++) {
    const t   = i / n
    const cx  = x1 + (x2 - x1) * t
    const cy  = y1 + (y2 - y1) * t
    const hw  = 1 + (i / n) * 3
    lines.push({ x1: cx - p.x * hw, y1: cy - p.y * hw, x2: cx + p.x * hw, y2: cy + p.y * hw })
  }
  return lines
})
</script>
