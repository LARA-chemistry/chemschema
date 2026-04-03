/**
 * MOL/SDF file format reader and writer (MDL V2000).
 * Supports reading V2000 MOL blocks and writing V2000 MOL blocks.
 */
import { Molecule } from './molecule.js'
import { BondOrder, BondStereo } from './bond.js'

// ─── Writer ───────────────────────────────────────────────────────────────────

/**
 * Serialise a Molecule to a MOL (V2000) string.
 * @param {import('./molecule.js').Molecule} mol
 * @returns {string}
 */
export function moleculeToMolfile(mol) {
  const lines = []

  // Header block (3 lines)
  lines.push(mol.name || '')
  lines.push('  ChemSchema 2D')
  lines.push('')

  // Counts line
  const na = mol.atoms.length
  const nb = mol.bonds.length
  lines.push(
    `${na.toString().padStart(3)}${nb.toString().padStart(3)}  0  0  0  0  0  0  0  0999 V2000`,
  )

  // Atom block
  for (const atom of mol.atoms) {
    const x   = atom.x.toFixed(4).padStart(10)
    const y   = atom.y.toFixed(4).padStart(10)
    const z   = (atom.z ?? 0).toFixed(4).padStart(10)
    const sym = atom.symbol.padEnd(3)
    const mDiff = 0
    const charge = mdlCharge(atom.charge)
    lines.push(`${x}${y}${z} ${sym} 0${charge.toString().padStart(3)}  0  0  0  0  0  0  0  0  0  0`)
  }

  // Bond block
  for (const bond of mol.bonds) {
    const a1    = (bond.beginAtom + 1).toString().padStart(3)
    const a2    = (bond.endAtom   + 1).toString().padStart(3)
    const order = mdlBondOrder(bond.order).toString().padStart(3)
    const stereo = mdlStereo(bond.stereo).toString().padStart(3)
    lines.push(`${a1}${a2}${order}${stereo}  0  0  0`)
  }

  // Charge properties
  const chargedAtoms = mol.atoms.filter((a) => a.charge !== 0)
  for (let i = 0; i < chargedAtoms.length; i += 8) {
    const batch = chargedAtoms.slice(i, i + 8)
    let line = `M  CHG${batch.length.toString().padStart(3)}`
    for (const atom of batch) {
      line += `${(atom.index + 1).toString().padStart(4)}${atom.charge.toString().padStart(4)}`
    }
    lines.push(line)
  }

  // Isotope properties
  const isotopeAtoms = mol.atoms.filter((a) => a.isotope > 0)
  for (let i = 0; i < isotopeAtoms.length; i += 8) {
    const batch = isotopeAtoms.slice(i, i + 8)
    let line = `M  ISO${batch.length.toString().padStart(3)}`
    for (const atom of batch) {
      line += `${(atom.index + 1).toString().padStart(4)}${atom.isotope.toString().padStart(4)}`
    }
    lines.push(line)
  }

  lines.push('M  END')
  return lines.join('\n')
}

/**
 * Serialise a Molecule to an SDF (V2000) string.
 * An SDF file is a MOL block followed by properties block and $$$$.
 */
export function moleculeToSdf(mol) {
  const molblock = moleculeToMolfile(mol)
  const propLines = []
  for (const [key, val] of Object.entries(mol.properties ?? {})) {
    propLines.push(`> <${key}>`)
    propLines.push(String(val))
    propLines.push('')
  }
  return `${molblock}\n${propLines.join('\n')}\n$$$$\n`
}

/**
 * Parse multiple molecules from an SDF string.
 * @param {string} sdf
 * @returns {Molecule[]}
 */
export function parseSdf(sdf) {
  const mols = []
  const records = sdf.split('$$$$')
  for (const record of records) {
    const trimmed = record.trim()
    if (!trimmed) continue
    const mol = parseMolfile(trimmed)
    // Parse property block
    const propSection = trimmed.split('M  END')[1] ?? ''
    const propLines = propSection.split('\n')
    let propKey = null
    for (const line of propLines) {
      const headerMatch = line.match(/^>\s*<(.+)>/)
      if (headerMatch) {
        propKey = headerMatch[1]
        continue
      }
      if (propKey && line.trim() !== '') {
        mol.properties[propKey] = line.trim()
        propKey = null
      }
    }
    mols.push(mol)
  }
  return mols
}

