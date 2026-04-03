/**
 * useRest – Vue composable for the REST API client.
 */
import { ref } from 'vue'
import { createRestClient } from '@/lib/rest/client.js'

export function useRest(baseUrl = null) {
  const url    = baseUrl ?? (import.meta.env?.VITE_REST_URL ?? 'http://localhost:8000/api/v1')
  const client = createRestClient(url)
  const loading = ref(false)
  const error   = ref(null)

  async function call(fn) {
    loading.value = true
    error.value   = null
    try {
      return await fn(client)
    } catch (e) {
      error.value = e.message ?? String(e)
      throw e
    } finally {
      loading.value = false
    }
  }

  function getProperties(smiles) {
    return call((c) => c.getProperties(smiles))
  }

  function canonicalize(smiles) {
    return call((c) => c.canonicalize(smiles))
  }

  function convertFormat(data, fromFormat, toFormat) {
    return call((c) => c.convertFormat(data, fromFormat, toFormat))
  }

  function depict2D(smiles, width = 300, height = 200) {
    return call((c) => c.depict2D(smiles, width, height))
  }

  function search(query, searchType = 'substructure') {
    return call((c) => c.search(query, searchType))
  }

  function listMolecules(page = 1, pageSize = 20) {
    return call((c) => c.listMolecules(page, pageSize))
  }

  function saveMolecule(molecule) {
    return call((c) => c.saveMolecule(molecule))
  }

  function deleteMolecule(id) {
    return call((c) => c.deleteMolecule(id))
  }

  return {
    loading,
    error,
    getProperties,
    canonicalize,
    convertFormat,
    depict2D,
    search,
    listMolecules,
    saveMolecule,
    deleteMolecule,
  }
}
