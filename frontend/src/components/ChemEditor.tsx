import { defineComponent, ref, computed, watch, onMounted, onBeforeUnmount, nextTick, Transition } from 'vue'
import Toolbar       from './Toolbar'
import DrawingCanvas from './DrawingCanvas'
import ExportDialog  from './ExportDialog'
import { useMolecule } from '@/composables/useMolecule'
import { BondOrder, type BondOrderValue } from '@/lib/chemistry/bond'
import { smilesParser } from '@/lib/chemistry/smiles'
import { parseMolfile } from '@/lib/chemistry/molfile'
import { generate2DCoordinates } from '@/lib/chemistry/layout2d'
import type { Atom } from '@/lib/chemistry/atom'
import type { Bond } from '@/lib/chemistry/bond'

export default defineComponent({
  name: 'ChemEditor',
  props: {
    initialSmiles:  { type: String,  default: '' },
    initialMolfile: { type: String,  default: '' },
    showInfoPanel:  { type: Boolean, default: false },
    readonly:       { type: Boolean, default: false },
  },
  emits: ['change', 'smiles-change', 'molecule-change'],
  setup(props, { emit, expose }) {
    const {
      molecule, smiles, molfile, sdf,
      canUndo, canRedo,
      addAtom, removeAtom, moveAtom, setAtomSymbol,
      addBond, removeBond, setBondOrder,
      clear, snapshot, undo, redo,
      exportAs: _exportAs,
    } = useMolecule()

    const activeTool       = ref('bond')
    const activeBondOrder  = ref<BondOrderValue>(BondOrder.SINGLE)
    const activeAtomSymbol = ref('C')
    const showExport       = ref(false)
    const showInfo         = ref(props.showInfoPanel)
    const editingAtom      = ref<number | null>(null)
    const popoverX         = ref(0)
    const popoverY         = ref(0)
    const customSymbol     = ref('')
    const symbolInput      = ref<HTMLInputElement | null>(null)

    const quickSymbols = ['C', 'N', 'O', 'S', 'P', 'F', 'Cl', 'Br', 'I', 'Si', 'B', 'H']

    onMounted(() => {
      if (props.initialMolfile) {
        const mol = parseMolfile(props.initialMolfile)
        Object.assign(molecule.value, mol)
        snapshot()
      } else if (props.initialSmiles) {
        const mol = smilesParser(props.initialSmiles)
        generate2DCoordinates(mol)
        Object.assign(molecule.value, mol)
        snapshot()
      }
    })

    watch(smiles, (val) => {
      emit('smiles-change', val)
      emit('change', { smiles: val, molfile: molfile.value })
      emit('molecule-change', molecule.value.toJSON())
    })

    function exportAs(format: string): string {
      if (format === 'svg') {
        const svgEl = document.querySelector('.drawing-canvas')
        return svgEl ? (svgEl as Element).outerHTML : ''
      }
      return _exportAs(format)
    }

    function onAtomAdd({ symbol, x, y, connectTo, bondOrder }: { symbol?: string; x: number; y: number; connectTo?: number; bondOrder?: number }) {
      if (props.readonly) return
      const atom = addAtom({ symbol: symbol ?? activeAtomSymbol.value, x, y })
      if (connectTo !== undefined && connectTo !== null) {
        addBond(connectTo, atom.index, (bondOrder ?? activeBondOrder.value) as BondOrderValue)
      }
    }

    function onAtomMove({ index, x, y }: { index: number; x: number; y: number }) {
      if (props.readonly) return
      moveAtom(index, x, y)
    }

    function onAtomMoveEnd({ index, x, y }: { index: number; x: number; y: number }) {
      if (props.readonly) return
      moveAtom(index, x, y)
      snapshot()
    }

    function onBondAdd({ beginAtom, endAtom, order }: { beginAtom: number; endAtom: number; order: number }) {
      if (props.readonly) return
      addBond(beginAtom, endAtom, order as BondOrderValue)
    }

    function onBondClick(bond: Bond) {
      if (props.readonly) return
      const next = bond.order >= BondOrder.TRIPLE ? BondOrder.SINGLE : (bond.order + 1) as BondOrderValue
      setBondOrder(bond.index, next)
    }

    function onAtomClick({ atom, double: dbl }: { atom: Atom; double: boolean }) {
      if (props.readonly) return
      if (dbl) {
        editingAtom.value = atom.index
        customSymbol.value = atom.symbol
        popoverX.value = 200
        popoverY.value = 200
        nextTick(() => symbolInput.value?.focus())
      }
    }

    function applyAtomSymbol(sym: string) {
      if (!sym || !sym.trim()) return
      setAtomSymbol(editingAtom.value!, sym.trim())
      editingAtom.value = null
      customSymbol.value = ''
    }

    function onKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') { e.preventDefault(); undo() }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.shiftKey && e.key === 'z'))) { e.preventDefault(); redo() }
      if (e.key === 'Escape') editingAtom.value = null
    }

    onMounted(() => window.addEventListener('keydown', onKeyDown))
    onBeforeUnmount(() => window.removeEventListener('keydown', onKeyDown))

    expose({
      loadSmiles(s: string) {
        const mol = smilesParser(s)
        generate2DCoordinates(mol)
        Object.assign(molecule.value, mol)
        snapshot()
      },
      loadMolfile(moltext: string) {
        const mol = parseMolfile(moltext)
        Object.assign(molecule.value, mol)
        snapshot()
      },
      getSmiles:  () => smiles.value,
      getMolfile: () => molfile.value,
      getSdf:     () => sdf.value,
      clear,
      undo,
      redo,
      exportAs,
    })

    return () => (
      <div class="chem-editor flex flex-col h-full min-h-[400px] bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        {/* Toolbar */}
        <Toolbar
          activeTool={activeTool.value}
          activeBondOrder={activeBondOrder.value}
          activeAtomSymbol={activeAtomSymbol.value}
          canUndo={canUndo.value}
          canRedo={canRedo.value}
          onToolChange={(t: string) => (activeTool.value = t)}
          onBondOrderChange={(o: number) => (activeBondOrder.value = o as BondOrderValue)}
          onAtomSymbolChange={(s: string) => (activeAtomSymbol.value = s)}
          onUndo={undo}
          onRedo={redo}
          onClear={clear}
          onExport={() => (showExport.value = true)}
        />

        {/* Canvas area */}
        <div class="flex flex-1 overflow-hidden">
          <DrawingCanvas
            class="flex-1"
            mol={molecule.value}
            activeTool={activeTool.value}
            activeBondOrder={activeBondOrder.value}
            activeAtom={activeAtomSymbol.value}
            onAtomAdd={onAtomAdd}
            onAtomMove={onAtomMove}
            onAtomMoveEnd={onAtomMoveEnd}
            onAtomClick={onAtomClick}
            onBondAdd={onBondAdd}
            onBondClick={onBondClick}
            onEraseAtom={(idx: number) => removeAtom(idx)}
            onEraseBond={(idx: number) => removeBond(idx)}
          />

          {/* Info panel */}
          <Transition
            enterActiveClass="transition-all duration-200 ease-in-out"
            leaveActiveClass="transition-all duration-200 ease-in-out"
            enterFromClass="w-0 opacity-0"
            leaveToClass="w-0 opacity-0"
          >
            {showInfo.value && molecule.value.atoms.length > 0 && (
              <div class="w-56 bg-gray-50 border-l border-gray-200 p-3 text-xs overflow-auto">
                <p class="font-semibold text-gray-700 mb-2">Structure Info</p>
                <dl class="space-y-1">
                  <div class="flex justify-between">
                    <dt class="text-gray-500">Formula</dt>
                    <dd class="font-mono font-medium text-gray-800">{molecule.value.formula}</dd>
                  </div>
                  <div class="flex justify-between">
                    <dt class="text-gray-500">Atoms</dt>
                    <dd class="font-mono">{molecule.value.atoms.length}</dd>
                  </div>
                  <div class="flex justify-between">
                    <dt class="text-gray-500">Bonds</dt>
                    <dd class="font-mono">{molecule.value.bonds.length}</dd>
                  </div>
                  <div class="flex justify-between">
                    <dt class="text-gray-500">SMILES</dt>
                    <dd class="font-mono break-all">{smiles.value}</dd>
                  </div>
                </dl>
              </div>
            )}
          </Transition>
        </div>

        {/* Status bar */}
        <div class="flex items-center justify-between bg-gray-50 border-t border-gray-200 px-3 py-1 text-xs text-gray-500 select-none">
          <span>
            {molecule.value.atoms.length} atoms · {molecule.value.bonds.length} bonds
            {molecule.value.atoms.length > 0 && <span> · {molecule.value.formula}</span>}
          </span>
          <div class="flex items-center gap-3">
            <button
              class="hover:text-gray-700 transition-colors"
              onClick={() => (showInfo.value = !showInfo.value)}
            >
              {showInfo.value ? 'Hide' : 'Show'} info
            </button>
            {smiles.value && (
              <span class="font-mono truncate max-w-[250px]" title={smiles.value}>
                {smiles.value}
              </span>
            )}
          </div>
        </div>

        {/* Export dialog */}
        <ExportDialog
          modelValue={showExport.value}
          exportFn={exportAs}
          onUpdateModelValue={(v: boolean) => (showExport.value = v)}
        />

        {/* Atom symbol editor popover */}
        {editingAtom.value !== null && (
          <div
            class="fixed z-40 bg-white border border-gray-300 rounded-lg shadow-xl p-2"
            style={{ top: popoverY.value + 'px', left: popoverX.value + 'px' }}
          >
            <label class="text-xs text-gray-500 block mb-1">Atom symbol</label>
            <div class="flex gap-1 flex-wrap max-w-[200px] mb-2">
              {quickSymbols.map((sym) => (
                <button
                  key={sym}
                  class="px-2 py-0.5 rounded border text-xs font-mono font-semibold hover:bg-chem-50 hover:border-chem-400 transition-colors"
                  onClick={() => applyAtomSymbol(sym)}
                >
                  {sym}
                </button>
              ))}
            </div>
            <input
              ref={symbolInput}
              value={customSymbol.value}
              onInput={(e: Event) => (customSymbol.value = (e.target as HTMLInputElement).value)}
              class="border border-gray-300 rounded px-2 py-0.5 text-xs w-20 focus:outline-none focus:ring-1 focus:ring-chem-400"
              placeholder="e.g. Si"
              onKeydown={(e: KeyboardEvent) => {
                if (e.key === 'Enter')  applyAtomSymbol(customSymbol.value)
                if (e.key === 'Escape') editingAtom.value = null
              }}
            />
          </div>
        )}
      </div>
    )
  }
})
