<template>
  <div class="reaction-editor flex flex-col h-full min-h-[500px] bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
    <!-- Header -->
    <div class="flex items-center justify-between bg-gray-50 border-b border-gray-200 px-4 py-2">
      <h3 class="text-sm font-semibold text-gray-700">Reaction Editor</h3>
      <div class="flex items-center gap-2">
        <button class="toolbar-btn text-xs" @click="addReactant">+ Reactant</button>
        <button class="toolbar-btn text-xs" @click="addAgent">+ Agent</button>
        <button class="toolbar-btn text-xs" @click="addProduct">+ Product</button>
        <button class="toolbar-btn text-xs text-red-500" @click="clearReaction">Clear</button>
      </div>
    </div>

    <!-- Reaction canvas -->
    <div class="flex flex-1 overflow-auto items-center px-4 py-6 gap-2 min-h-0">
      <!-- Reactants -->
      <div class="flex items-center gap-2">
        <div
          v-for="(mol, i) in reaction.reactants"
          :key="mol.id"
          class="reaction-mol-slot"
        >
          <div class="reaction-mol-label">R{{ i + 1 }}</div>
          <div class="w-48 h-36 border border-gray-200 rounded-lg overflow-hidden">
            <ChemEditor
              :initial-smiles="getMolSmiles(mol)"
              @smiles-change="updateReactant(i, $event)"
            />
          </div>
          <button class="reaction-mol-remove" @click="removeReactant(i)">×</button>
        </div>
        <button
          class="w-10 h-10 rounded-full border-2 border-dashed border-gray-300 text-gray-400 hover:border-chem-400 hover:text-chem-600 transition-colors text-xl flex items-center justify-center"
          @click="addReactant"
        >+</button>
      </div>

      <!-- Arrow -->
      <div class="flex flex-col items-center mx-2">
        <!-- Agents (above arrow) -->
        <div class="flex items-center gap-1 mb-1">
          <div
            v-for="(mol, i) in reaction.agents"
            :key="mol.id"
            class="reaction-mol-slot"
          >
            <div class="w-32 h-24 border border-dashed border-gray-200 rounded overflow-hidden">
              <ChemEditor
                :initial-smiles="getMolSmiles(mol)"
                @smiles-change="updateAgent(i, $event)"
              />
            </div>
            <button class="reaction-mol-remove" @click="removeAgent(i)">×</button>
          </div>
        </div>
        <!-- Arrow SVG -->
        <svg width="80" height="24" viewBox="0 0 80 24" class="text-gray-600">
          <defs>
            <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="currentColor" />
            </marker>
          </defs>
          <line x1="4" y1="12" x2="72" y2="12" stroke="currentColor" stroke-width="2" marker-end="url(#arrow)" />
        </svg>
      </div>

      <!-- Products -->
      <div class="flex items-center gap-2">
        <div
          v-for="(mol, i) in reaction.products"
          :key="mol.id"
          class="reaction-mol-slot"
        >
          <div class="reaction-mol-label">P{{ i + 1 }}</div>
          <div class="w-48 h-36 border border-gray-200 rounded-lg overflow-hidden">
            <ChemEditor
              :initial-smiles="getMolSmiles(mol)"
              @smiles-change="updateProduct(i, $event)"
            />
          </div>
          <button class="reaction-mol-remove" @click="removeProduct(i)">×</button>
        </div>
        <button
          class="w-10 h-10 rounded-full border-2 border-dashed border-gray-300 text-gray-400 hover:border-chem-400 hover:text-chem-600 transition-colors text-xl flex items-center justify-center"
          @click="addProduct"
        >+</button>
      </div>
    </div>

    <!-- Status bar -->
    <div class="bg-gray-50 border-t border-gray-200 px-4 py-1.5 text-xs text-gray-500 flex items-center justify-between">
      <span>{{ reaction.reactants.length }} reactant(s) · {{ reaction.agents.length }} agent(s) · {{ reaction.products.length }} product(s)</span>
      <span class="font-mono">{{ reactionSmiles }}</span>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import ChemEditor from './ChemEditor.vue'
import { Reaction } from '@/lib/chemistry/reaction.js'
import { Molecule } from '@/lib/chemistry/molecule.js'
import { moleculeToSmiles, smilesParser } from '@/lib/chemistry/smiles.js'
import { generate2DCoordinates } from '@/lib/chemistry/layout2d.js'

const emit = defineEmits(['change'])

const reaction = ref(new Reaction())
const molSmiles = ref(new Map())  // mol.id → smiles

function getMolSmiles(mol) {
  return molSmiles.value.get(mol.id) ?? moleculeToSmiles(mol)
}

function updateReactant(i, smiles) {
  const mol = reaction.value.reactants[i]
  if (mol) molSmiles.value.set(mol.id, smiles)
  emitChange()
}

function updateAgent(i, smiles) {
  const mol = reaction.value.agents[i]
  if (mol) molSmiles.value.set(mol.id, smiles)
  emitChange()
}

function updateProduct(i, smiles) {
  const mol = reaction.value.products[i]
  if (mol) molSmiles.value.set(mol.id, smiles)
  emitChange()
}

function newEmptyMol() {
  const mol = new Molecule()
  return mol
}

function addReactant() { reaction.value.addReactant(newEmptyMol()) }
function addAgent()    { reaction.value.addAgent(newEmptyMol()) }
function addProduct()  { reaction.value.addProduct(newEmptyMol()) }

function removeReactant(i) { reaction.value.reactants.splice(i, 1) }
function removeAgent(i)    { reaction.value.agents.splice(i, 1) }
function removeProduct(i)  { reaction.value.products.splice(i, 1) }

function clearReaction() {
  reaction.value = new Reaction()
  molSmiles.value = new Map()
}

const reactionSmiles = computed(() => {
  const rParts = reaction.value.reactants.map((m) => getMolSmiles(m) || '*')
  const aParts = reaction.value.agents.map((m) => getMolSmiles(m) || '*')
  const pParts = reaction.value.products.map((m) => getMolSmiles(m) || '*')
  const r = rParts.join('.')
  const a = aParts.join('.')
  const p = pParts.join('.')
  return `${r}>${a}>${p}`
})

function emitChange() {
  emit('change', {
    reactionSmiles: reactionSmiles.value,
    reaction: reaction.value.toJSON(),
  })
}
</script>

<style scoped>
.toolbar-btn {
  @apply inline-flex items-center justify-center rounded px-2 py-1 text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors text-xs;
}
.reaction-mol-slot {
  @apply relative flex flex-col items-center gap-1;
}
.reaction-mol-label {
  @apply text-xs font-semibold text-gray-400;
}
.reaction-mol-remove {
  @apply absolute -top-2 -right-2 w-5 h-5 rounded-full bg-red-100 text-red-500 hover:bg-red-200 text-xs flex items-center justify-center cursor-pointer;
}
</style>
