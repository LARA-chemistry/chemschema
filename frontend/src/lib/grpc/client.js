/**
 * gRPC-web client for ChemSchemaService.
 *
 * This module wraps the gRPC-web transport.  In production it should be
 * generated from the proto file via `protoc` + the grpc-web plugin.
 * Here we provide a thin hand-written wrapper that uses the Fetch API to
 * call a grpc-web compatible endpoint (e.g. Envoy proxy → gRPC backend).
 *
 * Usage:
 *   import { createGrpcClient } from '@/lib/grpc/client.js'
 *   const client = createGrpcClient('http://localhost:8080')
 *   const props = await client.getProperties({ smiles: 'c1ccccc1' })
 */

// ─── Protocol-Buffer binary helpers (base-64 framing used by gRPC-web) ───────
// When grpc-web is available as a generated client, replace this section with
// the generated `ChemSchemaServiceClient`.

const CONTENT_TYPE_GRPC_WEB = 'application/grpc-web+proto'
const CONTENT_TYPE_GRPC_WEB_TEXT = 'application/grpc-web-text'

/**
 * Encode a raw protobuf payload into a gRPC-web message frame.
 * Frame format: [1 byte flags][4 bytes length][payload]
 */
function encodeGrpcFrame(payload) {
  const view = new Uint8Array(5 + payload.byteLength)
  view[0] = 0  // no compression
  const len = payload.byteLength
  view[1] = (len >>> 24) & 0xff
  view[2] = (len >>> 16) & 0xff
  view[3] = (len >>>  8) & 0xff
  view[4] =  len         & 0xff
  view.set(new Uint8Array(payload), 5)
  return view.buffer
}

/**
 * Decode the first gRPC-web message frame from a response buffer.
 */
function decodeGrpcFrame(buffer) {
  const view = new DataView(buffer)
  const compressed = view.getUint8(0)
  const length = view.getUint32(1, false)
  return new Uint8Array(buffer, 5, length)
}

// ─── JSON/REST fallback transport ─────────────────────────────────────────────

/**
 * Minimal gRPC-web client that falls back to a JSON REST API when the
 * binary proto transport is unavailable.  This is the recommended approach
 * for development; in production use the generated grpc-web client.
 */
export function createGrpcClient(baseUrl, options = {}) {
  const url = baseUrl.replace(/\/$/, '')

  async function call(method, payload) {
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
    /**
     * Convert a molecule between chemistry formats.
     * @param {{ data: string, fromFormat: string, toFormat: string }} req
     */
    async convertFormat(req) {
      return call('ConvertFormat', req)
    },

    /**
     * Canonicalize a SMILES string.
     * @param {{ smiles: string }} req
     */
    async canonicalize(req) {
      return call('Canonicalize', req)
    },

    /**
     * Get molecular properties for a SMILES string.
     * @param {{ smiles: string }} req
     */
    async getProperties(req) {
      return call('GetProperties', req)
    },

    /**
     * Generate 2D coordinates and an SVG depiction.
     * @param {{ smiles: string, width?: number, height?: number }} req
     */
    async depict2D(req) {
      return call('Depict2D', req)
    },

    /**
     * Search a server-side registry.
     * @param {{ query: string, searchType: string, threshold?: number, maxResults?: number }} req
     */
    async search(req) {
      return call('Search', req)
    },
  }
}

// ─── Singleton factory ────────────────────────────────────────────────────────

let _defaultClient = null

export function getDefaultClient() {
  if (!_defaultClient) {
    const base = import.meta.env?.VITE_GRPC_URL ?? 'http://localhost:8080'
    _defaultClient = createGrpcClient(base)
  }
  return _defaultClient
}

export function setDefaultClient(client) {
  _defaultClient = client
}
