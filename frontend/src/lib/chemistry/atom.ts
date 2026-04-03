/**
 * Atom – a single atom in a molecular graph.
 */

export interface AtomOptions {
  index: number
  symbol: string
  x?: number
  y?: number
  z?: number
  charge?: number
  isotope?: number
  implicitH?: number
  aromatic?: boolean
}

export interface AtomJSON {
  index: number
  symbol: string
  x: number
  y: number
  z: number
  charge: number
  isotope: number
  implicitH: number
  aromatic: boolean
}

export class Atom {
  index: number
  symbol: string
  x: number
  y: number
  z: number
  charge: number
  isotope: number
  implicitH: number
  aromatic: boolean

  static readonly VALENCES: Record<string, number[]> = {
    H: [1], B: [3], C: [4], N: [3, 5], O: [2], F: [1],
    Si: [4], P: [3, 5], S: [2, 4, 6], Cl: [1], Se: [2, 4, 6],
    Br: [1], I: [1, 3, 5, 7], At: [1],
  }

  constructor({
    index,
    symbol,
    x = 0,
    y = 0,
    z = 0,
    charge = 0,
    isotope = 0,
    implicitH = -1,
    aromatic = false,
  }: AtomOptions) {
    this.index     = index
    this.symbol    = symbol
    this.x         = x
    this.y         = y
    this.z         = z
    this.charge    = charge
    this.isotope   = isotope
    this.implicitH = implicitH
    this.aromatic  = aromatic
  }

  toJSON(): AtomJSON {
    return {
      index:     this.index,
      symbol:    this.symbol,
      x:         this.x,
      y:         this.y,
      z:         this.z,
      charge:    this.charge,
      isotope:   this.isotope,
      implicitH: this.implicitH,
      aromatic:  this.aromatic,
    }
  }

  static fromJSON(obj: AtomJSON): Atom {
    return new Atom(obj)
  }

  calcImplicitH(explicitValence: number): number {
    const vals = Atom.VALENCES[this.symbol]
    if (!vals) return 0
    for (const v of vals) {
      const diff = v - explicitValence - Math.abs(this.charge)
      if (diff >= 0) return diff
    }
    return 0
  }

  clone(): Atom {
    return new Atom({ ...this.toJSON() })
  }
}
