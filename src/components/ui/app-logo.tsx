'use client'

import Link from 'next/link'
import Image from 'next/image'

/** Full logo — uses the actual logo PNG files */
export function AppLogo({ size = 'md', href }: { size?: 'sm' | 'md' | 'lg'; href?: string; showWordmark?: boolean }) {
  const heightMap = {
    sm: 28,
    md: 32,
    lg: 40,
  }
  const h = heightMap[size]
  // Logo is roughly 4:1 aspect ratio
  const w = Math.round(h * 4)

  const content = (
    <>
      <Image src="/logo.png" alt="AgentReferrals" width={w} height={h} className="shrink-0 dark:hidden" priority />
      <Image src="/logo-dark.png" alt="AgentReferrals" width={w} height={h} className="shrink-0 hidden dark:block" priority />
    </>
  )

  if (href) {
    return <Link href={href} className="hover:opacity-80 transition-opacity flex items-center">{content}</Link>
  }

  return <div className="flex items-center">{content}</div>
}

/** Just the icon mark — uses favicon PNGs */
export function AppMark({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizeMap = {
    sm: 28,
    md: 32,
    lg: 40,
  }
  const px = sizeMap[size]

  return (
    <>
      <Image src="/favicon.png" alt="AgentReferrals" width={px} height={px} className="shrink-0 dark:hidden" />
      <Image src="/favicon-dark.png" alt="AgentReferrals" width={px} height={px} className="shrink-0 hidden dark:block" />
    </>
  )
}
