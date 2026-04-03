import { describe, it, expect } from 'vitest'
import { Atom } from '../lib/chemistry/atom'
import { Bond, BondOrder } from '../lib/chemistry/bond'
import { Molecule } from '../lib/chemistry/molecule'
import { moleculeToSmiles, smilesParser } from '../lib/chemistry/smiles'
import { moleculeToMolfile, parseMolfile } from '../lib/chemistry/molfile'

// ─── Atom ────────────────────────────────────────────────────────────────────

describe('Atom', () => {
  it('constructs with defaults', () => {
    const a = new Atom({ index: 0, symbol: 'C' })
    expect(a.symbol).toBe('C')
    expect(a.charge).toBe(0)
    expect(a.isotope).toBe(0)
    expect(a.x).toBe(0)
    expect(a.y).toBe(0)
  })

  it('round-trips through JSON', () => {
    const a = new Atom({ index: 1, symbol: 'N', charge: 1, isotope: 14 })
    const b = Atom.fromJSON(a.toJSON())
    expect(b.symbol).toBe('N')
    expect(b.charge).toBe(1)
    expect(b.isotope).toBe(14)
  })

  it('calculates implicit H for C with 0 bonds', () => {
    const a = new Atom({ index: 0, symbol: 'C' })
    expect(a.calcImplicitH(0)).toBe(4)
  })

  it('calculates implicit H for N with 3 bonds', () => {
    const a = new Atom({ index: 0, symbol: 'N' })
    expect(a.calcImplicitH(3)).toBe(0)
  })
})

// ─── Bond ────────────────────────────────────────────────────────────────────

describe('Bond', () => {
  it('constructs and connects', () => {
    const b = new Bond({ index: 0, beginAtom: 0, endAtom: 1 })
    expect(b.connects(0, 1)).toBe(true)
    expect(b.connects(1, 0)).toBe(true)
    expect(b.connects(0, 2)).toBe(false)
  })

  it('returns the other atom', () => {
    const b = new Bond({ index: 0, beginAtom: 2, endAtom: 5 })
    expect(b.other(2)).toBe(5)
    expect(b.other(5)).toBe(2)
  })
})

// ─── Molecule ────────────────────────────────────────────────────────────────

describe('Molecule', () => {
  function makeEthane() {
    const mol = new Molecule()
    mol.addAtom({ symbol: 'C', x: 0,  y: 0 })
    mol.addAtom({ symbol: 'C', x: 40, y: 0 })
    mol.addBond({ beginAtom: 0, endAtom: 1, order: BondOrder.SINGLE })
    return mol
  }

  it('adds atoms and bonds', () => {
    const mol = makeEthane()
    expect(mol.atoms.length).toBe(2)
    expect(mol.bonds.length).toBe(1)
  })

  it('removes an atom and its bonds', () => {
    const mol = makeEthane()
    mol.removeAtom(0)
    expect(mol.atoms.length).toBe(1)
    expect(mol.bonds.length).toBe(0)
    expect(mol.atoms[0].index).toBe(0)
  })

  it('computes molecular formula for ethane', () => {
    const mol = makeEthane()
    expect(mol.formula).toBe('C2H6')
  })

  it('round-trips through JSON', () => {
    const mol = makeEthane()
    const mol2 = Molecule.fromJSON(mol.toJSON())
    expect(mol2.atoms.length).toBe(2)
    expect(mol2.bonds.length).toBe(1)
    expect(mol2.atoms[0].symbol).toBe('C')
  })
})

// ─── SMILES ───────────────────────────────────────────────────────────────────

describe('SMILES parser', () => {
  it('parses methane', () => {
    const mol = smilesParser('C')
    expect(mol.atoms.length).toBe(1)
    expect(mol.atoms[0].symbol).toBe('C')
  })

  it('parses ethanol CC0 as 3 atoms 2 bonds', () => {
    const mol = smilesParser('CCO')
    expect(mol.atoms.length).toBe(3)
    expect(mol.bonds.length).toBe(2)
  })

  it('parses double bond C=C', () => {
    const mol = smilesParser('C=C')
    expect(mol.bonds[0].order).toBe(BondOrder.DOUBLE)
  })

  it('parses ring closure in c1ccccc1 (benzene)', () => {
    const mol = smilesParser('c1ccccc1')
    expect(mol.atoms.length).toBe(6)
    expect(mol.bonds.length).toBe(6)  // 5 chain + 1 ring closure
  })

  it('parses branches in CC(C)C (isobutane)', () => {
    const mol = smilesParser('CC(C)C')
    expect(mol.atoms.length).toBe(4)
    expect(mol.bonds.length).toBe(3)
  })
})

describe('SMILES writer', () => {
  it('writes ethanol molecule', () => {
    const mol = new Molecule()
    mol.addAtom({ symbol: 'C', x: 0,   y: 0 })
    mol.addAtom({ symbol: 'C', x: 40,  y: 0 })
    mol.addAtom({ symbol: 'O', x: 80,  y: 0 })
    mol.addBond({ beginAtom: 0, endAtom: 1, order: BondOrder.SINGLE })
    mol.addBond({ beginAtom: 1, endAtom: 2, order: BondOrder.SINGLE })
    const smiles = moleculeToSmiles(mol)
    expect(smiles).toBeTruthy()
    expect(typeof smiles).toBe('string')
  })

  it('returns empty string for empty molecule', () => {
    expect(moleculeToSmiles(new Molecule())).toBe('')
  })
})

// ─── MOL file ────────────────────────────────────────────────────────────────

describe('MOL file', () => {
  it('round-trips a simple molecule', () => {
    const mol = new Molecule()
    mol.addAtom({ symbol: 'C', x: 0,  y: 0 })
    mol.addAtom({ symbol: 'O', x: 40, y: 0 })
    mol.addBond({ beginAtom: 0, endAtom: 1, order: BondOrder.SINGLE })

    const moltext = moleculeToMolfile(mol)
    expect(moltext).toContain('M  END')
    expect(moltext).toContain('C')
    expect(moltext).toContain('O')

    const mol2 = parseMolfile(moltext)
    expect(mol2.atoms.length).toBe(2)
    expect(mol2.bonds.length).toBe(1)
    expect(mol2.atoms[0].symbol).toBe('C')
    expect(mol2.atoms[1].symbol).toBe('O')
  })

  it('correctly records bond order', () => {
    const mol = new Molecule()
    mol.addAtom({ symbol: 'C', x: 0,  y: 0 })
    mol.addAtom({ symbol: 'C', x: 40, y: 0 })
    mol.addBond({ beginAtom: 0, endAtom: 1, order: BondOrder.DOUBLE })

    const mol2 = parseMolfile(moleculeToMolfile(mol))
    expect(mol2.bonds[0].order).toBe(BondOrder.DOUBLE)
  })
})
