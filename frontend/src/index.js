/**
 * chemschema-editor – Public API
 *
 * Vue.js components and utilities for 2D chemical structure editing.
 *
 * @example
 * // In your Vue application:
 * import { ChemEditor, ReactionEditor } from 'chemschema-editor'
 * import 'chemschema-editor/style.css'
 */

// ── Vue components ────────────────────────────────────────────────────────────
export { default as ChemEditor }      from './components/ChemEditor.vue'
export { default as ReactionEditor }  from './components/ReactionEditor.vue'
export { default as DrawingCanvas }   from './components/DrawingCanvas.vue'
export { default as Toolbar }         from './components/Toolbar.vue'
export { default as ExportDialog }    from './components/ExportDialog.vue'
export { default as AtomLabel }       from './components/AtomLabel.vue'
export { default as BondRenderer }    from './components/BondRenderer.vue'

// ── Chemistry data model ──────────────────────────────────────────────────────
export { Atom }                      from './lib/chemistry/atom.js'
export { Bond, BondOrder, BondStereo } from './lib/chemistry/bond.js'
export { Molecule }                  from './lib/chemistry/molecule.js'
export { Reaction }                  from './lib/chemistry/reaction.js'

// ── Format I/O ────────────────────────────────────────────────────────────────
export {
  moleculeToSmiles,
  smilesParser,
}                                    from './lib/chemistry/smiles.js'
export {
  moleculeToMolfile,
  moleculeToSdf,
  parseMolfile,
  parseSdf,
}                                    from './lib/chemistry/molfile.js'
export { generate2DCoordinates }     from './lib/chemistry/layout2d.js'

// ── Network clients ───────────────────────────────────────────────────────────
export { createGrpcClient, getDefaultClient, setDefaultClient } from './lib/grpc/client.js'
export { createRestClient, getDefaultRestClient, setDefaultRestClient } from './lib/rest/client.js'

// ── Vue composables ───────────────────────────────────────────────────────────
export { useMolecule } from './composables/useMolecule.js'
export { useGrpc }     from './composables/useGrpc.js'
export { useRest }     from './composables/useRest.js'

// ── Vue plugin installer ──────────────────────────────────────────────────────
import ChemEditor     from './components/ChemEditor.vue'
import ReactionEditor from './components/ReactionEditor.vue'

/**
 * Vue plugin – registers ChemEditor and ReactionEditor globally.
 *
 * @example
 * import { createApp } from 'vue'
 * import ChemSchemaPlugin from 'chemschema-editor'
 * import 'chemschema-editor/style.css'
 *
 * const app = createApp(App)
 * app.use(ChemSchemaPlugin)
 */
export default {
  install(app) {
    app.component('ChemEditor',     ChemEditor)
    app.component('ReactionEditor', ReactionEditor)
  },
}
