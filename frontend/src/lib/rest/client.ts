/**
 * REST API client for the ChemSchema Django backend.
 */

export interface RestClientOptions {
  headers?: Record<string, string>
  signal?: AbortSignal
}

export interface RestClient {
  convertFormat(data: string, fromFormat: string, toFormat: string): Promise<unknown>
  canonicalize(smiles: string): Promise<unknown>
  getProperties(smiles: string): Promise<unknown>
  depict2D(smiles: string, width?: number, height?: number): Promise<unknown>
  search(query: string, searchType?: string, threshold?: number, maxResults?: number): Promise<unknown>
  listMolecules(page?: number, pageSize?: number): Promise<unknown>
  getMolecule(id: string): Promise<unknown>
  saveMolecule(molecule: unknown): Promise<unknown>
  deleteMolecule(id: string): Promise<unknown>
}

export function createRestClient(baseUrl: string, options: RestClientOptions = {}): RestClient {
  const base = baseUrl.replace(/\/$/, '')

  async function post(path: string, body: unknown): Promise<unknown> {
    const res = await fetch(`${base}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...(options.headers ?? {}),
      },
      body: JSON.stringify(body),
      signal: options.signal,
    })
    if (!res.ok) {
      const text = await res.text()
      throw new Error(`REST call to ${path} failed: ${res.status} – ${text}`)
    }
    return res.json()
  }

  async function get(path: string, params: Record<string, unknown> = {}): Promise<unknown> {
    const qs  = new URLSearchParams(params as Record<string, string>).toString()
    const url = qs ? `${base}${path}?${qs}` : `${base}${path}`
    const res = await fetch(url, {
      headers: {
        Accept: 'application/json',
        ...(options.headers ?? {}),
      },
      signal: options.signal,
    })
    if (!res.ok) {
      const text = await res.text()
      throw new Error(`REST GET ${path} failed: ${res.status} – ${text}`)
    }
    return res.json()
  }

  return {
    convertFormat(data, fromFormat, toFormat) {
      return post('/convert/', { data, from_format: fromFormat, to_format: toFormat })
    },
    canonicalize(smiles) {
      return post('/canonicalize/', { smiles })
    },
    getProperties(smiles) {
      return post('/properties/', { smiles })
    },
    depict2D(smiles, width = 300, height = 200) {
      return post('/depict/', { smiles, width, height })
    },
    search(query, searchType = 'substructure', threshold = 0.7, maxResults = 50) {
      return post('/search/', { query, search_type: searchType, threshold, max_results: maxResults })
    },
    listMolecules(page = 1, pageSize = 20) {
      return get('/molecules/', { page, page_size: pageSize })
    },
    getMolecule(id) {
      return get(`/molecules/${id}/`)
    },
    saveMolecule(molecule) {
      const mol = molecule as { id?: string }
      if (mol.id) {
        return fetch(`${base}/molecules/${mol.id}/`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(molecule),
          signal: options.signal,
        }).then((r) => r.json())
      }
      return post('/molecules/', molecule)
    },
    deleteMolecule(id) {
      return fetch(`${base}/molecules/${id}/`, {
        method: 'DELETE',
        signal: options.signal,
      })
    },
  }
}

let _defaultClient: RestClient | null = null

export function getDefaultRestClient(): RestClient {
  if (!_defaultClient) {
    const base = (import.meta as Record<string, unknown> & { env?: Record<string, string> }).env?.VITE_REST_URL ?? 'http://localhost:8000/api/v1'
    _defaultClient = createRestClient(base)
  }
  return _defaultClient
}

export function setDefaultRestClient(client: RestClient): void {
  _defaultClient = client
}
