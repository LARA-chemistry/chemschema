import { defineComponent, ref, computed } from 'vue'
import ChemEditor from './ChemEditor'
import { Reaction } from '@/lib/chemistry/reaction'
import { Molecule } from '@/lib/chemistry/molecule'
import { moleculeToSmiles } from '@/lib/chemistry/smiles'

export default defineComponent({
  name: 'ReactionEditor',
  emits: ['change'],
  setup(_props, { emit }) {
    const reaction  = ref(new Reaction())
    const molSmiles = ref(new Map<string, string>())

    function getMolSmiles(mol: Molecule): string {
      return molSmiles.value.get(mol.id) ?? moleculeToSmiles(mol)
    }

    function updateReactant(i: number, smiles: string) {
      const mol = reaction.value.reactants[i]
      if (mol) molSmiles.value.set(mol.id, smiles)
      emitChange()
    }

    function updateAgent(i: number, smiles: string) {
      const mol = reaction.value.agents[i]
      if (mol) molSmiles.value.set(mol.id, smiles)
      emitChange()
    }

    function updateProduct(i: number, smiles: string) {
      const mol = reaction.value.products[i]
      if (mol) molSmiles.value.set(mol.id, smiles)
      emitChange()
    }

    function newEmptyMol(): Molecule { return new Molecule() }

    function addReactant() { reaction.value.addReactant(newEmptyMol()) }
    function addAgent()    { reaction.value.addAgent(newEmptyMol()) }
    function addProduct()  { reaction.value.addProduct(newEmptyMol()) }

    function removeReactant(i: number) { reaction.value.reactants.splice(i, 1) }
    function removeAgent(i: number)    { reaction.value.agents.splice(i, 1) }
    function removeProduct(i: number)  { reaction.value.products.splice(i, 1) }

    function clearReaction() {
      reaction.value  = new Reaction()
      molSmiles.value = new Map()
    }

    const reactionSmiles = computed(() => {
      const rParts = reaction.value.reactants.map((m) => getMolSmiles(m) || '*')
      const aParts = reaction.value.agents.map((m) => getMolSmiles(m) || '*')
      const pParts = reaction.value.products.map((m) => getMolSmiles(m) || '*')
      return `${rParts.join('.')}>${aParts.join('.')}>${pParts.join('.')}`
    })

    function emitChange() {
      emit('change', {
        reactionSmiles: reactionSmiles.value,
        reaction: reaction.value.toJSON(),
      })
    }

    const btnBase = 'inline-flex items-center justify-center rounded px-2 py-1 text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors text-xs'

    return () => (
      <div class="reaction-editor flex flex-col h-full min-h-[500px] bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        {/* Header */}
        <div class="flex items-center justify-between bg-gray-50 border-b border-gray-200 px-4 py-2">
          <h3 class="text-sm font-semibold text-gray-700">Reaction Editor</h3>
          <div class="flex items-center gap-2">
            <button class={`${btnBase} text-xs`} onClick={addReactant}>+ Reactant</button>
            <button class={`${btnBase} text-xs`} onClick={addAgent}>+ Agent</button>
            <button class={`${btnBase} text-xs`} onClick={addProduct}>+ Product</button>
            <button class={`${btnBase} text-xs text-red-500`} onClick={clearReaction}>Clear</button>
          </div>
        </div>

        {/* Reaction canvas */}
        <div class="flex flex-1 overflow-auto items-center px-4 py-6 gap-2 min-h-0">
          {/* Reactants */}
          <div class="flex items-center gap-2">
            {reaction.value.reactants.map((mol, i) => (
              <div key={mol.id} class="relative flex flex-col items-center gap-1">
                <div class="text-xs font-semibold text-gray-400">R{i + 1}</div>
                <div class="w-48 h-36 border border-gray-200 rounded-lg overflow-hidden">
                  <ChemEditor
                    initialSmiles={getMolSmiles(mol)}
                    onSmilesChange={(s: string) => updateReactant(i, s)}
                  />
                </div>
                <button
                  class="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-red-100 text-red-500 hover:bg-red-200 text-xs flex items-center justify-center cursor-pointer"
                  onClick={() => removeReactant(i)}
                >×</button>
              </div>
            ))}
            <button
              class="w-10 h-10 rounded-full border-2 border-dashed border-gray-300 text-gray-400 hover:border-chem-400 hover:text-chem-600 transition-colors text-xl flex items-center justify-center"
              onClick={addReactant}
            >+</button>
          </div>

          {/* Arrow */}
          <div class="flex flex-col items-center mx-2">
            {/* Agents (above arrow) */}
            <div class="flex items-center gap-1 mb-1">
              {reaction.value.agents.map((mol, i) => (
                <div key={mol.id} class="relative flex flex-col items-center gap-1">
                  <div class="w-32 h-24 border border-dashed border-gray-200 rounded overflow-hidden">
                    <ChemEditor
                      initialSmiles={getMolSmiles(mol)}
                      onSmilesChange={(s: string) => updateAgent(i, s)}
                    />
                  </div>
                  <button
                    class="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-red-100 text-red-500 hover:bg-red-200 text-xs flex items-center justify-center cursor-pointer"
                    onClick={() => removeAgent(i)}
                  >×</button>
                </div>
              ))}
            </div>
            {/* Arrow SVG */}
            <svg width="80" height="24" viewBox="0 0 80 24" class="text-gray-600">
              <defs>
                <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
                  <path d="M 0 0 L 10 5 L 0 10 z" fill="currentColor" />
                </marker>
              </defs>
              <line x1="4" y1="12" x2="72" y2="12" stroke="currentColor" stroke-width="2" marker-end="url(#arrow)" />
            </svg>
          </div>

          {/* Products */}
          <div class="flex items-center gap-2">
            {reaction.value.products.map((mol, i) => (
              <div key={mol.id} class="relative flex flex-col items-center gap-1">
                <div class="text-xs font-semibold text-gray-400">P{i + 1}</div>
                <div class="w-48 h-36 border border-gray-200 rounded-lg overflow-hidden">
                  <ChemEditor
                    initialSmiles={getMolSmiles(mol)}
                    onSmilesChange={(s: string) => updateProduct(i, s)}
                  />
                </div>
                <button
                  class="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-red-100 text-red-500 hover:bg-red-200 text-xs flex items-center justify-center cursor-pointer"
                  onClick={() => removeProduct(i)}
                >×</button>
              </div>
            ))}
            <button
              class="w-10 h-10 rounded-full border-2 border-dashed border-gray-300 text-gray-400 hover:border-chem-400 hover:text-chem-600 transition-colors text-xl flex items-center justify-center"
              onClick={addProduct}
            >+</button>
          </div>
        </div>

        {/* Status bar */}
        <div class="bg-gray-50 border-t border-gray-200 px-4 py-1.5 text-xs text-gray-500 flex items-center justify-between">
          <span>
            {reaction.value.reactants.length} reactant(s) · {reaction.value.agents.length} agent(s) · {reaction.value.products.length} product(s)
          </span>
          <span class="font-mono">{reactionSmiles.value}</span>
        </div>
      </div>
    )
  }
})
