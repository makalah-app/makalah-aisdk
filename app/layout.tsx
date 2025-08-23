import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Makalah AI SDK - Streaming Interactive Chat',
  description: 'AI Penyusun Paper Akademik Berbahasa Indonesi',
  keywords: ['AI', 'academic writing', 'research', 'streaming', 'Next.js', 'AI SDK'],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="id" suppressHydrationWarning className="light">
      <body className={`${inter.className} bg-background text-foreground antialiased`}>
        {children}
      </body>
    </html>
  )
}