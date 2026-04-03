import { Molecule, type MoleculeJSON } from './molecule'

let _nextRxnId = 1

export interface ReactionJSON {
  id: string
  name: string
  reactants: MoleculeJSON[]
  agents: MoleculeJSON[]
  products: MoleculeJSON[]
  properties: Record<string, unknown>
}

export class Reaction {
  id: string
  name: string
  reactants: Molecule[]
  agents: Molecule[]
  products: Molecule[]
  properties: Record<string, unknown>

  constructor(id: string | null = null) {
    this.id         = id ?? `rxn_${_nextRxnId++}`
    this.name       = ''
    this.reactants  = []
    this.agents     = []
    this.products   = []
    this.properties = {}
  }

  addReactant(mol: Molecule): this { this.reactants.push(mol); return this }
  addAgent(mol: Molecule): this    { this.agents.push(mol);    return this }
  addProduct(mol: Molecule): this  { this.products.push(mol);  return this }

  removeReactant(id: string): void { this.reactants = this.reactants.filter((m) => m.id !== id) }
  removeAgent(id: string): void    { this.agents    = this.agents.filter((m) => m.id !== id) }
  removeProduct(id: string): void  { this.products  = this.products.filter((m) => m.id !== id) }

  toJSON(): ReactionJSON {
    return {
      id:         this.id,
      name:       this.name,
      reactants:  this.reactants.map((m) => m.toJSON()),
      agents:     this.agents.map((m) => m.toJSON()),
      products:   this.products.map((m) => m.toJSON()),
      properties: { ...this.properties },
    }
  }

  static fromJSON(obj: ReactionJSON): Reaction {
    const rxn = new Reaction(obj.id)
    rxn.name       = obj.name ?? ''
    rxn.reactants  = (obj.reactants ?? []).map(Molecule.fromJSON)
    rxn.agents     = (obj.agents    ?? []).map(Molecule.fromJSON)
    rxn.products   = (obj.products  ?? []).map(Molecule.fromJSON)
    rxn.properties = { ...(obj.properties ?? {}) }
    return rxn
  }
}
