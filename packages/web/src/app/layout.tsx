import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Providers } from '@/components/providers'
import './globals.css'

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] })
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] })

const APP_URL = process.env['NEXT_PUBLIC_APP_URL'] ?? 'https://reflog.app'

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: {
    default: 'reflog — GitHub activity tracker for developers',
    template: '%s | reflog',
  },
  description:
    'Track commits, streaks, and pull requests from all your GitHub repos. Spot your patterns, stay motivated, share your progress. The developer productivity dashboard that actually ships.',
  keywords: [
    'github streak tracker',
    'developer metrics',
    'commit tracker',
    'github analytics',
    'coding streak',
    'developer dashboard',
    'github productivity',
  ],
  authors: [{ name: 'reflog' }],
  creator: 'reflog',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: APP_URL,
    siteName: 'reflog',
    title: 'reflog — GitHub activity tracker for developers',
    description: 'Track commits, streaks, and PRs across all your repos. The Strava for developers.',
    images: [{ url: '/og-default.png', width: 1200, height: 630, alt: 'reflog — developer metrics dashboard' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'reflog — GitHub activity tracker for developers',
    description: 'Track commits, streaks, and PRs across all your repos.',
    images: ['/og-default.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: { icon: '/favicon.svg' },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark h-full">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased h-full`}
        suppressHydrationWarning
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
