/**
 * Dropbox Sign (HelloSign) utility
 *
 * Placeholder config — add DROPBOX_SIGN_API_KEY to .env.local when ready.
 * When no API key is set, the send/status API routes return mock responses.
 */

export function isSignConfigured(): boolean {
  return Boolean(process.env.DROPBOX_SIGN_API_KEY)
}

export function getApiKey(): string | null {
  return process.env.DROPBOX_SIGN_API_KEY || null
}
