'use client'

import Link from 'next/link'
import { ThemeToggle } from '@/components/theme-toggle'
import { brandConfig } from '@/lib/brand-config'

export function AppHeader() {
  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto max-w-screen-2xl px-3 sm:px-4 lg:px-6 xl:px-8">
        <div className="flex h-12 sm:h-14 items-center justify-between gap-2 sm:gap-3">
          <div className="flex items-center gap-1 sm:gap-2 min-w-0 flex-1">
            <Link href="/" className="inline-flex items-center gap-1 text-xs sm:text-sm bg-secondary/50 border border-border rounded-md px-2 sm:px-3 py-1 sm:py-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-colors whitespace-nowrap">
              <span className="hidden xs:inline">←</span>
              <span className="hidden sm:inline">Back Home</span>
              <span className="sm:hidden">←</span>
            </Link>
            <Link href="/" className="font-semibold text-foreground text-sm sm:text-base hidden sm:block absolute left-1/2 transform -translate-x-1/2 whitespace-nowrap">
              {brandConfig.name}
            </Link>
            <Link href="/" className="font-semibold text-foreground text-sm sm:hidden ml-2 truncate">
              {brandConfig.name}
            </Link>
          </div>

          <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
            <ThemeToggle />
          </div>
        </div>
      </div>
    </header>
  )
}
