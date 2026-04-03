/**
 * gRPC-web client for ChemSchemaService built on the ConnectRPC framework.
 *
 * Uses @connectrpc/connect-web for the Connect-protocol transport and
 * @connectrpc/connect for structured error handling.
 *
 * The Connect JSON protocol is wire-compatible with the backend's gRPC-web
 * endpoint via an Envoy/grpc-web proxy.  For full type-safe integration run
 * `npm run proto:gen` (buf) to generate service stubs from
 * proto/chemschema.proto, then replace the fetch calls below with:
 *
 *   import { createClient } from "@connectrpc/connect";
 *   import { ChemSchemaService } from "../../gen/chemschema_connect";
 *   const client = createClient(ChemSchemaService, getTransport(baseUrl));
 *
 * Usage (current JSON client):
 *   import { createGrpcClient } from '@/lib/grpc/client'
 *   const client = createGrpcClient('http://localhost:8080')
 *   const props  = await client.getProperties({ smiles: 'c1ccccc1' })
 */

import { Code, ConnectError } from '@connectrpc/connect'
import { createConnectTransport } from '@connectrpc/connect-web'

// ── Request / response interfaces ─────────────────────────────────────────────

export interface GrpcClientOptions {
  headers?: Record<string, string>
  signal?: AbortSignal
}

export interface ConvertFormatRequest {
  data: string
  fromFormat: string
  toFormat: string
}

export interface CanonicalizeRequest    { smiles: string }
export interface GetPropertiesRequest  { smiles: string }
export interface Depict2DRequest       { smiles: string; width?: number; height?: number }
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

// ── Transport factory ─────────────────────────────────────────────────────────

/**
 * Create a ConnectRPC transport configured for the given base URL.
 *
 * Callers who have protobuf-generated service stubs can use this transport
 * directly with `createClient(ChemSchemaService, getTransport(baseUrl))`.
 */
export function getTransport(baseUrl: string) {
  return createConnectTransport({
    baseUrl: baseUrl.replace(/\/$/, ''),
    useBinaryFormat: false, // JSON encoding – compatible without protoc-generated types
  })
}

// ── Connect-error code mapping ────────────────────────────────────────────────

/** Map a Connect error-code string (snake_case) to a @connectrpc/connect Code. */
function mapConnectCode(code: string): Code {
  const map: Record<string, Code> = {
    canceled:             Code.Canceled,
    unknown:              Code.Unknown,
    invalid_argument:     Code.InvalidArgument,
    deadline_exceeded:    Code.DeadlineExceeded,
    not_found:            Code.NotFound,
    already_exists:       Code.AlreadyExists,
    permission_denied:    Code.PermissionDenied,
    resource_exhausted:   Code.ResourceExhausted,
    failed_precondition:  Code.FailedPrecondition,
    aborted:              Code.Aborted,
    out_of_range:         Code.OutOfRange,
    unimplemented:        Code.Unimplemented,
    internal:             Code.Internal,
    unavailable:          Code.Unavailable,
    data_loss:            Code.DataLoss,
    unauthenticated:      Code.Unauthenticated,
  }
  return map[code] ?? Code.Unknown
}

// ── Client factory ────────────────────────────────────────────────────────────

export function createGrpcClient(baseUrl: string, options: GrpcClientOptions = {}): GrpcClient {
  const url = baseUrl.replace(/\/$/, '')

  /**
   * Make a unary RPC call using the Connect JSON protocol wire format.
   * This produces the same HTTP framing as the ConnectRPC transport for
   * unary calls, allowing interoperability with the generated-code client.
   */
  async function call<T>(method: string, payload: unknown): Promise<T> {
    const endpoint = `${url}/chemschema.ChemSchemaService/${method}`

    let res: Response
    try {
      res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          // Connect JSON protocol headers (identical to createConnectTransport output)
          'Content-Type': 'application/connect+json',
          'Connect-Protocol-Version': '1',
          ...options.headers,
        },
        body: JSON.stringify(payload),
        signal: options.signal,
      })
    } catch (err) {
      throw ConnectError.from(err)
    }

    // The Connect protocol encodes error details in the JSON body even for
    // non-2xx responses.
    let data: Record<string, unknown>
    try {
      data = await res.json() as Record<string, unknown>
    } catch {
      throw new ConnectError(
        `${method}: failed to parse response body (HTTP ${res.status})`,
        Code.Internal,
      )
    }

    if (!res.ok || data['code']) {
      throw new ConnectError(
        typeof data['message'] === 'string' ? data['message'] : `${method} call failed`,
        typeof data['code'] === 'string' ? mapConnectCode(data['code']) : Code.Unknown,
      )
    }

    return data as T
  }

  return {
    convertFormat: (req) => call('ConvertFormat', req),
    canonicalize:  (req) => call('Canonicalize', req),
    getProperties: (req) => call('GetProperties', req),
    depict2D:      (req) => call('Depict2D', req),
    search:        (req) => call('Search', req),
  }
}

// ── Singleton factory ─────────────────────────────────────────────────────────

let _defaultClient: GrpcClient | null = null

export function getDefaultClient(): GrpcClient {
  if (!_defaultClient) {
    const base = (import.meta as Record<string, unknown> & { env?: Record<string, string> })
      .env?.VITE_GRPC_URL ?? 'http://localhost:8080'
    _defaultClient = createGrpcClient(base)
  }
  return _defaultClient
}

export function setDefaultClient(client: GrpcClient): void {
  _defaultClient = client
}

