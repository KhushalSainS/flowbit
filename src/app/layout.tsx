import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import Link from 'next/link'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Email Ingestion App',
  description: 'Manage email configurations for PDF ingestion',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="h-full">
      <body className={`${inter.className} h-full`}>
        <div className="min-h-screen flex flex-col">
          <header className="border-b border-border">
            <nav className="container mx-auto px-4 h-16 flex items-center justify-between">
              <Link href="/" className="text-xl font-semibold">
                Email Ingestion
              </Link>
              <div className="space-x-4">
                <Link href="/" className="button-secondary">
                  Configurations
                </Link>
                <Link href="/dashboard" className="button-secondary">
                  Dashboard
                </Link>
              </div>
            </nav>
          </header>
          <main className="flex-grow container mx-auto px-4 py-8">
            {children}
          </main>
          <footer className="border-t border-border py-6">
            <div className="container mx-auto px-4 text-center text-sm text-gray-500">
              Email Ingestion App © {new Date().getFullYear()}
            </div>
          </footer>
        </div>
      </body>
    </html>
  )
}
