/**
 * gRPC-web client for ChemSchemaService.
 */

export interface GrpcClientOptions {
  headers?: Record<string, string>
  signal?: AbortSignal
}

export interface ConvertFormatRequest {
  data: string
  fromFormat: string
  toFormat: string
}

export interface CanonicalizeRequest { smiles: string }
export interface GetPropertiesRequest { smiles: string }
export interface Depict2DRequest { smiles: string; width?: number; height?: number }
export interface SearchRequest {
  query: string
  searchType: string
  threshold?: number
  maxResults?: number
}

export interface GrpcClient {
  convertFormat(req: ConvertFormatRequest): Promise<unknown>
  canonicalize(req: CanonicalizeRequest): Promise<unknown>
  getProperties(req: GetPropertiesRequest): Promise<unknown>
  depict2D(req: Depict2DRequest): Promise<unknown>
  search(req: SearchRequest): Promise<unknown>
}

export function createGrpcClient(baseUrl: string, options: GrpcClientOptions = {}): GrpcClient {
  const url = baseUrl.replace(/\/$/, '')

  async function call(method: string, payload: unknown): Promise<unknown> {
    const endpoint = `${url}/chemschema.ChemSchemaService/${method}`
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...(options.headers ?? {}),
      },
      body: JSON.stringify(payload),
      signal: options.signal,
    })
    if (!res.ok) {
      const text = await res.text()
      throw new Error(`gRPC-web call failed: ${res.status} – ${text}`)
    }
    return res.json()
  }

  return {
    async convertFormat(req: ConvertFormatRequest) { return call('ConvertFormat', req) },
    async canonicalize(req: CanonicalizeRequest)   { return call('Canonicalize', req) },
    async getProperties(req: GetPropertiesRequest) { return call('GetProperties', req) },
    async depict2D(req: Depict2DRequest)            { return call('Depict2D', req) },
    async search(req: SearchRequest)                { return call('Search', req) },
  }
}

let _defaultClient: GrpcClient | null = null

export function getDefaultClient(): GrpcClient {
  if (!_defaultClient) {
    const base = (import.meta as Record<string, unknown> & { env?: Record<string, string> }).env?.VITE_GRPC_URL ?? 'http://localhost:8080'
    _defaultClient = createGrpcClient(base)
  }
  return _defaultClient
}

export function setDefaultClient(client: GrpcClient): void {
  _defaultClient = client
}
