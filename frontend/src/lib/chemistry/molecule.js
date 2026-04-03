import { Atom } from './atom.js'
import { Bond, BondOrder } from './bond.js'

let _nextMolId = 1

/**
 * Molecule – a labelled molecular graph with 2D coordinates.
 */
export class Molecule {
  constructor(id = null) {
    this.id         = id ?? `mol_${_nextMolId++}`
    this.name       = ''
    /** @type {Atom[]} */
    this.atoms      = []
    /** @type {Bond[]} */
    this.bonds      = []
    this.properties = {}
  }

  // ── Atom operations ────────────────────────────────────────────────────────

  addAtom(opts) {
    const atom = new Atom({ index: this.atoms.length, ...opts })
    this.atoms.push(atom)
    return atom
  }

  removeAtom(index) {
    // Remove bonds that reference this atom
    this.bonds = this.bonds.filter(
      (b) => b.beginAtom !== index && b.endAtom !== index,
    )
    this.atoms.splice(index, 1)
    // Re-index
    this.atoms.forEach((a, i) => (a.index = i))
    this.bonds.forEach((b) => {
      if (b.beginAtom > index) b.beginAtom--
      if (b.endAtom   > index) b.endAtom--
    })
  }

  getAtom(index) {
    return this.atoms[index] ?? null
  }

  // ── Bond operations ────────────────────────────────────────────────────────

  addBond(opts) {
    const bond = new Bond({ index: this.bonds.length, ...opts })
    this.bonds.push(bond)
    return bond
  }

  removeBond(index) {
    this.bonds.splice(index, 1)
    this.bonds.forEach((b, i) => (b.index = i))
  }

  getBond(index) {
    return this.bonds[index] ?? null
  }

  getBondBetween(a, b) {
    return this.bonds.find((bond) => bond.connects(a, b)) ?? null
  }

  /** All bonds that touch this atom */
  bondsForAtom(atomIndex) {
    return this.bonds.filter(
      (b) => b.beginAtom === atomIndex || b.endAtom === atomIndex,
    )
  }

  // ── Derived properties ─────────────────────────────────────────────────────

  /** Explicit valence of an atom (sum of bond orders, aromatic counted as 1.5) */
  explicitValence(atomIndex) {
    return this.bondsForAtom(atomIndex).reduce((sum, b) => {
      const o = b.order === BondOrder.AROMATIC ? 1.5 : b.order
      return sum + o
    }, 0)
  }

  /** Implicit hydrogen count for an atom */
  implicitH(atomIndex) {
    const atom = this.getAtom(atomIndex)
    if (!atom) return 0
    if (atom.implicitH >= 0) return atom.implicitH
    return atom.calcImplicitH(Math.floor(this.explicitValence(atomIndex)))
  }

  /** Molecular formula string, e.g. "C6H6" */
  get formula() {
    const counts = {}
    for (const atom of this.atoms) {
      counts[atom.symbol] = (counts[atom.symbol] ?? 0) + 1
      const h = this.implicitH(atom.index)
      if (h > 0) counts['H'] = (counts['H'] ?? 0) + h
    }
    // Hill order: C first, H second, then alphabetical
    const order = ['C', 'H', ...Object.keys(counts).filter((s) => s !== 'C' && s !== 'H').sort()]
    return order
      .filter((s) => counts[s])
      .map((s) => `${s}${counts[s] > 1 ? counts[s] : ''}`)
      .join('')
  }

  // ── Geometry helpers ───────────────────────────────────────────────────────

  /** Bounding box [{minX, minY}, {maxX, maxY}] */
  get boundingBox() {
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

  /** Translate all atoms */
  translate(dx, dy) {
    for (const a of this.atoms) {
      a.x += dx
      a.y += dy
    }
  }

  /** Scale all atoms around centre */
  scale(factor, cx, cy) {
    for (const a of this.atoms) {
      a.x = cx + (a.x - cx) * factor
      a.y = cy + (a.y - cy) * factor
    }
  }

  // ── Serialisation ──────────────────────────────────────────────────────────

  toJSON() {
    return {
      id:         this.id,
      name:       this.name,
      atoms:      this.atoms.map((a) => a.toJSON()),
      bonds:      this.bonds.map((b) => b.toJSON()),
      properties: { ...this.properties },
    }
  }

  static fromJSON(obj) {
    const mol = new Molecule(obj.id)
    mol.name       = obj.name ?? ''
    mol.atoms      = (obj.atoms ?? []).map(Atom.fromJSON)
    mol.bonds      = (obj.bonds ?? []).map(Bond.fromJSON)
    mol.properties = { ...(obj.properties ?? {}) }
    return mol
  }

  clone() {
    return Molecule.fromJSON(this.toJSON())
  }
}
