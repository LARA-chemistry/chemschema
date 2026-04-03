/**
 * useMolecule – reactive state for the current molecule in the editor.
 */
import { ref, computed, readonly } from 'vue'
import { Molecule } from '@/lib/chemistry/molecule'
import { BondOrder, type BondOrderValue } from '@/lib/chemistry/bond'
import { moleculeToSmiles, smilesParser } from '@/lib/chemistry/smiles'
import { moleculeToMolfile, moleculeToSdf, parseMolfile } from '@/lib/chemistry/molfile'
import { generate2DCoordinates } from '@/lib/chemistry/layout2d'
import type { AtomOptions } from '@/lib/chemistry/atom'

export function useMolecule(initialMol: Molecule | null = null) {
  const molecule = ref(initialMol ?? new Molecule())

  const history = ref<ReturnType<Molecule['toJSON']>[]>([molecule.value.toJSON()])
  const histPos = ref(0)

  function snapshot(): void {
    history.value = history.value.slice(0, histPos.value + 1)
    history.value.push(molecule.value.toJSON())
    histPos.value = history.value.length - 1
  }

  function undo(): void {
    if (histPos.value > 0) {
      histPos.value--
      molecule.value = Molecule.fromJSON(history.value[histPos.value])
    }
  }

  function redo(): void {
    if (histPos.value < history.value.length - 1) {
      histPos.value++
      molecule.value = Molecule.fromJSON(history.value[histPos.value])
    }
  }

  const canUndo = computed(() => histPos.value > 0)
  const canRedo = computed(() => histPos.value < history.value.length - 1)

  function addAtom(opts: Omit<AtomOptions, 'index'>) {
    const atom = molecule.value.addAtom(opts)
    snapshot()
    return atom
  }

  function removeAtom(index: number): void {
    molecule.value.removeAtom(index)
    snapshot()
  }

  function moveAtom(index: number, x: number, y: number): void {
    const atom = molecule.value.getAtom(index)
    if (!atom) return
    atom.x = x
    atom.y = y
  }

  function setAtomSymbol(index: number, symbol: string): void {
    const atom = molecule.value.getAtom(index)
    if (!atom) return
    atom.symbol = symbol
    snapshot()
  }

  function setAtomCharge(index: number, charge: number): void {
    const atom = molecule.value.getAtom(index)
    if (!atom) return
    atom.charge = charge
    snapshot()
  }

  function addBond(beginAtom: number, endAtom: number, order: BondOrderValue = BondOrder.SINGLE): void {
    const existing = molecule.value.getBondBetween(beginAtom, endAtom)
    if (existing) {
      existing.order = existing.order >= BondOrder.TRIPLE ? BondOrder.SINGLE : (existing.order + 1) as BondOrderValue
    } else {
      molecule.value.addBond({ beginAtom, endAtom, order })
    }
    snapshot()
  }

  function removeBond(index: number): void {
    molecule.value.removeBond(index)
    snapshot()
  }

  function setBondOrder(index: number, order: BondOrderValue): void {
    const bond = molecule.value.getBond(index)
    if (!bond) return
    bond.order = order
    snapshot()
  }

  function clear(): void {
    molecule.value = new Molecule()
    snapshot()
  }

  function loadFromSmiles(smiles: string): void {
    const mol = smilesParser(smiles)
    generate2DCoordinates(mol)
    molecule.value = mol
    snapshot()
  }

  function loadFromMolfile(moltext: string): void {
    molecule.value = parseMolfile(moltext)
    snapshot()
  }

  const smiles  = computed(() => moleculeToSmiles(molecule.value))
  const molfile = computed(() => moleculeToMolfile(molecule.value))
  const sdf     = computed(() => moleculeToSdf(molecule.value))

  function exportAs(format: string): string {
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
