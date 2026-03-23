'use client'

import { useState } from 'react'
import { useCrmConnections, type CrmConnection } from '@/hooks/use-crm'
import {
  RefreshCw,
  Check,
  X,
  AlertCircle,
  Loader2,
  Link2,
  Unlink,
  TestTube,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { buildOAuthAuthorizeUrl, getCallbackUrl, FUB_CONFIG, buildLoftyAuthorizeUrl, LOFTY_CONFIG } from '@/lib/integration-utils'

interface ProviderConfig {
  id: 'fub' | 'lofty'
  name: string
  description: string
  authType: 'oauth' | 'apikey'
  placeholder?: string
  helpText?: string
}

const PROVIDERS: ProviderConfig[] = [
  {
    id: 'fub',
    name: 'Follow Up Boss',
    description: 'Sync contacts from your FUB account',
    authType: 'oauth',
    helpText: 'You\'ll be redirected to Follow Up Boss to authorize access.',
  },
  {
    id: 'lofty',
    name: 'Lofty',
    description: 'Sync contacts from your Lofty CRM',
    authType: 'oauth',
    helpText: 'You\'ll be redirected to Lofty to authorize access.',
  },
]

export function CrmConnections() {
  const {
    connections,
    loading,
    connect,
    disconnect,
    testConnection,
    sync,
    getConnection,
  } = useCrmConnections()

  if (loading) {
    return (
      <div className="rounded-xl border border-border bg-card p-6">
        <h3 className="font-bold text-sm mb-4">CRM Integrations</h3>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <div className="mb-4">
        <h3 className="font-bold text-sm">CRM Integrations</h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          Connect your CRM to import contacts for referrals
        </p>
      </div>

      <div className="space-y-3">
        {PROVIDERS.map((provider) => (
          <CrmProviderCard
            key={provider.id}
            provider={provider}
            connection={getConnection(provider.id)}
            onConnect={connect}
            onDisconnect={disconnect}
            onTestConnection={testConnection}
            onSync={sync}
          />
        ))}
      </div>
    </div>
  )
}

interface CrmProviderCardProps {
  provider: ProviderConfig
  connection: CrmConnection | null
  onConnect: (provider: string, apiKey: string) => Promise<CrmConnection>
  onDisconnect: (provider: string) => Promise<void>
  onTestConnection: (provider: string, apiKey: string) => Promise<{ valid: boolean; error?: string }>
  onSync: (provider: string) => Promise<{ synced: number }>
}

function CrmProviderCard({
  provider,
  connection,
  onConnect,
  onDisconnect,
  onTestConnection,
  onSync,
}: CrmProviderCardProps) {
  const [expanded, setExpanded] = useState(false)
  const [apiKey, setApiKey] = useState('')
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ valid: boolean; error?: string } | null>(null)
  const [connecting, setConnecting] = useState(false)
  const [disconnecting, setDisconnecting] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isConnected = connection?.status === 'connected'
  const hasError = connection?.status === 'error'

  async function handleTest() {
    if (!apiKey.trim()) return
    setTesting(true)
    setTestResult(null)
    setError(null)
    try {
      const result = await onTestConnection(provider.id, apiKey)
      setTestResult(result)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setTesting(false)
    }
  }

  async function handleConnect() {
    if (!apiKey.trim()) return
    setConnecting(true)
    setError(null)
    try {
      await onConnect(provider.id, apiKey)
      setApiKey('')
      setExpanded(false)
      setTestResult(null)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setConnecting(false)
    }
  }

  async function handleDisconnect() {
    setDisconnecting(true)
    setError(null)
    try {
      await onDisconnect(provider.id)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setDisconnecting(false)
    }
  }

  async function handleSync() {
    setSyncing(true)
    setError(null)
    try {
      await onSync(provider.id)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setSyncing(false)
    }
  }

  return (
    <div className="rounded-lg border border-border bg-background overflow-hidden">
      {/* Header Row */}
      <div className="flex items-center gap-3 p-3">
        {/* Provider logo */}
        <div className="w-10 h-10 rounded-lg bg-muted/50 flex items-center justify-center overflow-hidden shrink-0">
          {provider.id === 'fub' && (
            <img src="/logos/fub.png" alt="Follow Up Boss" className="w-8 h-8 object-contain dark:brightness-0 dark:invert" />
          )}
          {provider.id === 'lofty' && (
            <img src="/logos/lofty.webp" alt="Lofty" className="w-8 h-8 object-contain dark:brightness-0 dark:invert" />
          )}
        </div>
        {/* Provider name + status */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm">{provider.name}</span>
            {isConnected && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                <Check className="w-3 h-3" />
                Connected
              </span>
            )}
            {hasError && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-red-500 bg-red-500/10 px-1.5 py-0.5 rounded">
                <AlertCircle className="w-3 h-3" />
                Error
              </span>
            )}
          </div>
          <p className="text-[11px] text-muted-foreground">{provider.description}</p>
        </div>

        {/* Stats when connected */}
        {isConnected && connection && (
          <div className="text-right shrink-0 mr-2">
            <div className="text-xs font-semibold">{connection.contact_count} contacts</div>
            {connection.last_synced_at && (
              <div className="text-[10px] text-muted-foreground">
                Synced {formatRelativeTime(connection.last_synced_at)}
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-1.5 shrink-0">
          {isConnected && (
            <>
              <button
                onClick={handleSync}
                disabled={syncing}
                className="h-8 px-2.5 rounded-md border border-border text-xs font-semibold hover:bg-accent transition-colors disabled:opacity-50 flex items-center gap-1"
                title="Sync contacts"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
                {syncing ? 'Syncing...' : 'Sync'}
              </button>
              <button
                onClick={handleDisconnect}
                disabled={disconnecting}
                className="h-8 px-2.5 rounded-md border border-red-200 text-red-500 text-xs font-semibold hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50 flex items-center gap-1"
              >
                <Unlink className="w-3.5 h-3.5" />
                {disconnecting ? '...' : 'Disconnect'}
              </button>
            </>
          )}
          {!isConnected && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="h-8 px-3 rounded-md bg-primary text-primary-foreground text-xs font-bold hover:opacity-90 transition-opacity flex items-center gap-1"
            >
              <Link2 className="w-3.5 h-3.5" />
              Connect
              {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
          )}
        </div>
      </div>

      {/* Expandable Connect Form */}
      {expanded && !isConnected && (
        <div className="border-t border-border p-3 bg-muted/30 space-y-3">
          {provider.authType === 'oauth' ? (
            /* OAuth flow for FUB and Lofty */
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">{provider.helpText}</p>
              {error && (
                <div className="text-xs p-2 rounded-md bg-red-500/10 text-red-600 dark:text-red-400">{error}</div>
              )}
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    if (provider.id === 'fub') {
                      const authUrl = buildOAuthAuthorizeUrl({
                        authorizeUrl: FUB_CONFIG.authorizeUrl,
                        clientId: FUB_CONFIG.clientId,
                        redirectUri: getCallbackUrl('fub'),
                      })
                      window.location.href = authUrl
                    } else if (provider.id === 'lofty') {
                      const authUrl = buildLoftyAuthorizeUrl(LOFTY_CONFIG.clientId)
                      window.location.href = authUrl
                    }
                  }}
                  className={`h-9 px-4 rounded-md text-white text-xs font-bold hover:opacity-90 transition-opacity flex items-center gap-2 ${
                    provider.id === 'fub' ? 'bg-[#0052CC]' : 'bg-[#6366F1]'
                  }`}
                >
                  <Link2 className="w-3.5 h-3.5" />
                  Connect with {provider.name}
                </button>
                <button
                  onClick={() => { setExpanded(false); setError(null) }}
                  className="h-9 px-3 rounded-md border border-border text-xs font-semibold hover:bg-accent transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            /* API Key flow (generic fallback) */
            <>
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                  API Key
                </label>
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => {
                    setApiKey(e.target.value)
                    setTestResult(null)
                    setError(null)
                  }}
                  className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  placeholder={provider.placeholder}
                />
                <p className="text-[10px] text-muted-foreground mt-1">{provider.helpText}</p>
              </div>

              {testResult && (
                <div className={`text-xs p-2 rounded-md ${testResult.valid ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-red-500/10 text-red-600 dark:text-red-400'}`}>
                  {testResult.valid ? 'Connection successful!' : testResult.error ?? 'Invalid API key'}
                </div>
              )}

              {error && (
                <div className="text-xs p-2 rounded-md bg-red-500/10 text-red-600 dark:text-red-400">{error}</div>
              )}

              <div className="flex gap-2">
                <button
                  onClick={handleTest}
                  disabled={!apiKey.trim() || testing}
                  className="h-8 px-3 rounded-md border border-border text-xs font-semibold hover:bg-accent transition-colors disabled:opacity-40 flex items-center gap-1"
                >
                  <TestTube className="w-3.5 h-3.5" />
                  {testing ? 'Testing...' : 'Test Connection'}
                </button>
                <button
                  onClick={handleConnect}
                  disabled={!apiKey.trim() || connecting}
                  className="h-8 px-3 rounded-md bg-primary text-primary-foreground text-xs font-bold hover:opacity-90 transition-opacity disabled:opacity-40 flex items-center gap-1"
                >
                  {connecting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  {connecting ? 'Connecting...' : 'Save & Connect'}
                </button>
                <button
                  onClick={() => { setExpanded(false); setApiKey(''); setTestResult(null); setError(null) }}
                  className="h-8 px-3 rounded-md border border-border text-xs font-semibold hover:bg-accent transition-colors"
                >
                  Cancel
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  const diffHr = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHr / 24)

  if (diffMin < 1) return 'just now'
  if (diffMin < 60) return `${diffMin}m ago`
  if (diffHr < 24) return `${diffHr}h ago`
  if (diffDay < 7) return `${diffDay}d ago`
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}
