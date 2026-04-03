import { Atom, type AtomOptions, type AtomJSON } from './atom'
import { Bond, BondOrder, type BondOptions, type BondJSON, type BondOrderValue } from './bond'

let _nextMolId = 1

export interface MoleculeJSON {
  id: string
  name: string
  atoms: AtomJSON[]
  bonds: BondJSON[]
  properties: Record<string, unknown>
}

export interface BoundingBox {
  minX: number
  minY: number
  maxX: number
  maxY: number
}

export class Molecule {
  id: string
  name: string
  atoms: Atom[]
  bonds: Bond[]
  properties: Record<string, unknown>

  constructor(id: string | null = null) {
    this.id         = id ?? `mol_${_nextMolId++}`
    this.name       = ''
    this.atoms      = []
    this.bonds      = []
    this.properties = {}
  }

  addAtom(opts: Omit<AtomOptions, 'index'>): Atom {
    const atom = new Atom({ index: this.atoms.length, ...opts })
    this.atoms.push(atom)
    return atom
  }

  removeAtom(index: number): void {
    this.bonds = this.bonds.filter(
      (b) => b.beginAtom !== index && b.endAtom !== index,
    )
    this.atoms.splice(index, 1)
    this.atoms.forEach((a, i) => (a.index = i))
    this.bonds.forEach((b) => {
      if (b.beginAtom > index) b.beginAtom--
      if (b.endAtom   > index) b.endAtom--
    })
  }

  getAtom(index: number): Atom | null {
    return this.atoms[index] ?? null
  }

  addBond(opts: Omit<BondOptions, 'index'>): Bond {
    const bond = new Bond({ index: this.bonds.length, ...opts })
    this.bonds.push(bond)
    return bond
  }

  removeBond(index: number): void {
    this.bonds.splice(index, 1)
    this.bonds.forEach((b, i) => (b.index = i))
  }

  getBond(index: number): Bond | null {
    return this.bonds[index] ?? null
  }

  getBondBetween(a: number, b: number): Bond | null {
    return this.bonds.find((bond) => bond.connects(a, b)) ?? null
  }

  bondsForAtom(atomIndex: number): Bond[] {
    return this.bonds.filter(
      (b) => b.beginAtom === atomIndex || b.endAtom === atomIndex,
    )
  }

  explicitValence(atomIndex: number): number {
    return this.bondsForAtom(atomIndex).reduce((sum, b) => {
      const o = b.order === BondOrder.AROMATIC ? 1.5 : b.order
      return sum + o
    }, 0)
  }

  implicitH(atomIndex: number): number {
    const atom = this.getAtom(atomIndex)
    if (!atom) return 0
    if (atom.implicitH >= 0) return atom.implicitH
    return atom.calcImplicitH(Math.floor(this.explicitValence(atomIndex)))
  }

  get formula(): string {
    const counts: Record<string, number> = {}
    for (const atom of this.atoms) {
      counts[atom.symbol] = (counts[atom.symbol] ?? 0) + 1
      const h = this.implicitH(atom.index)
      if (h > 0) counts['H'] = (counts['H'] ?? 0) + h
    }
    const order = ['C', 'H', ...Object.keys(counts).filter((s) => s !== 'C' && s !== 'H').sort()]
    return order
      .filter((s) => counts[s])
      .map((s) => `${s}${counts[s] > 1 ? counts[s] : ''}`)
      .join('')
  }

  get boundingBox(): BoundingBox {
    if (this.atoms.length === 0) return { minX: 0, minY: 0, maxX: 0, maxY: 0 }
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
    for (const a of this.atoms) {
      if (a.x < minX) minX = a.x
      if (a.y < minY) minY = a.y
      if (a.x > maxX) maxX = a.x
      if (a.y > maxY) maxY = a.y
    }
    return { minX, minY, maxX, maxY }
  }

  translate(dx: number, dy: number): void {
    for (const a of this.atoms) {
      a.x += dx
      a.y += dy
    }
  }

  scale(factor: number, cx: number, cy: number): void {
    for (const a of this.atoms) {
      a.x = cx + (a.x - cx) * factor
      a.y = cy + (a.y - cy) * factor
    }
  }

  toJSON(): MoleculeJSON {
    return {
      id:         this.id,
      name:       this.name,
      atoms:      this.atoms.map((a) => a.toJSON()),
      bonds:      this.bonds.map((b) => b.toJSON()),
      properties: { ...this.properties },
    }
  }

  static fromJSON(obj: MoleculeJSON): Molecule {
    const mol = new Molecule(obj.id)
    mol.name       = obj.name ?? ''
    mol.atoms      = (obj.atoms ?? []).map(Atom.fromJSON)
    mol.bonds      = (obj.bonds ?? []).map(Bond.fromJSON)
    mol.properties = { ...(obj.properties ?? {}) }
    return mol
  }

  clone(): Molecule {
    return Molecule.fromJSON(this.toJSON())
  }
}
