import { createBrowserClient } from '@supabase/ssr'

let hubClient: ReturnType<typeof createBrowserClient> | null = null

export function createHubClient() {
  if (hubClient) return hubClient

  const url = process.env.NEXT_PUBLIC_HUB_URL
  const key = process.env.NEXT_PUBLIC_HUB_ANON_KEY

  if (!url || !key) {
    // Return a dummy client during build/SSG — won't be called at runtime
    return null as unknown as ReturnType<typeof createBrowserClient>
  }

  hubClient = createBrowserClient(url, key)
  return hubClient
}
