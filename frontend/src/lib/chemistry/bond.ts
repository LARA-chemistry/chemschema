/**
 * Bond orders and stereo constants, plus the Bond class.
 */

export const BondOrder = Object.freeze({
  SINGLE:   1,
  DOUBLE:   2,
  TRIPLE:   3,
  AROMATIC: 4,
} as const)

export type BondOrderValue = typeof BondOrder[keyof typeof BondOrder]

export const BondStereo = Object.freeze({
  NONE:       0,
  UP:         1,
  UP_OR_DOWN: 4,
  DOWN:       6,
} as const)

export type BondStereoValue = typeof BondStereo[keyof typeof BondStereo]

export interface BondOptions {
  index: number
  beginAtom: number
  endAtom: number
  order?: BondOrderValue
  stereo?: BondStereoValue
}

export interface BondJSON {
  index: number
  beginAtom: number
  endAtom: number
  order: BondOrderValue
  stereo: BondStereoValue
}

export class Bond {
  index: number
  beginAtom: number
  endAtom: number
  order: BondOrderValue
  stereo: BondStereoValue

  constructor({
    index,
    beginAtom,
    endAtom,
    order = BondOrder.SINGLE,
    stereo = BondStereo.NONE,
  }: BondOptions) {
    this.index     = index
    this.beginAtom = beginAtom
    this.endAtom   = endAtom
    this.order     = order
    this.stereo    = stereo
  }

  connects(a: number, b: number): boolean {
    return (this.beginAtom === a && this.endAtom === b) ||
           (this.beginAtom === b && this.endAtom === a)
  }

  other(atomIndex: number): number {
    return this.beginAtom === atomIndex ? this.endAtom : this.beginAtom
  }

  toJSON(): BondJSON {
    return {
      index:     this.index,
      beginAtom: this.beginAtom,
      endAtom:   this.endAtom,
      order:     this.order,
      stereo:    this.stereo,
    }
  }

  static fromJSON(obj: BondJSON): Bond {
    return new Bond(obj)
  }

  clone(): Bond {
    return new Bond({ ...this.toJSON() })
  }
}
