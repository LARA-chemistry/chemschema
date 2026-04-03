import { defineComponent } from 'vue'

interface DrawTool {
  id: string
  label: string
  icon: string
}

interface BondType {
  id: string
  label: string
  order: number
}

const drawTools: DrawTool[] = [
  { id: 'select', label: 'Select / Move', icon: '<path d="M6.672 1.911a1 1 0 10-1.932.518l.259.966a1 1 0 001.932-.518l-.26-.966zM2.429 4.74a1 1 0 10-.517 1.932l.966.259a1 1 0 00.517-1.932l-.966-.26zm8.814-.569a1 1 0 00-1.415-1.414l-.707.707a1 1 0 101.415 1.415l.707-.708zm-7.071 7.072l.707-.707A1 1 0 003.465 9.12l-.708.707a1 1 0 001.415 1.415zm3.2-5.171a1 1 0 00-1.3 1.3l4 10a1 1 0 001.823.075l1.38-2.759 3.018 3.02a1 1 0 001.414-1.415l-3.019-3.02 2.76-1.379a1 1 0 00-.076-1.822l-10-4z"/>' },
  { id: 'bond',   label: 'Draw Bond',     icon: '<path fill-rule="evenodd" d="M3 4a1 1 0 011-1h4a1 1 0 010 2H6.414l2.293 2.293a1 1 0 11-1.414 1.414L5 6.414V8a1 1 0 01-2 0V4zm9 1a1 1 0 010-2h4a1 1 0 011 1v4a1 1 0 01-2 0V6.414l-2.293 2.293a1 1 0 11-1.414-1.414L13.586 5H12zm-9 7a1 1 0 012 0v1.586l2.293-2.293a1 1 0 111.414 1.414L6.414 15H8a1 1 0 010 2H4a1 1 0 01-1-1v-4zm13-1a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 010-2h1.586l-2.293-2.293a1 1 0 111.414-1.414L15 13.586V12a1 1 0 011-1z" clip-rule="evenodd"/>' },
  { id: 'erase',  label: 'Erase',          icon: '<path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd"/>' },
  { id: 'ring',   label: 'Draw Ring',      icon: '<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM4.332 8.027a6.012 6.012 0 011.912-2.706C6.512 5.73 6.974 6 7.5 6A1.5 1.5 0 019 7.5V8a2 2 0 004 0 2 2 0 011.523-1.943A5.977 5.977 0 0116 10c0 .34-.028.675-.083 1H15a2 2 0 00-2 2v2.197A5.973 5.973 0 0110 16v-2a2 2 0 00-2-2 2 2 0 01-2-2 2 2 0 00-1.668-1.973z" clip-rule="evenodd"/>' },
]

const bondTypes: BondType[] = [
  { id: 'single',   label: '–', order: 1 },
  { id: 'double',   label: '=', order: 2 },
  { id: 'triple',   label: '≡', order: 3 },
  { id: 'aromatic', label: '∶', order: 4 },
]

const atomSymbols = ['C', 'N', 'O', 'S', 'P', 'F', 'Cl', 'Br', 'I']

const btnBase   = 'inline-flex items-center justify-center rounded p-1 text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer'
const btnActive = 'bg-chem-100 text-chem-700 ring-1 ring-chem-400'

export default defineComponent({
  name: 'Toolbar',
  props: {
    activeTool:       { type: String,  default: 'bond' },
    activeBondOrder:  { type: Number,  default: 1 },
    activeAtomSymbol: { type: String,  default: 'C' },
    canUndo:          { type: Boolean, default: false },
    canRedo:          { type: Boolean, default: false },
  },
  emits: ['tool-change', 'bond-order-change', 'atom-symbol-change', 'undo', 'redo', 'clear', 'export'],
  setup(props, { emit }) {
    return () => (
      <div class="chem-toolbar flex flex-wrap items-center gap-1 bg-white border-b border-gray-200 px-2 py-1 select-none">
        {/* Draw tools */}
        <div class="flex items-center gap-1 border-r border-gray-200 pr-2 mr-1">
          {drawTools.map((tool) => (
            <button
              key={tool.id}
              class={`${btnBase} ${props.activeTool === tool.id ? btnActive : ''}`}
              title={tool.label}
              onClick={() => emit('tool-change', tool.id)}
            >
              <svg class="w-5 h-5" viewBox="0 0 20 20" fill="currentColor" innerHTML={tool.icon} />
            </button>
          ))}
        </div>

        {/* Bond order */}
        <div class="flex items-center gap-1 border-r border-gray-200 pr-2 mr-1">
          {bondTypes.map((bond) => (
            <button
              key={bond.id}
              class={`${btnBase} font-mono text-sm font-bold px-2 ${props.activeBondOrder === bond.order ? btnActive : ''}`}
              title={bond.label}
              onClick={() => emit('bond-order-change', bond.order)}
            >
              {bond.label}
            </button>
          ))}
        </div>

        {/* Atom shortcuts */}
        <div class="flex items-center gap-1 border-r border-gray-200 pr-2 mr-1">
          {atomSymbols.map((sym) => (
            <button
              key={sym}
              class={`${btnBase} font-mono text-sm font-semibold px-2 ${props.activeAtomSymbol === sym ? btnActive : ''}`}
              title={`Add ${sym} atom`}
              onClick={() => emit('atom-symbol-change', sym)}
            >
              {sym}
            </button>
          ))}
        </div>

        {/* Actions */}
        <div class="flex items-center gap-1">
          <button class={btnBase} title="Undo (Ctrl+Z)" disabled={!props.canUndo} onClick={() => emit('undo')}>
            <svg class="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clip-rule="evenodd" />
            </svg>
          </button>
          <button class={btnBase} title="Redo (Ctrl+Y)" disabled={!props.canRedo} onClick={() => emit('redo')}>
            <svg class="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clip-rule="evenodd" />
            </svg>
          </button>
          <button class={`${btnBase} text-red-500 hover:text-red-700`} title="Clear canvas" onClick={() => emit('clear')}>
            <svg class="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd" />
            </svg>
          </button>
          <button class={btnBase} title="Export" onClick={() => emit('export')}>
            <svg class="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clip-rule="evenodd" />
            </svg>
          </button>
        </div>
      </div>
    )
  }
})
