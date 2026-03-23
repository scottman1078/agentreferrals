/**
 * Shared integration utilities for OAuth2 flows and token management.
 * Ported from OnSpec's integration-utils.ts pattern.
 */

/* ---------- Types ---------- */

export interface OAuthTokenResponse {
  access_token: string
  refresh_token?: string
  expires_in?: number
  token_type?: string
  created_at?: number
}

/* ---------- OAuth Helpers ---------- */

/**
 * Build the callback redirect URI for a CRM integration.
 * Uses NEXT_PUBLIC_APP_URL for production, falls back to localhost.
 */
export function getCallbackUrl(integration: 'fub' | 'lofty'): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:5500'
  return `${appUrl}/api/crm/${integration}/callback`
}

/**
 * Build an OAuth2 authorization URL.
 */
export function buildOAuthAuthorizeUrl(params: {
  authorizeUrl: string
  clientId: string
  redirectUri: string
  scope?: string
  state?: string
  responseType?: string
}): string {
  const url = new URL(params.authorizeUrl)
  url.searchParams.set('client_id', params.clientId)
  url.searchParams.set('redirect_uri', params.redirectUri)
  url.searchParams.set('response_type', params.responseType || 'code')
  if (params.scope) url.searchParams.set('scope', params.scope)
  if (params.state) url.searchParams.set('state', params.state)
  return url.toString()
}

/**
 * Exchange an authorization code for tokens via the provider's token endpoint.
 */
export async function exchangeCodeForTokens(params: {
  tokenUrl: string
  code: string
  clientId: string
  clientSecret: string
  redirectUri: string
  grantType?: string
}): Promise<OAuthTokenResponse> {
  const body = new URLSearchParams({
    grant_type: params.grantType || 'authorization_code',
    code: params.code,
    client_id: params.clientId,
    client_secret: params.clientSecret,
    redirect_uri: params.redirectUri,
  })

  const response = await fetch(params.tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Token exchange failed (${response.status}): ${text.substring(0, 300)}`)
  }

  return response.json()
}

/**
 * Refresh an expired access token using a refresh token.
 */
export async function refreshAccessToken(params: {
  tokenUrl: string
  refreshToken: string
  clientId: string
  clientSecret: string
}): Promise<OAuthTokenResponse> {
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: params.refreshToken,
    client_id: params.clientId,
    client_secret: params.clientSecret,
  })

  const response = await fetch(params.tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Token refresh failed (${response.status}): ${text.substring(0, 300)}`)
  }

  return response.json()
}

/* ---------- Token Storage ---------- */

/**
 * Compute the ISO expiration timestamp from an expires_in seconds value.
 */
export function computeExpiresAt(expiresIn?: number, createdAt?: number): string | null {
  if (!expiresIn) return null
  const baseMs = createdAt ? createdAt * 1000 : Date.now()
  return new Date(baseMs + expiresIn * 1000).toISOString()
}

/**
 * Check if a token is expired or will expire within the buffer window.
 * Default buffer is 5 minutes (300 seconds).
 */
export function isTokenExpired(expiresAt: string | null, bufferSeconds = 300): boolean {
  if (!expiresAt) return false
  const expiresMs = new Date(expiresAt).getTime()
  const nowMs = Date.now() + bufferSeconds * 1000
  return nowMs >= expiresMs
}

/* ---------- FUB Config ---------- */

export const FUB_CONFIG = {
  authorizeUrl: 'https://app.followupboss.com/oauth/authorize',
  tokenUrl: 'https://app.followupboss.com/oauth/token',
  apiBase: 'https://api.followupboss.com/v1',
  clientId: process.env.NEXT_PUBLIC_FUB_CLIENT_ID || '',
  clientSecret: process.env.FUB_CLIENT_SECRET || '',
}

/* ---------- Lofty Config ---------- */

