/**
 * 2D coordinate generator (simple ring-aware layout).
 */
import { Molecule } from './molecule'

const BOND_LEN = 40

export function generate2DCoordinates(mol: Molecule): void {
  if (mol.atoms.length === 0) return
  if (mol.atoms.length === 1) {
    mol.atoms[0].x = 0
    mol.atoms[0].y = 0
    return
  }

  const adj: number[][] = Array.from({ length: mol.atoms.length }, () => [])
  for (const bond of mol.bonds) {
    adj[bond.beginAtom].push(bond.endAtom)
    adj[bond.endAtom].push(bond.beginAtom)
  }

  const rings = findSSSR(mol, adj)

  const placed = new Set<number>()
  const coords: Array<{ x: number; y: number }> = Array.from({ length: mol.atoms.length }, () => ({ x: 0, y: 0 }))

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

  const queue: number[] = []
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
    const cur       = queue[head++]
    const curCoord  = coords[cur]
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

  for (let i = 0; i < mol.atoms.length; i++) {
    mol.atoms[i].x = coords[i].x
    mol.atoms[i].y = coords[i].y
  }
}

function findSSSR(mol: Molecule, adj: number[][]): number[][] {
  const rings: number[][] = []
  const visited = new Set<number>()

  function dfs(start: number, cur: number, parent: number, path: number[]): void {
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
    if (rings.length > 50) break
  }

  const seen = new Set<string>()
  return rings.filter((ring) => {
    const key = [...ring].sort().join(',')
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}
