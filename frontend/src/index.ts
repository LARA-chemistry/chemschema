// ── Vue components ────────────────────────────────────────────────────────────
export { default as ChemEditor }      from './components/ChemEditor'
export { default as ReactionEditor }  from './components/ReactionEditor'
export { default as DrawingCanvas }   from './components/DrawingCanvas'
export { default as Toolbar }         from './components/Toolbar'
export { default as ExportDialog }    from './components/ExportDialog'
export { default as AtomLabel }       from './components/AtomLabel'
export { default as BondRenderer }    from './components/BondRenderer'

// ── Chemistry data model ──────────────────────────────────────────────────────
export { Atom }                        from './lib/chemistry/atom'
export { Bond, BondOrder, BondStereo } from './lib/chemistry/bond'
export { Molecule }                    from './lib/chemistry/molecule'
export { Reaction }                    from './lib/chemistry/reaction'

// ── Format I/O ────────────────────────────────────────────────────────────────
export { moleculeToSmiles, smilesParser }                                    from './lib/chemistry/smiles'
export { moleculeToMolfile, moleculeToSdf, parseMolfile, parseSdf }          from './lib/chemistry/molfile'
export { generate2DCoordinates }                                              from './lib/chemistry/layout2d'

// ── Network clients ───────────────────────────────────────────────────────────
export { createGrpcClient, getDefaultClient, setDefaultClient }              from './lib/grpc/client'
export { createRestClient, getDefaultRestClient, setDefaultRestClient }      from './lib/rest/client'

// ── Vue composables ───────────────────────────────────────────────────────────
export { useMolecule } from './composables/useMolecule'
export { useGrpc }     from './composables/useGrpc'
export { useRest }     from './composables/useRest'

// ── Vue plugin installer ──────────────────────────────────────────────────────
import ChemEditor     from './components/ChemEditor'
import ReactionEditor from './components/ReactionEditor'
import type { App } from 'vue'

export default {
  install(app: App) {
    app.component('ChemEditor',     ChemEditor)
    app.component('ReactionEditor', ReactionEditor)
  },
}
