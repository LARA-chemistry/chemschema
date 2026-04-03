/**
 * Minimal SMILES writer and parser.
 */
import { BondOrder, type BondOrderValue } from './bond'
import { Molecule } from './molecule'

const ORGANIC_SUBSET = new Set(['B', 'C', 'N', 'O', 'P', 'S', 'F', 'Cl', 'Br', 'I'])

function bondSymbol(order: BondOrderValue, aromatic = false): string {
  if (aromatic) return ''
  switch (order) {
    case BondOrder.SINGLE:   return ''
    case BondOrder.DOUBLE:   return '='
    case BondOrder.TRIPLE:   return '#'
    case BondOrder.AROMATIC: return ':'
    default:                 return '-'
  }
}

function chargeStr(charge: number): string {
  if (charge === 0)  return ''
  if (charge === 1)  return '+'
  if (charge === -1) return '-'
  if (charge > 1)    return `+${charge}`
  return `${charge}`
}

export function moleculeToSmiles(mol: Molecule): string {
  if (mol.atoms.length === 0) return ''

  const visited   = new Set<number>()
  const ringBonds = new Map<number, number>()   // bond-index → ring-closure number
  let ringNum = 1

  // Adjacency list
  const adj: Array<Array<{ atom: number; bond: (typeof mol.bonds)[0] }>> =
    Array.from({ length: mol.atoms.length }, () => [])
  for (const bond of mol.bonds) {
    adj[bond.beginAtom].push({ atom: bond.endAtom, bond })
    adj[bond.endAtom].push({ atom: bond.beginAtom, bond })
  }

  // Pre-pass to identify ring bonds
  const visitedPre = new Set<number>()
  function findRings(atomIdx: number): void {
    if (visitedPre.has(atomIdx)) return
    visitedPre.add(atomIdx)
    for (const { atom: nIdx, bond } of adj[atomIdx]) {
      if (visitedPre.has(nIdx)) {
        if (!ringBonds.has(bond.index)) {
          ringBonds.set(bond.index, ringNum++)
        }
      } else {
        findRings(nIdx)
      }
    }
  }

  for (let i = 0; i < mol.atoms.length; i++) {
    if (!visitedPre.has(i)) findRings(i)
  }

  function buildSmiles(atomIdx: number, parentBond: (typeof mol.bonds)[0] | null): string {
    if (visited.has(atomIdx)) return ''
    visited.add(atomIdx)
    const atom     = mol.atoms[atomIdx]
    const aromatic = atom.aromatic
    const symLower = aromatic ? atom.symbol.toLowerCase() : atom.symbol
    const inBracket = !ORGANIC_SUBSET.has(atom.symbol) ||
                      atom.charge !== 0 ||
                      atom.isotope > 0 ||
                      atom.implicitH >= 0

    let s = ''
    if (parentBond) {
      s += bondSymbol(parentBond.order, aromatic)
    }

    if (inBracket) {
      let inner = ''
      if (atom.isotope > 0) inner += atom.isotope
      inner += symLower
      const h = atom.implicitH >= 0
        ? atom.implicitH
        : atom.calcImplicitH(Math.floor(mol.explicitValence(atomIdx)))
      if (h === 1) inner += 'H'
      if (h > 1)   inner += `H${h}`
      inner += chargeStr(atom.charge)
      s += `[${inner}]`
    } else {
      s += symLower
    }

    for (const bond of mol.bonds) {
      if (ringBonds.has(bond.index)) {
        if (bond.beginAtom === atomIdx || bond.endAtom === atomIdx) {
          const rn = ringBonds.get(bond.index)!
          s += rn >= 10 ? `%${rn}` : `${rn}`
        }
      }
    }

    const children = adj[atomIdx].filter(({ atom: nIdx }) => !visited.has(nIdx))

    for (let i = 0; i < children.length; i++) {
      const { atom: nIdx, bond } = children[i]
      const childSmiles = buildSmiles(nIdx, bond)
      if (i < children.length - 1) {
        s += `(${childSmiles})`
      } else {
        s += childSmiles
      }
    }

    return s
  }

  const smilesParts: string[] = []
  for (let i = 0; i < mol.atoms.length; i++) {
    if (!visited.has(i)) {
      smilesParts.push(buildSmiles(i, null))
    }
  }

  return smilesParts.join('.')
}

// ─── SMILES Parser ────────────────────────────────────────────────────────────

interface AtomToken {
  type: 'atom'
  symbol: string
  aromatic: boolean
  charge: number
  isotope: number
  hCount: number
}

interface BondToken { type: 'bond'; order: BondOrderValue }
interface OpenToken  { type: 'open' }
interface CloseToken { type: 'close' }
interface RingToken  { type: 'ring'; ringNum: number }
interface DotToken   { type: 'dot' }

type Token = AtomToken | BondToken | OpenToken | CloseToken | RingToken | DotToken

