/**
 * useGrpc – Vue composable for the gRPC-web client.
 */
import { ref } from 'vue'
import { createGrpcClient } from '@/lib/grpc/client.js'

export function useGrpc(baseUrl = null) {
  const url    = baseUrl ?? (import.meta.env?.VITE_GRPC_URL ?? 'http://localhost:8080')
  const client = createGrpcClient(url)
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
    return call((c) => c.getProperties({ smiles }))
  }

  function canonicalize(smiles) {
    return call((c) => c.canonicalize({ smiles }))
  }

  function convertFormat(data, fromFormat, toFormat) {
    return call((c) => c.convertFormat({ data, fromFormat, toFormat }))
  }

  function depict2D(smiles, width = 300, height = 200) {
    return call((c) => c.depict2D({ smiles, width, height }))
  }

  function search(query, searchType = 'substructure') {
    return call((c) => c.search({ query, searchType }))
  }

  return { loading, error, getProperties, canonicalize, convertFormat, depict2D, search }
}
