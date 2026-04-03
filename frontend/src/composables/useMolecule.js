/**
 * useMolecule – reactive state for the current molecule in the editor.
 */
import { ref, computed, readonly } from 'vue'
import { Molecule } from '@/lib/chemistry/molecule.js'
import { BondOrder } from '@/lib/chemistry/bond.js'
import { moleculeToSmiles, smilesParser } from '@/lib/chemistry/smiles.js'
import { moleculeToMolfile, moleculeToSdf, parseMolfile } from '@/lib/chemistry/molfile.js'
import { generate2DCoordinates } from '@/lib/chemistry/layout2d.js'

export function useMolecule(initialMol = null) {
  const molecule = ref(initialMol ?? new Molecule())

  // ── History (undo / redo) ──────────────────────────────────────────────────
  const history  = ref([molecule.value.toJSON()])
  const histPos  = ref(0)

  function snapshot() {
    // Trim any redo history
    history.value = history.value.slice(0, histPos.value + 1)
    history.value.push(molecule.value.toJSON())
    histPos.value = history.value.length - 1
  }

  function undo() {
    if (histPos.value > 0) {
      histPos.value--
      molecule.value = Molecule.fromJSON(history.value[histPos.value])
    }
  }

  function redo() {
    if (histPos.value < history.value.length - 1) {
      histPos.value++
      molecule.value = Molecule.fromJSON(history.value[histPos.value])
    }
  }

  const canUndo = computed(() => histPos.value > 0)
  const canRedo = computed(() => histPos.value < history.value.length - 1)

  // ── Mutation helpers ───────────────────────────────────────────────────────

  function addAtom(opts) {
    const atom = molecule.value.addAtom(opts)
    snapshot()
    return atom
  }

  function removeAtom(index) {
    molecule.value.removeAtom(index)
    snapshot()
  }

  function moveAtom(index, x, y) {
    const atom = molecule.value.getAtom(index)
    if (!atom) return
    atom.x = x
    atom.y = y
    // Don't snapshot on every move – caller should call snapshot() on drag end
  }

  function setAtomSymbol(index, symbol) {
    const atom = molecule.value.getAtom(index)
    if (!atom) return
    atom.symbol = symbol
    snapshot()
  }

  function setAtomCharge(index, charge) {
    const atom = molecule.value.getAtom(index)
    if (!atom) return
    atom.charge = charge
    snapshot()
  }

  function addBond(beginAtom, endAtom, order = BondOrder.SINGLE) {
    const existing = molecule.value.getBondBetween(beginAtom, endAtom)
    if (existing) {
      // Cycle bond order: 1 → 2 → 3 → 1
      existing.order = existing.order >= BondOrder.TRIPLE ? BondOrder.SINGLE : existing.order + 1
    } else {
      molecule.value.addBond({ beginAtom, endAtom, order })
    }
    snapshot()
  }

  function removeBond(index) {
    molecule.value.removeBond(index)
    snapshot()
  }

  function setBondOrder(index, order) {
    const bond = molecule.value.getBond(index)
    if (!bond) return
    bond.order = order
    snapshot()
  }

  function clear() {
    molecule.value = new Molecule()
    snapshot()
  }

  function loadFromSmiles(smiles) {
    const mol = smilesParser(smiles)
    generate2DCoordinates(mol)
    molecule.value = mol
    snapshot()
  }

  function loadFromMolfile(moltext) {
    molecule.value = parseMolfile(moltext)
    snapshot()
  }

  // ── Export helpers ─────────────────────────────────────────────────────────

  const smiles = computed(() => moleculeToSmiles(molecule.value))
  const molfile = computed(() => moleculeToMolfile(molecule.value))
  const sdf = computed(() => moleculeToSdf(molecule.value))

  function exportAs(format) {
    switch (format.toLowerCase()) {
      case 'smiles':  return smiles.value
      case 'mol':
      case 'molfile': return molfile.value
      case 'sdf':     return sdf.value
      case 'json':    return JSON.stringify(molecule.value.toJSON(), null, 2)
      default:        throw new Error(`Unknown export format: ${format}`)
    }
  }

  return {
    molecule: readonly(molecule),
    smiles,
    molfile,
    sdf,
    canUndo,
    canRedo,
    // Mutations
    addAtom,
    removeAtom,
    moveAtom,
    setAtomSymbol,
    setAtomCharge,
    addBond,
    removeBond,
    setBondOrder,
    clear,
    loadFromSmiles,
    loadFromMolfile,
    exportAs,
    snapshot,
    undo,
    redo,
  }
}