export function smilesParser(smiles: string): Molecule {
  const mol = new Molecule()
  if (!smiles || smiles.trim() === '') return mol

  const tokens = tokenise(smiles.trim())
  const stack: number[] = []
  const rings: Record<number, { atomIdx: number; bondOrder: BondOrderValue | null }> = {}
  let prevAtomIdx: number | null = null
  let pendingBondOrder: BondOrderValue | null = null
  let atomX = 0
  const BOND_LEN = 40

  function addAtomFromToken(tok: AtomToken): number {
    const a = mol.addAtom({
      symbol:    tok.symbol,
      charge:    tok.charge ?? 0,
      isotope:   tok.isotope ?? 0,
      implicitH: tok.hCount ?? -1,
      aromatic:  tok.aromatic ?? false,
      x: atomX,
      y: 0,
    })
    atomX += BOND_LEN
    return a.index
  }

  for (const tok of tokens) {
    if (tok.type === 'atom') {
      const idx = addAtomFromToken(tok)
      if (prevAtomIdx !== null) {
        mol.addBond({
          beginAtom: prevAtomIdx,
          endAtom:   idx,
          order:     pendingBondOrder ?? BondOrder.SINGLE,
        })
      }
      pendingBondOrder = null
      prevAtomIdx = idx

    } else if (tok.type === 'bond') {
      pendingBondOrder = tok.order

    } else if (tok.type === 'open') {
      stack.push(prevAtomIdx!)

    } else if (tok.type === 'close') {
      prevAtomIdx = stack.pop() ?? null
      pendingBondOrder = null

    } else if (tok.type === 'ring') {
      const rn = tok.ringNum
      if (rings[rn] !== undefined) {
        const { atomIdx: otherIdx, bondOrder } = rings[rn]
        mol.addBond({
          beginAtom: otherIdx,
          endAtom:   prevAtomIdx!,
          order:     bondOrder ?? pendingBondOrder ?? BondOrder.SINGLE,
        })
        delete rings[rn]
        pendingBondOrder = null
      } else {
        rings[rn] = { atomIdx: prevAtomIdx!, bondOrder: pendingBondOrder }
        pendingBondOrder = null
      }

    } else if (tok.type === 'dot') {
      prevAtomIdx = null
      pendingBondOrder = null
    }
  }

  return mol
}

function tokenise(smiles: string): Token[] {
  const tokens: Token[] = []
  let pos = 0

  const organicSubset: Record<string, string> = {
    B: 'B', C: 'C', N: 'N', O: 'O', P: 'P', S: 'S',
    F: 'F', Cl: 'Cl', Br: 'Br', I: 'I',
    b: 'B', c: 'C', n: 'N', o: 'O', p: 'P', s: 'S',
  }

  while (pos < smiles.length) {
    const ch = smiles[pos]

    if (ch === '[') {
      pos++
      let inner = ''
      while (pos < smiles.length && smiles[pos] !== ']') {
        inner += smiles[pos++]
      }
      pos++
      tokens.push(parseBracketAtom(inner))
      continue
    }

    if (ch === '=') { tokens.push({ type: 'bond', order: BondOrder.DOUBLE   }); pos++; continue }
    if (ch === '#') { tokens.push({ type: 'bond', order: BondOrder.TRIPLE   }); pos++; continue }
    if (ch === ':') { tokens.push({ type: 'bond', order: BondOrder.AROMATIC }); pos++; continue }
    if (ch === '-') { tokens.push({ type: 'bond', order: BondOrder.SINGLE   }); pos++; continue }

    if (ch === '(') { tokens.push({ type: 'open'  }); pos++; continue }
    if (ch === ')') { tokens.push({ type: 'close' }); pos++; continue }

    if (ch === '.') { tokens.push({ type: 'dot' }); pos++; continue }

    if (ch === '%') {
      const rn = parseInt(smiles.slice(pos + 1, pos + 3), 10)
      tokens.push({ type: 'ring', ringNum: rn })
      pos += 3
      continue
    }

    if (ch >= '0' && ch <= '9') {
      tokens.push({ type: 'ring', ringNum: parseInt(ch, 10) })
      pos++
      continue
    }

    const two = smiles.slice(pos, pos + 2)
    if (two === 'Cl' || two === 'Br') {
      tokens.push({ type: 'atom', symbol: two, aromatic: false, charge: 0, isotope: 0, hCount: -1 })
      pos += 2
      continue
    }

    if (organicSubset[ch]) {
      const aromatic = ch === ch.toLowerCase() && ch !== ch.toUpperCase()
      tokens.push({
        type: 'atom',
        symbol: organicSubset[ch],
        aromatic,
        charge: 0,
        isotope: 0,
        hCount: -1,
      })
      pos++
      continue
    }

    pos++
  }

  return tokens
}

function parseBracketAtom(inner: string): AtomToken {
  let pos = 0
  let isotope = 0
  let charge  = 0
  let hCount  = 0
  let hSeen   = false
  let aromatic = false

  let isoStr = ''
  while (pos < inner.length && inner[pos] >= '0' && inner[pos] <= '9') {
    isoStr += inner[pos++]
  }
  if (isoStr) isotope = parseInt(isoStr, 10)

  let symbol = ''
  if (pos < inner.length) {
    const first = inner[pos]
    aromatic = first === first.toLowerCase() && first !== first.toUpperCase()
    symbol = aromatic ? first.toUpperCase() : first
    pos++
    if (pos < inner.length && inner[pos] >= 'a' && inner[pos] <= 'z') {
      symbol += inner[pos++]
    }
  }

  while (pos < inner.length && inner[pos] === '@') pos++

  if (pos < inner.length && inner[pos] === 'H') {
    hSeen = true
    pos++
    let hStr = ''
    while (pos < inner.length && inner[pos] >= '0' && inner[pos] <= '9') {
      hStr += inner[pos++]
    }
    hCount = hStr ? parseInt(hStr, 10) : 1
  }

  if (pos < inner.length && (inner[pos] === '+' || inner[pos] === '-')) {
    const sign = inner[pos++] === '+' ? 1 : -1
    let numStr = ''
    while (pos < inner.length && inner[pos] >= '0' && inner[pos] <= '9') {
      numStr += inner[pos++]
    }
    charge = sign * (numStr ? parseInt(numStr, 10) : 1)
  }

  return {
    type:    'atom',
    symbol,
    aromatic,
    charge,
    isotope,
    hCount:  hSeen ? hCount : -1,
  }
}
