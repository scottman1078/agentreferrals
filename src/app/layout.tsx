import type { Metadata } from 'next'
import { Syne, DM_Sans } from 'next/font/google'
import { ThemeProvider } from '@/components/theme-provider'
import './globals.css'

const syne = Syne({
  subsets: ['latin'],
  variable: '--font-d',
  display: 'swap',
})

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-b',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'AgentReferrals.ai — AI-Powered Referral Network',
  description: 'AI-powered referral network for real estate agents. Find, match, and manage referrals across brokerages.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${syne.variable} ${dmSans.variable}`} suppressHydrationWarning>
      <body className="font-[family-name:var(--font-b)] antialiased">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  )
}
