/**
 * 2D coordinate generator (simple ring-aware layout).
 *
 * This is a basic implementation that places atoms in a ring or chain
 * arrangement. For high-quality depiction, coordinates should be requested
 * from the server-side gRPC Depict2D endpoint.
 */

const BOND_LEN = 40   // px

/**
 * Assign 2D coordinates to the atoms of a molecule (in place).
 * @param {import('./molecule.js').Molecule} mol
 */
export function generate2DCoordinates(mol) {
  if (mol.atoms.length === 0) return
  if (mol.atoms.length === 1) {
    mol.atoms[0].x = 0
    mol.atoms[0].y = 0
    return
  }

  // Build adjacency list
  const adj = Array.from({ length: mol.atoms.length }, () => [])
  for (const bond of mol.bonds) {
    adj[bond.beginAtom].push(bond.endAtom)
    adj[bond.endAtom].push(bond.beginAtom)
  }

  // Find rings using DFS
  const rings = findSSSR(mol, adj)

  const placed  = new Set()
  const coords  = Array.from({ length: mol.atoms.length }, () => ({ x: 0, y: 0 }))

  // Place ring systems first
  for (const ring of rings) {
    const n = ring.length
    const radius = BOND_LEN / (2 * Math.sin(Math.PI / n))
    for (let i = 0; i < n; i++) {
      const angle = (2 * Math.PI * i) / n - Math.PI / 2
      coords[ring[i]] = {
        x: radius * Math.cos(angle),
        y: radius * Math.sin(angle),
      }
      placed.add(ring[i])
    }
  }

  // Place remaining atoms via BFS starting from atom 0
  const queue   = []
  const startIdx = placed.size > 0 ? [...placed][0] : 0
  if (!placed.has(0)) {
    coords[0] = { x: 0, y: 0 }
    placed.add(0)
    queue.push(0)
  } else {
    queue.push(startIdx)
  }

  let head = 0
  while (head < queue.length) {
    const cur     = queue[head++]
    const curCoord = coords[cur]
    const neighbours = adj[cur].filter((n) => !placed.has(n))
    const angle0 = neighbours.length === 1 ? 0 : -Math.PI / 6

    for (let i = 0; i < neighbours.length; i++) {
      const nIdx  = neighbours[i]
      const angle = angle0 + (i * Math.PI) / Math.max(neighbours.length - 1, 1)
      coords[nIdx] = {
        x: curCoord.x + BOND_LEN * Math.cos(angle),
        y: curCoord.y + BOND_LEN * Math.sin(angle),
      }
      placed.add(nIdx)
      queue.push(nIdx)
    }
  }

  // Apply to atoms
  for (let i = 0; i < mol.atoms.length; i++) {
    mol.atoms[i].x = coords[i].x
    mol.atoms[i].y = coords[i].y
  }
}

/**
 * Minimal SSSR (smallest set of smallest rings) – returns ring atom-index arrays.
 */
function findSSSR(mol, adj) {
  const rings = []
  const visited = new Set()

  function dfs(start, cur, parent, path) {
    if (cur === start && path.length > 2) {
      rings.push([...path])
      return
    }
    if (visited.has(cur) && cur !== start) return
    visited.add(cur)
    for (const next of adj[cur]) {
      if (next === parent) continue
      if (next === start && path.length > 2) {
        rings.push([...path])
        continue
      }
      if (!visited.has(next)) {
        path.push(next)
        dfs(start, next, cur, path)
        path.pop()
      }
    }
    if (cur !== start) visited.delete(cur)
  }

  // Only look for rings up to size 8 for performance
  for (let i = 0; i < mol.atoms.length; i++) {
    if (adj[i].length >= 2) {
      visited.clear()
      visited.add(i)
      for (const next of adj[i]) {
        const path = [i, next]
        visited.add(next)
        dfs(i, next, i, path)
        visited.delete(next)
      }
    }
    if (rings.length > 50) break  // safety limit
  }

  // Deduplicate rings (same set of atoms, different order)
  const seen = new Set()
  return rings.filter((ring) => {
    const key = [...ring].sort().join(',')
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}
