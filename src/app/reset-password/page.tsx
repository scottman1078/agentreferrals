'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setLoading(true)
    const supabase = createClient()
    const { error: updateError } = await supabase.auth.updateUser({ password })
    setLoading(false)

    if (updateError) {
      setError(updateError.message)
      return
    }

    setSuccess(true)
    setTimeout(() => {
      router.push('/dashboard')
    }, 2000)
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-[420px] max-w-full rounded-2xl border border-border bg-card p-10 shadow-2xl">
        <div className="flex items-center gap-2.5 mb-2">
          <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center font-extrabold text-sm text-primary-foreground">
            A
          </div>
          <span className="font-extrabold text-xl tracking-tight">
            Agent<span className="text-primary">Referrals</span>
            
          </span>
        </div>
        <p className="text-sm text-muted-foreground mb-6">
          {success ? 'Your password has been updated.' : 'Enter your new password below.'}
        </p>

        {success ? (
          <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-sm font-medium text-center">
            Password updated successfully. Redirecting to dashboard...
          </div>
        ) : (
          <>
            {error && (
              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs font-medium mb-4">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                New Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-primary/50"
                placeholder="At least 6 characters"
                required
                minLength={6}
              />
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                Confirm Password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm mb-6 focus:outline-none focus:ring-2 focus:ring-primary/50"
                placeholder="Re-enter your password"
                required
                minLength={6}
              />
              <button
                type="submit"
                disabled={loading}
                className="w-full h-11 rounded-lg bg-primary text-primary-foreground font-bold text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {loading ? 'Updating...' : 'Update Password'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
