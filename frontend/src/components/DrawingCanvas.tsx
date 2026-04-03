import { defineComponent, ref, computed, onMounted } from 'vue'
import AtomLabel from './AtomLabel'
import BondRenderer from './BondRenderer'
import { BondOrder } from '@/lib/chemistry/bond'
import type { Molecule } from '@/lib/chemistry/molecule'
import type { Atom } from '@/lib/chemistry/atom'
import type { Bond } from '@/lib/chemistry/bond'

interface DrawPreview { x1: number; y1: number; x2: number; y2: number }
interface DragState   { type: 'atom'; index: number }

export default defineComponent({
  name: 'DrawingCanvas',
  props: {
    mol:             { type: Object as () => Molecule, required: true },
    activeTool:      { type: String,  default: 'bond' },
    activeBondOrder: { type: Number,  default: 1 },
    activeAtom:      { type: String,  default: 'C' },
    gridSnap:        { type: Number,  default: 0 },
  },
  emits: [
    'atom-add',
    'atom-move',
    'atom-move-end',
    'atom-click',
    'bond-add',
    'bond-click',
    'erase-atom',
    'erase-bond',
    'selection-change',
  ],
  setup(props, { emit }) {
    const svgEl         = ref<SVGSVGElement | null>(null)
    const selectedAtoms = ref(new Set<number>())
    const selectedBonds = ref(new Set<number>())
    const drawPreview   = ref<DrawPreview | null>(null)
    const dragState     = ref<DragState | null>(null)

    const panX   = ref(0)
    const panY   = ref(0)
    const zoom   = ref(1)
    const VIEW_W = 800
    const VIEW_H = 600

    const viewBox = computed(() => {
      const w = VIEW_W / zoom.value
      const h = VIEW_H / zoom.value
      return `${-w / 2 - panX.value} ${-h / 2 - panY.value} ${w} ${h}`
    })

    function svgCoords(event: MouseEvent): { x: number; y: number } {
      const svg = svgEl.value
      if (!svg) return { x: 0, y: 0 }
      const pt  = svg.createSVGPoint()
      pt.x = event.clientX
      pt.y = event.clientY
      const svgP = pt.matrixTransform(svg.getScreenCTM()!.inverse())
      return { x: svgP.x, y: svgP.y }
    }

    function snap(v: number): number {
      if (!props.gridSnap) return v
      return Math.round(v / props.gridSnap) * props.gridSnap
    }

    function nearestAtom(x: number, y: number, radius = 15): Atom | null {
      let best: Atom | null = null
      let bestDist = radius
      for (const atom of props.mol.atoms) {
        const d = Math.hypot(atom.x - x, atom.y - y)
        if (d < bestDist) { best = atom; bestDist = d }
      }
      return best
    }

    let bondFromAtom: Atom | null = null

    function onMouseDown(event: MouseEvent) {
      const { x, y } = svgCoords(event)
      const sx = snap(x), sy = snap(y)

      if (props.activeTool === 'bond') {
        const hit = nearestAtom(x, y)
        if (hit) {
          bondFromAtom = hit
          drawPreview.value = { x1: hit.x, y1: hit.y, x2: hit.x, y2: hit.y }
        } else {
          emit('atom-add', { symbol: props.activeAtom, x: sx, y: sy })
          bondFromAtom = null
        }
      } else if (props.activeTool === 'select') {
        selectedAtoms.value = new Set()
        selectedBonds.value = new Set()
      }
    }

    function onMouseMove(event: MouseEvent) {
      if (props.activeTool === 'bond' && bondFromAtom) {
        const { x, y } = svgCoords(event)
        drawPreview.value = { x1: bondFromAtom.x, y1: bondFromAtom.y, x2: x, y2: y }
      }
      if (dragState.value) {
        const { x, y } = svgCoords(event)
        emit('atom-move', { index: dragState.value.index, x: snap(x), y: snap(y) })
      }
    }

    function onMouseUp(event: MouseEvent) {
      if (props.activeTool === 'bond' && bondFromAtom) {
        const { x, y } = svgCoords(event)
        const hit = nearestAtom(x, y)
        if (hit && hit.index !== bondFromAtom.index) {
          emit('bond-add', { beginAtom: bondFromAtom.index, endAtom: hit.index, order: props.activeBondOrder })
        } else if (!hit) {
          emit('atom-add', { symbol: props.activeAtom, x: snap(x), y: snap(y), connectTo: bondFromAtom.index, bondOrder: props.activeBondOrder })
        }
        bondFromAtom = null
        drawPreview.value = null
      }
      if (dragState.value) {
        const { x, y } = svgCoords(event)
        emit('atom-move-end', { index: dragState.value.index, x: snap(x), y: snap(y) })
        dragState.value = null
      }
    }

    function onDblClick(event: MouseEvent) {
      const { x, y } = svgCoords(event)
      const hit = nearestAtom(x, y, 20)
      if (hit) emit('atom-click', { atom: hit, double: true })
    }

    function onAtomMouseDown(event: MouseEvent, atom: Atom) {
      event.stopPropagation()
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

    function onBondMouseDown(event: MouseEvent, bond: Bond) {
      event.stopPropagation()
      if (props.activeTool === 'erase') {
        emit('erase-bond', bond.index)
      } else if (props.activeTool === 'bond') {
        emit('bond-click', bond)
      } else if (props.activeTool === 'select') {
        selectedBonds.value = new Set([bond.index])
      }
    }

    function onWheel(event: WheelEvent) {
      event.preventDefault()
      const factor = event.deltaY < 0 ? 1.1 : 0.9
      zoom.value = Math.min(10, Math.max(0.1, zoom.value * factor))
    }

    function onContextMenu(event: MouseEvent) {
      event.preventDefault()
    }

    return () => (
      <svg
        ref={svgEl}
        class="drawing-canvas w-full h-full bg-white cursor-crosshair"
        viewBox={viewBox.value}
        style={{ touchAction: 'none', userSelect: 'none' }}
        onMousedown={onMouseDown}
        onMousemove={onMouseMove}
        onMouseup={onMouseUp}
        onMouseleave={onMouseUp}
        onDblclick={onDblClick}
        onWheel={onWheel}
        onContextmenu={onContextMenu}
      >
        {/* Bonds */}
        <g class="bonds-layer">
          {props.mol.bonds.map((bond) => (
            <g
              key={bond.index}
              class="bond"
              style={{ cursor: 'pointer' }}
              onMousedown={(e: MouseEvent) => onBondMouseDown(e, bond)}
            >
              <BondRenderer bond={bond} atoms={props.mol.atoms} selected={selectedBonds.value.has(bond.index)} />
            </g>
          ))}
        </g>

        {/* Bond preview */}
        {drawPreview.value && (
          <line
            x1={drawPreview.value.x1}
            y1={drawPreview.value.y1}
            x2={drawPreview.value.x2}
            y2={drawPreview.value.y2}
            class="stroke-chem-400 stroke-2 opacity-60 pointer-events-none"
            stroke-dasharray="4 2"
          />
        )}

        {/* Atoms */}
        <g class="atoms-layer">
          {props.mol.atoms.map((atom) => (
            <g
              key={atom.index}
              transform={`translate(${atom.x}, ${atom.y})`}
              class="atom"
              style={{ cursor: 'pointer' }}
              onMousedown={(e: MouseEvent) => onAtomMouseDown(e, atom)}
            >
              <AtomLabel
                atom={atom}
                implicitH={props.mol.implicitH ? props.mol.implicitH(atom.index) : 0}
                selected={selectedAtoms.value.has(atom.index)}
              />
            </g>
          ))}
        </g>
      </svg>
    )
  }
})
