import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Life Tracker - Habit & Expense Tracker',
  description: 'Track your habits and expenses in one place',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>{children}</body>
    </html>
  )
}
