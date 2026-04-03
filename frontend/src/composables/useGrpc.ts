/**
 * useGrpc – Vue composable for the gRPC-web client.
 */
import { ref } from 'vue'
import { createGrpcClient, type GrpcClient } from '@/lib/grpc/client'

export function useGrpc(baseUrl: string | null = null) {
  const url    = baseUrl ?? ((import.meta as Record<string, unknown> & { env?: Record<string, string> }).env?.VITE_GRPC_URL ?? 'http://localhost:8080')
  const client = createGrpcClient(url)
  const loading = ref(false)
  const error   = ref<string | null>(null)

  async function call<T>(fn: (c: GrpcClient) => Promise<T>): Promise<T> {
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

  function getProperties(smiles: string)      { return call((c) => c.getProperties({ smiles })) }
  function canonicalize(smiles: string)        { return call((c) => c.canonicalize({ smiles })) }
  function convertFormat(data: string, fromFormat: string, toFormat: string) {
    return call((c) => c.convertFormat({ data, fromFormat, toFormat }))
  }
  function depict2D(smiles: string, width = 300, height = 200) {
    return call((c) => c.depict2D({ smiles, width, height }))
  }
  function search(query: string, searchType = 'substructure') {
    return call((c) => c.search({ query, searchType }))
  }

  return { loading, error, getProperties, canonicalize, convertFormat, depict2D, search }
}
