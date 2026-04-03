/**
 * Reaction – a collection of reactants, agents and products.
 */
import { Molecule } from './molecule.js'

let _nextRxnId = 1

export class Reaction {
  constructor(id = null) {
    this.id        = id ?? `rxn_${_nextRxnId++}`
    this.name      = ''
    /** @type {import('./molecule.js').Molecule[]} */
    this.reactants = []
    /** @type {import('./molecule.js').Molecule[]} */
    this.agents    = []
    /** @type {import('./molecule.js').Molecule[]} */
    this.products  = []
    this.properties = {}
  }

  // ── Roles ──────────────────────────────────────────────────────────────────

  addReactant(mol) { this.reactants.push(mol); return this }
  addAgent(mol)    { this.agents.push(mol);    return this }
  addProduct(mol)  { this.products.push(mol);  return this }

  removeReactant(id) { this.reactants = this.reactants.filter((m) => m.id !== id) }
  removeAgent(id)    { this.agents    = this.agents.filter((m) => m.id !== id) }
  removeProduct(id)  { this.products  = this.products.filter((m) => m.id !== id) }

  // ── Serialisation ──────────────────────────────────────────────────────────

  toJSON() {
    return {
      id:         this.id,
      name:       this.name,
      reactants:  this.reactants.map((m) => m.toJSON()),
      agents:     this.agents.map((m) => m.toJSON()),
      products:   this.products.map((m) => m.toJSON()),
      properties: { ...this.properties },
    }
  }

  static fromJSON(obj) {
    const rxn = new Reaction(obj.id)
    rxn.name       = obj.name ?? ''
    rxn.reactants  = (obj.reactants ?? []).map(Molecule.fromJSON)
    rxn.agents     = (obj.agents    ?? []).map(Molecule.fromJSON)
    rxn.products   = (obj.products  ?? []).map(Molecule.fromJSON)
    rxn.properties = { ...(obj.properties ?? {}) }
    return rxn
  }
}
