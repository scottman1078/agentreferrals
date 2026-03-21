'use client'

import Link from 'next/link'
import Image from 'next/image'

/** Favicon mark — house with referral arrow */
function LogoMark({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizeMap = {
    sm: 28,
    md: 32,
    lg: 40,
  }
  const px = sizeMap[size]

  return (
    <Image
      src="/favicon.png"
      alt="AgentReferrals"
      width={px}
      height={px}
      className="shrink-0 dark:brightness-[1.8]"
    />
  )
}

/** Full logo: favicon mark + wordmark */
export function AppLogo({ size = 'md', href, showWordmark = true }: { size?: 'sm' | 'md' | 'lg'; href?: string; showWordmark?: boolean }) {
  const textSize = {
    sm: 'text-[14px]',
    md: 'text-[16px]',
    lg: 'text-[20px]',
  }

  const content = (
    <div className="flex items-center gap-2.5">
      <LogoMark size={size} />
      {showWordmark && (
        <span className={`font-extrabold ${textSize[size]} tracking-tight`}>
          Agent<span className="text-accent">Referrals</span>
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
  return <LogoMark size={size} />
}
