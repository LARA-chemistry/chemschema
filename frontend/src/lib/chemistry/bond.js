/**
 * Bond orders
 */
export const BondOrder = Object.freeze({
  SINGLE:   1,
  DOUBLE:   2,
  TRIPLE:   3,
  AROMATIC: 4,
})

/**
 * Bond stereo (wedge/dash)
 */
export const BondStereo = Object.freeze({
  NONE:      0,
  UP:        1,   // wedge (solid)
  UP_OR_DOWN: 4,
  DOWN:      6,   // dash
})

/**
 * Bond – an edge in the molecular graph.
 */
export class Bond {
  /**
   * @param {object} opts
   * @param {number} opts.index
   * @param {number} opts.beginAtom  – atom index
   * @param {number} opts.endAtom    – atom index
   * @param {number} [opts.order]    – BondOrder constant (default SINGLE)
   * @param {number} [opts.stereo]   – BondStereo constant (default NONE)
   */
  constructor({ index, beginAtom, endAtom, order = BondOrder.SINGLE, stereo = BondStereo.NONE }) {
    this.index     = index
    this.beginAtom = beginAtom
    this.endAtom   = endAtom
    this.order     = order
    this.stereo    = stereo
  }

  /** True if this bond connects the two atom indices (in either direction). */
  connects(a, b) {
    return (this.beginAtom === a && this.endAtom === b) ||
           (this.beginAtom === b && this.endAtom === a)
  }

  /** The other atom index. */
  other(atomIndex) {
    return this.beginAtom === atomIndex ? this.endAtom : this.beginAtom
  }

  toJSON() {
    return {
      index:     this.index,
      beginAtom: this.beginAtom,
      endAtom:   this.endAtom,
      order:     this.order,
      stereo:    this.stereo,
    }
  }

  static fromJSON(obj) {
    return new Bond(obj)
  }

  clone() {
    return new Bond({ ...this.toJSON() })
  }
}
