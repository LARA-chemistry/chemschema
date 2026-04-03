import { defineComponent, computed } from 'vue'

const ELEMENT_COLORS: Record<string, string> = {
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

export default defineComponent({
  name: 'AtomLabel',
  props: {
    atom:      { type: Object as () => { symbol: string; charge: number; isotope: number; implicitH: number }, required: true },
    implicitH: { type: Number, default: 0 },
    selected:  { type: Boolean, default: false },
  },
  setup(props) {
    const showLabel     = computed(() => props.atom.symbol !== 'C' || props.selected)
    const displaySymbol = computed(() => props.atom.symbol)
    const elementClass  = computed(() => ELEMENT_COLORS[props.atom.symbol] ?? 'fill-gray-700')

    const chargeStr = computed(() => {
      const c = props.atom.charge
      if (c === 1)   return '+'
      if (c === -1)  return '−'
      if (c > 1)     return `${c}+`
      if (c < -1)    return `${Math.abs(c)}−`
      return ''
    })

    const hxOffset = computed(() => props.atom.symbol.length > 1 ? 18 : 12)

    return () => (
      <g class={['atom-label', { 'atom-label--selected': props.selected }]}>
        {(showLabel.value || props.selected) && (
          <circle
            r={12}
            class={props.selected ? 'fill-chem-100 stroke-chem-400' : 'fill-white'}
            stroke-width={1}
          />
        )}
        {showLabel.value && (
          <text
            dominant-baseline="middle"
            text-anchor="middle"
            class={`${elementClass.value} text-[11px] font-semibold pointer-events-none select-none`}
          >
            {displaySymbol.value}
          </text>
        )}
        {props.atom.charge !== 0 && (
          <text
            x={8} y={-8}
            dominant-baseline="middle"
            text-anchor="middle"
            class="text-[8px] pointer-events-none select-none fill-gray-700"
          >
            {chargeStr.value}
          </text>
        )}
        {showLabel.value && props.implicitH > 0 && (
          <text
            x={hxOffset.value} y={10}
            dominant-baseline="middle"
            text-anchor="middle"
            class="text-[8px] pointer-events-none select-none fill-gray-500"
          >
            H{props.implicitH > 1 ? props.implicitH : ''}
          </text>
        )}
        {props.atom.isotope > 0 && (
          <text
            x={-8} y={-8}
            dominant-baseline="middle"
            text-anchor="middle"
            class="text-[8px] pointer-events-none select-none fill-gray-600"
          >
            {props.atom.isotope}
          </text>
        )}
        <circle r={14} class="fill-transparent stroke-none" />
      </g>
    )
  }
})
