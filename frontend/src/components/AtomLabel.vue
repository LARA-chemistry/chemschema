<template>
  <!-- Atom label rendered in an SVG group centered at (0,0) -->
  <g :class="['atom-label', { 'atom-label--selected': selected }]">
    <!-- Background circle for non-carbon or selected atoms -->
    <circle
      v-if="showLabel || selected"
      r="12"
      :class="selected ? 'fill-chem-100 stroke-chem-400' : 'fill-white'"
      stroke-width="1"
    />
    <!-- Atom symbol -->
    <text
      v-if="showLabel"
      dominant-baseline="middle"
      text-anchor="middle"
      :class="elementClass"
      class="text-[11px] font-semibold pointer-events-none select-none"
    >{{ displaySymbol }}</text>
    <!-- Charge superscript -->
    <text
      v-if="atom.charge !== 0"
      x="8" y="-8"
      dominant-baseline="middle"
      text-anchor="middle"
      class="text-[8px] pointer-events-none select-none fill-gray-700"
    >{{ chargeStr }}</text>
    <!-- Implicit H subscript -->
    <text
      v-if="showLabel && implicitH > 0"
      :x="hxOffset" y="10"
      dominant-baseline="middle"
      text-anchor="middle"
      class="text-[8px] pointer-events-none select-none fill-gray-500"
    >H{{ implicitH > 1 ? implicitH : '' }}</text>
    <!-- Isotope -->
    <text
      v-if="atom.isotope > 0"
      x="-8" y="-8"
      dominant-baseline="middle"
      text-anchor="middle"
      class="text-[8px] pointer-events-none select-none fill-gray-600"
    >{{ atom.isotope }}</text>
    <!-- Invisible hit area -->
    <circle r="14" class="fill-transparent stroke-none" />
  </g>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  atom:       { type: Object,  required: true },
  implicitH:  { type: Number,  default: 0 },
  selected:   { type: Boolean, default: false },
})

const ELEMENT_COLORS = {
  C:  'fill-gray-800',
  N:  'fill-blue-700',
  O:  'fill-red-600',
  S:  'fill-yellow-600',
  P:  'fill-orange-600',
  F:  'fill-green-600',
  Cl: 'fill-green-700',
  Br: 'fill-red-800',
  I:  'fill-purple-700',
  H:  'fill-gray-500',
}

const showLabel  = computed(() => props.atom.symbol !== 'C' || props.selected)
const displaySymbol = computed(() => props.atom.symbol)
const elementClass  = computed(() => ELEMENT_COLORS[props.atom.symbol] ?? 'fill-gray-700')

const chargeStr = computed(() => {
  const c = props.atom.charge
  if (c === 1) return '+'
  if (c === -1) return '−'
  if (c > 1) return `${c}+`
  if (c < -1) return `${Math.abs(c)}−`
  return ''
})

const hxOffset = computed(() => {
  // Offset H label to the right of the element symbol
  return props.atom.symbol.length > 1 ? 18 : 12
})
</script>
