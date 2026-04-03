import { defineComponent, ref } from 'vue'
import ChemEditor     from '../src/components/ChemEditor'
import ReactionEditor from '../src/components/ReactionEditor'
import '../src/style.css'

interface Example { label: string; smiles: string }

export default defineComponent({
  name: 'App',
  setup() {
    const mode          = ref('molecule')
    const editorRef     = ref<InstanceType<typeof ChemEditor> | null>(null)
    const currentSmiles = ref('')
    const smilesInput   = ref('')
    const reactionSmiles = ref('')

    const examples: Example[] = [
      { label: 'Benzene',     smiles: 'c1ccccc1' },
      { label: 'Aspirin',     smiles: 'CC(=O)Oc1ccccc1C(=O)O' },
      { label: 'Caffeine',    smiles: 'Cn1cnc2c1c(=O)n(c(=O)n2C)C' },
      { label: 'Glucose',     smiles: 'OC[C@H]1OC(O)[C@H](O)[C@@H](O)[C@@H]1O' },
      { label: 'Ethanol',     smiles: 'CCO' },
      { label: 'Acetic acid', smiles: 'CC(=O)O' },
    ]

    function loadExample(smiles: string) {
      smilesInput.value = smiles
      editorRef.value?.loadSmiles(smiles)
    }

    function loadSmiles() {
      if (smilesInput.value.trim()) {
        editorRef.value?.loadSmiles(smilesInput.value.trim())
      }
    }

    function onReactionChange({ reactionSmiles: rs }: { reactionSmiles: string }) {
      reactionSmiles.value = rs
    }

    const btnMolActive = 'bg-chem-600 text-white'
    const btnInactive  = 'text-gray-600 hover:bg-gray-100'

    return () => (
      <div class="min-h-screen bg-gradient-to-br from-chem-50 to-blue-50 flex flex-col">
        {/* Nav */}
        <header class="bg-white border-b border-gray-200 px-6 py-3 flex items-center gap-3 shadow-sm">
          <svg class="w-8 h-8 text-chem-600" viewBox="0 0 32 32" fill="currentColor">
            <circle cx="16" cy="16" r="4" />
            <circle cx="4"  cy="16" r="3" fill="none" stroke="currentColor" stroke-width="2"/>
            <circle cx="28" cy="16" r="3" fill="none" stroke="currentColor" stroke-width="2"/>
            <circle cx="16" cy="4"  r="3" fill="none" stroke="currentColor" stroke-width="2"/>
            <circle cx="16" cy="28" r="3" fill="none" stroke="currentColor" stroke-width="2"/>
            <line x1="7"  y1="16" x2="12" y2="16" stroke="currentColor" stroke-width="2"/>
            <line x1="20" y1="16" x2="25" y2="16" stroke="currentColor" stroke-width="2"/>
            <line x1="16" y1="7"  x2="16" y2="12" stroke="currentColor" stroke-width="2"/>
            <line x1="16" y1="20" x2="16" y2="25" stroke="currentColor" stroke-width="2"/>
          </svg>
          <h1 class="text-xl font-bold text-gray-900">ChemSchema Editor</h1>
          <span class="ml-2 text-xs bg-chem-100 text-chem-700 rounded px-2 py-0.5 font-semibold">Demo</span>
          <nav class="ml-auto flex items-center gap-2">
            <button
              class={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${mode.value === 'molecule' ? btnMolActive : btnInactive}`}
              onClick={() => (mode.value = 'molecule')}
            >Molecule</button>
            <button
              class={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${mode.value === 'reaction' ? btnMolActive : btnInactive}`}
              onClick={() => (mode.value = 'reaction')}
            >Reaction</button>
          </nav>
        </header>

        <main class="flex-1 flex flex-col gap-4 p-6 max-w-5xl mx-auto w-full">
          {/* Quick-load examples */}
          <div class="flex items-center gap-2 flex-wrap">
            <span class="text-sm text-gray-500 font-medium">Load example:</span>
            {examples.map((ex) => (
              <button
                key={ex.label}
                class="px-3 py-1 rounded-full text-xs font-semibold border border-gray-300 hover:border-chem-400 hover:text-chem-700 transition-colors"
                onClick={() => loadExample(ex.smiles)}
              >
                {ex.label}
              </button>
            ))}
          </div>

          {/* Editor */}
          <div class="flex-1 rounded-xl overflow-hidden shadow-md" style={{ height: '500px' }}>
            {mode.value === 'molecule'
              ? (
                <ChemEditor
                  ref={editorRef}
                  showInfoPanel={true}
                  onSmilesChange={(s: string) => (currentSmiles.value = s)}
                />
              )
              : (
                <ReactionEditor onChange={onReactionChange} />
              )
            }
          </div>

          {/* SMILES output (molecule mode) */}
          {mode.value === 'molecule' && (
            <div class="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
              <label class="text-xs font-semibold text-gray-500 uppercase tracking-wide">SMILES</label>
              <div class="flex items-center gap-2 mt-1">
                <input
                  value={smilesInput.value}
                  onInput={(e: Event) => (smilesInput.value = (e.target as HTMLInputElement).value)}
                  class="flex-1 font-mono text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-chem-400"
                  placeholder="Type or paste a SMILES string…"
                  onKeydown={(e: KeyboardEvent) => { if (e.key === 'Enter') loadSmiles() }}
                />
                <button
                  class="px-4 py-2 bg-chem-600 text-white text-sm font-medium rounded-lg hover:bg-chem-700 transition-colors"
                  onClick={loadSmiles}
                >Load</button>
              </div>
              <p class="mt-2 text-sm font-mono text-gray-700 break-all">{currentSmiles.value}</p>
            </div>
          )}

          {/* Reaction SMILES output */}
          {mode.value === 'reaction' && (
            <div class="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
              <label class="text-xs font-semibold text-gray-500 uppercase tracking-wide">Reaction SMILES</label>
              <p class="mt-1 text-sm font-mono text-gray-700 break-all">{reactionSmiles.value || '>>'}</p>
            </div>
          )}
        </main>
      </div>
    )
  }
})
