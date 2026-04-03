<template>
  <div class="chem-editor flex flex-col h-full min-h-[400px] bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
    <!-- Toolbar -->
    <Toolbar
      :active-tool="activeTool"
      :active-bond-order="activeBondOrder"
      :active-atom-symbol="activeAtomSymbol"
      :can-undo="canUndo"
      :can-redo="canRedo"
      @tool-change="activeTool = $event"
      @bond-order-change="activeBondOrder = $event"
      @atom-symbol-change="activeAtomSymbol = $event"
      @undo="undo"
      @redo="redo"
      @clear="clear"
      @export="showExport = true"
    />

    <!-- Canvas area -->
    <div class="flex flex-1 overflow-hidden">
      <DrawingCanvas
        class="flex-1"
        :mol="molecule"
        :active-tool="activeTool"
        :active-bond-order="activeBondOrder"
        :active-atom="activeAtomSymbol"
        @atom-add="onAtomAdd"
        @atom-move="onAtomMove"
        @atom-move-end="onAtomMoveEnd"
        @atom-click="onAtomClick"
        @bond-add="onBondAdd"
        @bond-click="onBondClick"
        @erase-atom="removeAtom"
        @erase-bond="removeBond"
      />

      <!-- Info panel (optional, shown when showInfo is true) -->
      <transition name="panel-slide">
        <div
          v-if="showInfo && molecule.atoms.length > 0"
          class="w-56 bg-gray-50 border-l border-gray-200 p-3 text-xs overflow-auto"
        >
          <p class="font-semibold text-gray-700 mb-2">Structure Info</p>
          <dl class="space-y-1">
            <div class="flex justify-between">
              <dt class="text-gray-500">Formula</dt>
              <dd class="font-mono font-medium text-gray-800">{{ molecule.formula }}</dd>
            </div>
            <div class="flex justify-between">
              <dt class="text-gray-500">Atoms</dt>
              <dd class="font-mono">{{ molecule.atoms.length }}</dd>
            </div>
            <div class="flex justify-between">
              <dt class="text-gray-500">Bonds</dt>
              <dd class="font-mono">{{ molecule.bonds.length }}</dd>
            </div>
            <div class="flex justify-between">
              <dt class="text-gray-500">SMILES</dt>
              <dd class="font-mono break-all">{{ smiles }}</dd>
            </div>
          </dl>
        </div>
      </transition>
    </div>

    <!-- Status bar -->
    <div class="flex items-center justify-between bg-gray-50 border-t border-gray-200 px-3 py-1 text-xs text-gray-500 select-none">
      <span>
        {{ molecule.atoms.length }} atoms · {{ molecule.bonds.length }} bonds
        <span v-if="molecule.atoms.length > 0"> · {{ molecule.formula }}</span>
      </span>
      <div class="flex items-center gap-3">
        <button
          class="hover:text-gray-700 transition-colors"
          @click="showInfo = !showInfo"
        >{{ showInfo ? 'Hide' : 'Show' }} info</button>
        <span v-if="smiles" class="font-mono truncate max-w-[250px]" :title="smiles">{{ smiles }}</span>
      </div>
    </div>

    <!-- Export dialog -->
    <ExportDialog v-model="showExport" :export-fn="exportAs" />

    <!-- Atom symbol editor popover -->
    <div
      v-if="editingAtom !== null"
      class="fixed z-40 bg-white border border-gray-300 rounded-lg shadow-xl p-2"
      :style="{ top: popoverY + 'px', left: popoverX + 'px' }"
    >
      <label class="text-xs text-gray-500 block mb-1">Atom symbol</label>
      <div class="flex gap-1 flex-wrap max-w-[200px] mb-2">
        <button
          v-for="sym in quickSymbols"
          :key="sym"
          class="px-2 py-0.5 rounded border text-xs font-mono font-semibold hover:bg-chem-50 hover:border-chem-400 transition-colors"
          @click="applyAtomSymbol(sym)"
        >{{ sym }}</button>
      </div>
      <input
        ref="symbolInput"
        v-model="customSymbol"
        class="border border-gray-300 rounded px-2 py-0.5 text-xs w-20 focus:outline-none focus:ring-1 focus:ring-chem-400"
        placeholder="e.g. Si"
        @keydown.enter="applyAtomSymbol(customSymbol)"
        @keydown.escape="editingAtom = null"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'
import Toolbar       from './Toolbar.vue'
import DrawingCanvas from './DrawingCanvas.vue'
import ExportDialog  from './ExportDialog.vue'
import { useMolecule } from '@/composables/useMolecule.js'
import { BondOrder } from '@/lib/chemistry/bond.js'
import { moleculeToSmiles, smilesParser } from '@/lib/chemistry/smiles.js'
import { parseMolfile } from '@/lib/chemistry/molfile.js'
import { generate2DCoordinates } from '@/lib/chemistry/layout2d.js'

