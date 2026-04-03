import { defineComponent, computed } from 'vue'

const OFFSET = 3

export default defineComponent({
  name: 'BondRenderer',
  props: {
    bond:     { type: Object as () => { order: number; stereo: number; beginAtom: number; endAtom: number; index: number }, required: true },
    atoms:    { type: Array as () => Array<{ x: number; y: number }>, required: true },
    selected: { type: Boolean, default: false },
  },
  setup(props) {
    const a1 = computed(() => props.atoms[props.bond.beginAtom] ?? { x: 0, y: 0 })
    const a2 = computed(() => props.atoms[props.bond.endAtom]   ?? { x: 0, y: 0 })

    const lineClass = computed(() =>
      props.selected ? 'stroke-chem-400 stroke-2' : 'stroke-gray-800 stroke-2'
    )

    const perp = computed(() => {
      const dx  = a2.value.x - a1.value.x
      const dy  = a2.value.y - a1.value.y
      const len = Math.hypot(dx, dy) || 1
      return { x: -dy / len, y: dx / len }
    })

    const baseLineProps = computed(() => ({
      x1: a1.value.x,
      y1: a1.value.y,
      x2: a2.value.x,
      y2: a2.value.y,
    }))

    function lineProps(offset: number) {
      const p = perp.value
      return {
        x1: a1.value.x + p.x * offset,
        y1: a1.value.y + p.y * offset,
        x2: a2.value.x + p.x * offset,
        y2: a2.value.y + p.y * offset,
      }
    }

    const wedgePoints = computed(() => {
      const p  = perp.value
      const x1 = a1.value.x, y1 = a1.value.y
      const x2 = a2.value.x, y2 = a2.value.y
      const hw = 4
      return [
        `${x1},${y1}`,
        `${x2 + p.x * hw},${y2 + p.y * hw}`,
        `${x2 - p.x * hw},${y2 - p.y * hw}`,
      ].join(' ')
    })

    const dashLines = computed(() => {
      const n  = 5
      const p  = perp.value
      const x1 = a1.value.x, y1 = a1.value.y
      const x2 = a2.value.x, y2 = a2.value.y
      const lines: { x1: number; y1: number; x2: number; y2: number }[] = []
      for (let i = 0; i <= n; i++) {
        const t  = i / n
        const cx = x1 + (x2 - x1) * t
        const cy = y1 + (y2 - y1) * t
        const hw = 1 + (i / n) * 3
        lines.push({ x1: cx - p.x * hw, y1: cy - p.y * hw, x2: cx + p.x * hw, y2: cy + p.y * hw })
      }
      return lines
    })

    return () => {
      const bond = props.bond
      return (
        <g>
          {bond.order === 3 && (
            <>
              <line {...lineProps(-OFFSET)} class={lineClass.value} />
              <line {...lineProps(0)}       class={lineClass.value} />
              <line {...lineProps(+OFFSET)} class={lineClass.value} />
            </>
          )}
          {bond.order === 2 && (
            <>
              <line {...lineProps(-OFFSET / 2)} class={lineClass.value} />
              <line {...lineProps(+OFFSET / 2)} class={lineClass.value} />
            </>
          )}
          {bond.order === 4 && (
            <>
              <line {...lineProps(0)}       class={lineClass.value} />
              <line {...lineProps(+OFFSET)} class={lineClass.value} stroke-dasharray="3 2" />
            </>
          )}
          {bond.stereo === 1 && bond.order !== 3 && bond.order !== 2 && bond.order !== 4 && (
            <polygon points={wedgePoints.value} class={props.selected ? 'fill-chem-400' : 'fill-gray-800'} />
          )}
          {bond.stereo === 6 && bond.order !== 3 && bond.order !== 2 && bond.order !== 4 && (
            <>
              {dashLines.value.map((dash, i) => (
                <line key={i} {...dash} class={lineClass.value} />
              ))}
            </>
          )}
          {bond.order === 1 && bond.stereo !== 1 && bond.stereo !== 6 && (
            <line {...lineProps(0)} class={lineClass.value} />
          )}
          <line {...baseLineProps.value} stroke-width={12} class="stroke-transparent" />
        </g>
      )
    }
  }
})
