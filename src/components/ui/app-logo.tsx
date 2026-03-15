'use client'

import Link from 'next/link'

/** Exchange icon — two curved arrows forming a cycle */
function ExchangeMark({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizeMap = {
    sm: { box: 'w-7 h-7', icon: 14 },
    md: { box: 'w-8 h-8', icon: 16 },
    lg: { box: 'w-10 h-10', icon: 20 },
  }
  const s = sizeMap[size]

  return (
    <div className={`${s.box} rounded-lg bg-primary flex items-center justify-center shrink-0`}>
      <svg width={s.icon} height={s.icon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-primary-foreground">
        <path d="M16 3l4 4-4 4" />
        <path d="M20 7H4" />
        <path d="M8 21l-4-4 4-4" />
        <path d="M4 17h16" />
      </svg>
    </div>
  )
}

/** Full logo: icon + wordmark */
export function AppLogo({ size = 'md', href, showWordmark = true }: { size?: 'sm' | 'md' | 'lg'; href?: string; showWordmark?: boolean }) {
  const textSize = {
    sm: 'text-[14px]',
    md: 'text-[16px]',
    lg: 'text-[20px]',
  }

  const content = (
    <div className="flex items-center gap-2">
      <ExchangeMark size={size} />
      {showWordmark && (
        <span className={`font-extrabold ${textSize[size]} tracking-tight`}>
          Agent<span className="text-primary">Referrals</span>
        </span>
      )}
    </div>
  )

  if (href) {
    return <Link href={href} className="hover:opacity-80 transition-opacity">{content}</Link>
  }

  return content
}

/** Just the mark, no wordmark */
export function AppMark({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  return <ExchangeMark size={size} />
}