// ── Props / emits ────────────────────────────────────────────────────────────
const props = defineProps({
  /** Initial SMILES to load */
  initialSmiles: { type: String,  default: '' },
  /** Initial MOL block to load */
  initialMolfile: { type: String, default: '' },
  /** Whether to show the info panel by default */
  showInfoPanel:  { type: Boolean, default: false },
  /** Read-only mode */
  readonly:       { type: Boolean, default: false },
})

const emit = defineEmits(['change', 'smiles-change', 'molecule-change'])

// ── Molecule state ────────────────────────────────────────────────────────────
const {
  molecule, smiles, molfile, sdf,
  canUndo, canRedo,
  addAtom, removeAtom, moveAtom, setAtomSymbol,
  addBond, removeBond, setBondOrder,
  clear, snapshot, undo, redo,
  exportAs: _exportAs,
} = useMolecule()

// ── Editor state ──────────────────────────────────────────────────────────────
const activeTool       = ref('bond')
const activeBondOrder  = ref(BondOrder.SINGLE)
const activeAtomSymbol = ref('C')
const showExport       = ref(false)
const showInfo         = ref(props.showInfoPanel)
const editingAtom      = ref(null)
const popoverX         = ref(0)
const popoverY         = ref(0)
const customSymbol     = ref('')
const symbolInput      = ref(null)

const quickSymbols = ['C', 'N', 'O', 'S', 'P', 'F', 'Cl', 'Br', 'I', 'Si', 'B', 'H']

// ── Initialise from props ─────────────────────────────────────────────────────
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

// ── Watch for external smiles changes ────────────────────────────────────────
watch(smiles, (val) => {
  emit('smiles-change', val)
  emit('change', { smiles: val, molfile: molfile.value })
  emit('molecule-change', molecule.value.toJSON())
})

// ── Export (wraps composable but also includes SVG) ───────────────────────────
function exportAs(format) {
  if (format === 'svg') {
    const svgEl = document.querySelector('.drawing-canvas')
    return svgEl ? svgEl.outerHTML : ''
  }
  return _exportAs(format)
}

// ── Canvas event handlers ─────────────────────────────────────────────────────

function onAtomAdd({ symbol, x, y, connectTo, bondOrder }) {
  if (props.readonly) return
  const atom = addAtom({ symbol: symbol ?? activeAtomSymbol.value, x, y })
  if (connectTo !== undefined && connectTo !== null) {
    addBond(connectTo, atom.index, bondOrder ?? activeBondOrder.value)
  }
}

function onAtomMove({ index, x, y }) {
  if (props.readonly) return
  moveAtom(index, x, y)
}

function onAtomMoveEnd({ index, x, y }) {
  if (props.readonly) return
  moveAtom(index, x, y)
  snapshot()
}

function onBondAdd({ beginAtom, endAtom, order }) {
  if (props.readonly) return
  addBond(beginAtom, endAtom, order)
}

function onBondClick(bond) {
  if (props.readonly) return
  // Cycle bond order
  const next = bond.order >= BondOrder.TRIPLE ? BondOrder.SINGLE : bond.order + 1
  setBondOrder(bond.index, next)
}

function onAtomClick({ atom, double }) {
  if (props.readonly) return
  if (double) {
    // Show atom editor
    editingAtom.value = atom.index
    customSymbol.value = atom.symbol
    // Approximate screen position
    popoverX.value = 200
    popoverY.value = 200
    nextTick(() => symbolInput.value?.focus())
  }
}

function applyAtomSymbol(sym) {
  if (!sym || !sym.trim()) return
  setAtomSymbol(editingAtom.value, sym.trim())
  editingAtom.value = null
  customSymbol.value = ''
}

// ── Keyboard shortcuts ────────────────────────────────────────────────────────
function onKeyDown(e) {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return
  if ((e.ctrlKey || e.metaKey) && e.key === 'z') { e.preventDefault(); undo() }
  if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.shiftKey && e.key === 'z'))) { e.preventDefault(); redo() }
  if (e.key === 'Escape') editingAtom.value = null
  if (e.key === 'Delete' || e.key === 'Backspace') { /* handled by canvas */ }
}

onMounted(() => window.addEventListener('keydown', onKeyDown))
onBeforeUnmount(() => window.removeEventListener('keydown', onKeyDown))

// ── Public API (exposed for parent components / template refs) ────────────────
defineExpose({
  loadSmiles(smiles) {
    const mol = smilesParser(smiles)
    generate2DCoordinates(mol)
    Object.assign(molecule.value, mol)
    snapshot()
  },
  loadMolfile(moltext) {
    const mol = parseMolfile(moltext)
    Object.assign(molecule.value, mol)
    snapshot()
  },
  getSmiles: () => smiles.value,
  getMolfile: () => molfile.value,
  getSdf: () => sdf.value,
  clear,
  undo,
  redo,
  exportAs,
})
</script>

<style scoped>
.panel-slide-enter-active,
.panel-slide-leave-active {
  transition: width 0.2s ease, opacity 0.2s ease;
}
.panel-slide-enter-from,
.panel-slide-leave-to {
  width: 0;
  opacity: 0;
}
</style>
