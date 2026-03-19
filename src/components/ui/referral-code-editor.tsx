'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Check, X, Loader2, Pencil } from 'lucide-react'

const CODE_REGEX = /^[a-z0-9-]+$/

interface ReferralCodeEditorProps {
  currentCode: string
  userId: string
  onSaved: (newCode: string) => void
  /** Render as compact "Customize" link instead of "Edit" button */
  compact?: boolean
}

export function ReferralCodeEditor({ currentCode, userId, onSaved, compact }: ReferralCodeEditorProps) {
  const [editing, setEditing] = useState(false)
  const [code, setCode] = useState(currentCode)
  const [checking, setChecking] = useState(false)
  const [available, setAvailable] = useState<boolean | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [toast, setToast] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Focus input when editing starts
  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [editing])

  const validate = useCallback((value: string): string | null => {
    if (value.length < 3) return 'Min 3 characters'
    if (value.length > 30) return 'Max 30 characters'
    if (!CODE_REGEX.test(value)) return 'Only lowercase letters, numbers, and hyphens'
    if (value.startsWith('-') || value.endsWith('-')) return 'Cannot start or end with a hyphen'
    return null
  }, [])

  const checkAvailability = useCallback((value: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current)

    const validationError = validate(value)
    if (validationError) {
      setError(validationError)
      setAvailable(null)
      setChecking(false)
      return
    }

    if (value === currentCode) {
      setError('')
      setAvailable(null)
      setChecking(false)
      return
    }

    setChecking(true)
    setError('')
    setAvailable(null)

    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/referral-code/check?code=${encodeURIComponent(value)}&userId=${encodeURIComponent(userId)}`)
        const data = await res.json()
        setAvailable(data.available ?? false)
        if (!data.available) {
          setError('This code is already taken')
        }
      } catch {
        setError('Could not check availability')
      } finally {
        setChecking(false)
      }
    }, 500)
  }, [currentCode, userId, validate])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '')
    setCode(value)
    checkAvailability(value)
  }

  const handleSave = async () => {
    const validationError = validate(code)
    if (validationError) {
      setError(validationError)
      return
    }
    if (code === currentCode) {
      setEditing(false)
      return
    }

    setSaving(true)
    setError('')

    try {
      const res = await fetch('/api/referral-code/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, newCode: code }),
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Failed to update')
        return
      }

      onSaved(code)
      setEditing(false)
      setToast('Referral code updated!')
      setTimeout(() => setToast(''), 3000)
    } catch {
      setError('Failed to update referral code')
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    setCode(currentCode)
    setError('')
    setAvailable(null)
    setChecking(false)
    setEditing(false)
    if (debounceRef.current) clearTimeout(debounceRef.current)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !saving && !checking && (available || code === currentCode)) {
      handleSave()
    } else if (e.key === 'Escape') {
      handleCancel()
    }
  }

  if (!editing) {
    return (
      <>
        {compact ? (
          <button
            onClick={() => setEditing(true)}
            className="text-xs text-primary hover:underline font-medium inline-flex items-center gap-1"
          >
            <Pencil className="w-3 h-3" />
            Customize
          </button>
        ) : (
          <button
            onClick={() => setEditing(true)}
            className="text-xs text-primary hover:underline font-medium inline-flex items-center gap-1"
          >
            <Pencil className="w-3 h-3" />
            Edit
          </button>
        )}
        {toast && (
          <span className="ml-2 text-xs text-emerald-500 font-semibold inline-flex items-center gap-1">
            <Check className="w-3 h-3" /> {toast}
          </span>
        )}
      </>
    )
  }

  return (
    <div className="mt-2">
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-xs">
          <input
            ref={inputRef}
            type="text"
            value={code}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            maxLength={30}
            className="w-full h-9 px-3 pr-8 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            placeholder="your-custom-code"
          />
          <div className="absolute right-2.5 top-1/2 -translate-y-1/2">
            {checking && <Loader2 className="w-4 h-4 text-muted-foreground animate-spin" />}
            {!checking && available === true && <Check className="w-4 h-4 text-emerald-500" />}
            {!checking && available === false && <X className="w-4 h-4 text-destructive" />}
          </div>
        </div>
        <button
          onClick={handleSave}
          disabled={saving || checking || (available === false) || !!validate(code)}
          className="h-9 px-3 rounded-lg bg-primary text-primary-foreground text-xs font-bold hover:opacity-90 disabled:opacity-50 flex items-center gap-1.5"
        >
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
          Save
        </button>
        <button
          onClick={handleCancel}
          className="h-9 px-3 rounded-lg border border-border text-xs font-semibold hover:bg-accent"
        >
          Cancel
        </button>
      </div>
      {error && (
        <p className="text-xs text-destructive mt-1.5">{error}</p>
      )}
      {!error && (
        <p className="text-xs text-muted-foreground mt-1.5">Only lowercase letters, numbers, and hyphens</p>
      )}
    </div>
  )
}