// ─── Reader ───────────────────────────────────────────────────────────────────

/**
 * Parse a MOL (V2000) string into a Molecule.
 * @param {string} moltext
 * @returns {Molecule}
 */
export function parseMolfile(moltext) {
  const mol   = new Molecule()
  const lines = moltext.replace(/\r\n/g, '\n').split('\n')

  // Header
  mol.name = lines[0]?.trim() ?? ''

  // Counts line (index 3)
  const countsLine = lines[3] ?? ''
  const numAtoms   = parseInt(countsLine.slice(0, 3), 10)
  const numBonds   = parseInt(countsLine.slice(3, 6), 10)

  if (isNaN(numAtoms) || isNaN(numBonds)) return mol

  // Atom block starts at line 4
  for (let i = 0; i < numAtoms; i++) {
    const line = lines[4 + i] ?? ''
    const x      = parseFloat(line.slice(0,  10))
    const y      = parseFloat(line.slice(10, 20))
    const z      = parseFloat(line.slice(20, 30))
    const symbol = line.slice(31, 34).trim()
    const dd     = parseInt(line.slice(36, 39), 10) || 0  // mass difference (obsolete)
    const chCd   = parseInt(line.slice(39, 42), 10) || 0  // charge code
    mol.addAtom({
      symbol,
      x: isNaN(x) ? 0 : x,
      y: isNaN(y) ? 0 : y,
      z: isNaN(z) ? 0 : z,
      charge: fromMdlCharge(chCd),
    })
  }

  // Bond block
  const bondStart = 4 + numAtoms
  for (let i = 0; i < numBonds; i++) {
    const line = lines[bondStart + i] ?? ''
    const a1    = parseInt(line.slice(0, 3), 10) - 1
    const a2    = parseInt(line.slice(3, 6), 10) - 1
    const order = fromMdlBondOrder(parseInt(line.slice(6, 9), 10) || 1)
    const stereo = fromMdlStereo(parseInt(line.slice(9, 12), 10) || 0)
    mol.addBond({ beginAtom: a1, endAtom: a2, order, stereo })
  }

  // Property block
  for (let i = bondStart + numBonds; i < lines.length; i++) {
    const line = lines[i]
    if (!line || line === 'M  END') break

    // M  CHG
    if (line.startsWith('M  CHG')) {
      const n = parseInt(line.slice(6, 9), 10)
      for (let j = 0; j < n; j++) {
        const atomIdx = parseInt(line.slice(9 + j * 8,  13 + j * 8), 10) - 1
        const charge  = parseInt(line.slice(13 + j * 8, 17 + j * 8), 10)
        if (mol.atoms[atomIdx]) mol.atoms[atomIdx].charge = charge
      }
    }

    // M  ISO
    if (line.startsWith('M  ISO')) {
      const n = parseInt(line.slice(6, 9), 10)
      for (let j = 0; j < n; j++) {
        const atomIdx = parseInt(line.slice(9 + j * 8,  13 + j * 8), 10) - 1
        const iso     = parseInt(line.slice(13 + j * 8, 17 + j * 8), 10)
        if (mol.atoms[atomIdx]) mol.atoms[atomIdx].isotope = iso
      }
    }
  }

  return mol
}

// ─── MDL code conversions ─────────────────────────────────────────────────────

function mdlCharge(charge) {
  // MDL charge codes (V2000)
  const map = { 3: 1, 2: 2, 1: 3, 0: 0, 5: -1, 6: -2, 7: -3 }
  // Return atom-block charge code (field 6 – obsolete but widely parsed)
  // Modern files use M  CHG; return 0 here
  return 0
}

function fromMdlCharge(code) {
  const map = { 1: 3, 2: 2, 3: 1, 4: 0, 5: -1, 6: -2, 7: -3, 0: 0 }
  return map[code] ?? 0
}

function mdlBondOrder(order) {
  if (order === BondOrder.AROMATIC) return 4
  return order
}

function fromMdlBondOrder(code) {
  if (code === 4) return BondOrder.AROMATIC
  return code  // 1, 2, 3 map directly
}

function mdlStereo(stereo) {
  return stereo
}

function fromMdlStereo(code) {
  return code
}