export const LOFTY_CONFIG = {
  authorizeUrl: 'https://lofty.com/page/vendor-auth.html',
  tokenUrl: 'https://crm.lofty.com/api/user-web/oauth/token',
  apiBase: 'https://api.lofty.com/v1.0',
  clientId: process.env.NEXT_PUBLIC_LOFTY_CLIENT_ID || '',
  clientSecret: process.env.LOFTY_CLIENT_SECRET || '',
}

/**
 * Build the Lofty OAuth authorize URL.
 * Lofty uses a non-standard authorize URL pattern with `clientId` param.
 */
export function buildLoftyAuthorizeUrl(clientId: string): string {
  return `${LOFTY_CONFIG.authorizeUrl}?clientId=${encodeURIComponent(clientId)}`
}

/**
 * Exchange authorization code for Lofty OAuth tokens.
 * Lofty requires Basic auth header (Base64 of client_id:client_secret).
 */
export async function exchangeLoftyCodeForTokens(params: {
  code: string
  redirectUri: string
}): Promise<OAuthTokenResponse> {
  const basicAuth = Buffer.from(
    `${LOFTY_CONFIG.clientId}:${LOFTY_CONFIG.clientSecret}`
  ).toString('base64')

  const body = new URLSearchParams({
    code: params.code,
    client_id: LOFTY_CONFIG.clientId,
    redirect_uri: params.redirectUri,
    grant_type: 'authorization_code',
  })

  const response = await fetch(LOFTY_CONFIG.tokenUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${basicAuth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Lofty token exchange failed (${response.status}): ${text.substring(0, 300)}`)
  }

  return response.json()
}

/**
 * Refresh an expired Lofty access token.
 * Lofty requires Basic auth header (Base64 of client_id:client_secret).
 */
export async function refreshLoftyAccessToken(refreshToken: string): Promise<OAuthTokenResponse> {
  const basicAuth = Buffer.from(
    `${LOFTY_CONFIG.clientId}:${LOFTY_CONFIG.clientSecret}`
  ).toString('base64')

  const body = new URLSearchParams({
    refresh_token: refreshToken,
    grant_type: 'refresh_token',
  })

  const response = await fetch(LOFTY_CONFIG.tokenUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${basicAuth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Lofty token refresh failed (${response.status}): ${text.substring(0, 300)}`)
  }

  return response.json()
}

/**
 * Get a valid Lofty access token for a connection, refreshing if expired.
 * Returns the access token string, and updates the DB row if refreshed.
 */
export async function getLoftyAccessToken(connection: {
  id: string
  access_token?: string | null
  refresh_token?: string | null
  token_expires_at?: string | null
  metadata?: Record<string, unknown>
}, adminClient: { from: (table: string) => unknown }): Promise<string> {
  const accessToken = connection.access_token
    || (connection.metadata as Record<string, unknown>)?.access_token as string | undefined

  const refreshToken = connection.refresh_token
    || (connection.metadata as Record<string, unknown>)?.refresh_token as string | undefined

  const expiresAt = connection.token_expires_at
    || (connection.metadata as Record<string, unknown>)?.token_expires_at as string | undefined

  if (!accessToken) {
    throw new Error('No Lofty access token found. Please reconnect your Lofty account.')
  }

  // If not expired, return current token
  if (!isTokenExpired(expiresAt ?? null)) {
    return accessToken
  }

  // Token expired — refresh it
  if (!refreshToken) {
    throw new Error('Lofty access token expired and no refresh token available. Please reconnect.')
  }

  const tokens = await refreshLoftyAccessToken(refreshToken)
  const newExpiresAt = computeExpiresAt(tokens.expires_in, tokens.created_at)

  // Update connection in DB
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (adminClient as any)
    .from('ar_crm_connections')
    .update({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token || refreshToken,
      token_expires_at: newExpiresAt,
      metadata: {
        ...((connection.metadata as Record<string, unknown>) ?? {}),
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token || refreshToken,
        token_expires_at: newExpiresAt,
      },
      updated_at: new Date().toISOString(),
    })
    .eq('id', connection.id)

  return tokens.access_token
}
