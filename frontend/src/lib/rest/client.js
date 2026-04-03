/**
 * REST API client for the ChemSchema Django backend.
 *
 * The REST endpoints mirror the gRPC service but use JSON over HTTP/1.1.
 * Base URL is read from the VITE_REST_URL environment variable (default:
 * http://localhost:8000/api/v1).
 *
 * Usage:
 *   import { createRestClient } from '@/lib/rest/client.js'
 *   const api = createRestClient('http://localhost:8000/api/v1')
 *   const props = await api.getProperties('c1ccccc1')
 */

export function createRestClient(baseUrl, options = {}) {
  const base = baseUrl.replace(/\/$/, '')

  async function post(path, body) {
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

  async function get(path, params = {}) {
    const qs = new URLSearchParams(params).toString()
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
    /** Convert between chemistry formats */
    convertFormat(data, fromFormat, toFormat) {
      return post('/convert/', { data, from_format: fromFormat, to_format: toFormat })
    },

    /** Canonicalize a SMILES string */
    canonicalize(smiles) {
      return post('/canonicalize/', { smiles })
    },

    /** Get molecular properties */
    getProperties(smiles) {
      return post('/properties/', { smiles })
    },

    /** Generate 2D coordinates + SVG */
    depict2D(smiles, width = 300, height = 200) {
      return post('/depict/', { smiles, width, height })
    },

    /** Search the molecule registry */
    search(query, searchType = 'substructure', threshold = 0.7, maxResults = 50) {
      return post('/search/', {
        query,
        search_type: searchType,
        threshold,
        max_results: maxResults,
      })
    },

    /** List molecules in the registry */
    listMolecules(page = 1, pageSize = 20) {
      return get('/molecules/', { page, page_size: pageSize })
    },

    /** Get a single molecule by ID */
    getMolecule(id) {
      return get(`/molecules/${id}/`)
    },

    /** Save a molecule */
    saveMolecule(molecule) {
      if (molecule.id) {
        return fetch(`${base}/molecules/${molecule.id}/`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(molecule),
          signal: options.signal,
        }).then((r) => r.json())
      }
      return post('/molecules/', molecule)
    },

    /** Delete a molecule */
    deleteMolecule(id) {
      return fetch(`${base}/molecules/${id}/`, {
        method: 'DELETE',
        signal: options.signal,
      })
    },
  }
}

// ─── Singleton factory ────────────────────────────────────────────────────────

let _defaultClient = null

export function getDefaultRestClient() {
  if (!_defaultClient) {
    const base = import.meta.env?.VITE_REST_URL ?? 'http://localhost:8000/api/v1'
    _defaultClient = createRestClient(base)
  }
  return _defaultClient
}

export function setDefaultRestClient(client) {
  _defaultClient = client
}
