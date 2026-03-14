import type { Metadata } from 'next'
import { Syne, DM_Sans } from 'next/font/google'
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
  title: 'ReferNet — Referral Network Platform',
  description: 'Referral network management for high-performing real estate agents',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${syne.variable} ${dmSans.variable}`}>
      <body className="font-[family-name:var(--font-b)]">{children}</body>
    </html>
  )
}
