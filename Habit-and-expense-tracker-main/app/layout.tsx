'use client'
import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { isAuthenticated } from '@/lib/auth'
import './globals.css'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (pathname !== '/auth' && !isAuthenticated()) {
      router.push('/auth')
    }
  }, [pathname, router])

  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
