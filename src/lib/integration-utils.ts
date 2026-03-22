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
  apiBase: 'https://api.lofty.com/v1.0',
}
