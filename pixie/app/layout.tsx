import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'PIXIE — Personal Privacy Intelligence Engine',
  description: 'Know your digital footprint. Shrink your attack surface.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
