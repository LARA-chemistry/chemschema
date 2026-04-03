<template>
  <Teleport to="body">
    <div
      v-if="modelValue"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      @click.self="$emit('update:modelValue', false)"
    >
      <div class="bg-white rounded-xl shadow-2xl w-[480px] max-w-[95vw] overflow-hidden">
        <!-- Header -->
        <div class="flex items-center justify-between px-5 py-3 border-b border-gray-200">
          <h2 class="text-lg font-semibold text-gray-800">Export Structure</h2>
          <button
            class="text-gray-400 hover:text-gray-600 transition-colors"
            @click="$emit('update:modelValue', false)"
          >
            <svg class="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
            </svg>
          </button>
        </div>

        <!-- Format selector -->
        <div class="px-5 py-4 border-b border-gray-100">
          <div class="flex flex-wrap gap-2">
            <button
              v-for="fmt in formats"
              :key="fmt.id"
              class="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border"
              :class="selectedFormat === fmt.id
                ? 'bg-chem-600 text-white border-chem-600'
                : 'text-gray-600 border-gray-300 hover:border-chem-400 hover:text-chem-700'"
              @click="selectedFormat = fmt.id"
            >
              {{ fmt.label }}
            </button>
          </div>
        </div>

        <!-- Preview -->
        <div class="px-5 py-3">
          <label class="text-xs font-semibold text-gray-500 uppercase tracking-wide">Preview</label>
          <pre class="mt-1 bg-gray-50 border border-gray-200 rounded-lg p-3 text-xs font-mono overflow-auto max-h-48 whitespace-pre-wrap break-all">{{ preview }}</pre>
        </div>

        <!-- Actions -->
        <div class="flex items-center justify-end gap-2 px-5 py-3 bg-gray-50 border-t border-gray-200">
          <button
            class="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors"
            @click="$emit('update:modelValue', false)"
          >Cancel</button>
          <button
            class="px-4 py-2 rounded-lg text-sm font-medium bg-chem-600 text-white hover:bg-chem-700 transition-colors"
            @click="copyToClipboard"
          >
            <span v-if="copied">✓ Copied!</span>
            <span v-else>Copy to clipboard</span>
          </button>
          <button
            class="px-4 py-2 rounded-lg text-sm font-medium bg-chem-600 text-white hover:bg-chem-700 transition-colors"
            @click="download"
          >Download</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  exportFn:   { type: Function, required: true },
})

const emit = defineEmits(['update:modelValue'])

const formats = [
  { id: 'smiles',  label: 'SMILES',   ext: 'smi'  },
  { id: 'mol',     label: 'MOL',      ext: 'mol'  },
  { id: 'sdf',     label: 'SDF',      ext: 'sdf'  },
  { id: 'json',    label: 'JSON',     ext: 'json' },
]

const selectedFormat = ref('smiles')
const copied = ref(false)

const preview = computed(() => {
  try {
    return props.exportFn(selectedFormat.value) ?? ''
  } catch {
    return ''
  }
})

function copyToClipboard() {
  const text = preview.value
  if (!text) return
  navigator.clipboard?.writeText(text).then(() => {
    copied.value = true
    setTimeout(() => (copied.value = false), 2000)
  })
}

function download() {
  const text = preview.value
  if (!text) return
  const fmt = formats.find((f) => f.id === selectedFormat.value)
  const blob = new Blob([text], { type: 'text/plain' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = `molecule.${fmt?.ext ?? 'txt'}`
  a.click()
  URL.revokeObjectURL(url)
}
</script>
