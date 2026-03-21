'use client'

import Link from 'next/link'

/** Full logo — uses the actual logo PNG files, swaps for dark mode */
export function AppLogo({ size = 'md', href }: { size?: 'sm' | 'md' | 'lg'; href?: string; showWordmark?: boolean }) {
  const hMap = { sm: 'h-7', md: 'h-8', lg: 'h-10' }
  const h = hMap[size]

  const content = (
    <>
      <img src="/logo.png" alt="AgentReferrals" className={`${h} w-auto shrink-0 dark:hidden`} />
      <img src="/logo-dark.png" alt="AgentReferrals" className={`${h} w-auto shrink-0 hidden dark:block`} />
    </>
  )

  if (href) {
    return <Link href={href} className="hover:opacity-80 transition-opacity flex items-center">{content}</Link>
  }

  return <div className="flex items-center">{content}</div>
}

/** Just the icon mark — uses favicon PNGs, swaps for dark mode */
export function AppMark({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sMap = { sm: 'h-7 w-7', md: 'h-8 w-8', lg: 'h-10 w-10' }
  const s = sMap[size]

  return (
    <>
      <img src="/favicon.png" alt="AgentReferrals" className={`${s} shrink-0 dark:hidden`} />
      <img src="/favicon-dark.png" alt="AgentReferrals" className={`${s} shrink-0 hidden dark:block`} />
    </>
  )
}
