/**
 * Atom – a single atom in a molecular graph.
 */
export class Atom {
  /**
   * @param {object} opts
   * @param {number}  opts.index
   * @param {string}  opts.symbol        – element symbol, e.g. 'C'
   * @param {number}  [opts.x=0]
   * @param {number}  [opts.y=0]
   * @param {number}  [opts.z=0]
   * @param {number}  [opts.charge=0]
   * @param {number}  [opts.isotope=0]   – mass number, 0 = natural abundance
   * @param {number}  [opts.implicitH]   – -1 = auto-calculate
   * @param {boolean} [opts.aromatic=false]
   */
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
  }) {
    this.index    = index
    this.symbol   = symbol
    this.x        = x
    this.y        = y
    this.z        = z
    this.charge   = charge
    this.isotope  = isotope
    this.implicitH = implicitH
    this.aromatic  = aromatic
  }

  /** Typical valence table – used for implicit-H calculation */
  static VALENCES = {
    H: [1], B: [3], C: [4], N: [3, 5], O: [2], F: [1],
    Si: [4], P: [3, 5], S: [2, 4, 6], Cl: [1], Se: [2, 4, 6],
    Br: [1], I: [1, 3, 5, 7], At: [1],
  }

  /** Return a plain-object representation suitable for JSON serialisation. */
  toJSON() {
    return {
      index:    this.index,
      symbol:   this.symbol,
      x:        this.x,
      y:        this.y,
      z:        this.z,
      charge:   this.charge,
      isotope:  this.isotope,
      implicitH: this.implicitH,
      aromatic:  this.aromatic,
    }
  }

  /** Create an Atom from a plain-object / JSON blob */
  static fromJSON(obj) {
    return new Atom(obj)
  }

  /**
   * Compute the number of implicit hydrogens given the current bond orders.
   * @param {number} explicitValence – sum of bond orders on this atom
   */
  calcImplicitH(explicitValence) {
    const vals = Atom.VALENCES[this.symbol]
    if (!vals) return 0
    for (const v of vals) {
      const diff = v - explicitValence - Math.abs(this.charge)
      if (diff >= 0) return diff
    }
    return 0
  }

  clone() {
    return new Atom({ ...this.toJSON() })
  }
}
