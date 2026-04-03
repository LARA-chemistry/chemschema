/**
 * useRest – Vue composable for the REST API client.
 */
import { ref } from 'vue'
import { createRestClient, type RestClient } from '@/lib/rest/client'

export function useRest(baseUrl: string | null = null) {
  const url    = baseUrl ?? ((import.meta as Record<string, unknown> & { env?: Record<string, string> }).env?.VITE_REST_URL ?? 'http://localhost:8000/api/v1')
  const client = createRestClient(url)
  const loading = ref(false)
  const error   = ref<string | null>(null)

  async function call<T>(fn: (c: RestClient) => Promise<T>): Promise<T> {
    loading.value = true
    error.value   = null
    try {
      return await fn(client)
    } catch (e) {
      error.value = (e instanceof Error ? e.message : null) ?? String(e)
      throw e
    } finally {
      loading.value = false
    }
  }

  function getProperties(smiles: string)  { return call((c) => c.getProperties(smiles) as Promise<unknown>) }
  function canonicalize(smiles: string)   { return call((c) => c.canonicalize(smiles) as Promise<unknown>) }
  function convertFormat(data: string, fromFormat: string, toFormat: string) {
    return call((c) => c.convertFormat(data, fromFormat, toFormat) as Promise<unknown>)
  }
  function depict2D(smiles: string, width = 300, height = 200) {
    return call((c) => c.depict2D(smiles, width, height) as Promise<unknown>)
  }
  function search(query: string, searchType = 'substructure') {
    return call((c) => c.search(query, searchType) as Promise<unknown>)
  }
  function listMolecules(page = 1, pageSize = 20) {
    return call((c) => c.listMolecules(page, pageSize) as Promise<unknown>)
  }
  function saveMolecule(molecule: unknown) {
    return call((c) => c.saveMolecule(molecule) as Promise<unknown>)
  }
  function deleteMolecule(id: string) {
    return call((c) => c.deleteMolecule(id) as Promise<unknown>)
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
