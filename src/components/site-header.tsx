"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { UserMenu } from "@/components/user-menu"
import { ArrowLeft, Github, Zap } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { useSavedAsset } from "@/hooks/use-saved-asset"

const BRAND_LOGO_NAME = "ABmini"

interface SiteHeaderProps {
  showBackButton?: boolean
  backHref?: string
  showAuth?: boolean
  onLoginClick?: () => void
}

export function SiteHeader({ 
  showBackButton = false, 
  backHref = "/",
  showAuth = true,
  onLoginClick
}: SiteHeaderProps) {
  const { user, loading: authLoading } = useAuth()
  const { asset: brandLogo } = useSavedAsset(BRAND_LOGO_NAME)

  return (
    <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-14 sm:h-16 max-w-6xl items-center justify-between px-3 sm:px-6">
        <div className="flex items-center gap-2 sm:gap-4">
          {showBackButton && (
            <Link href={backHref}>
              <Button variant="ghost" size="icon" className="rounded-xl h-9 w-9">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
          )}
          
          <Link href="/" className="flex items-center gap-2 sm:gap-3.5">
            <div className={`flex items-center justify-center rounded-xl shadow-lg overflow-hidden ${
              brandLogo?.svgUrl 
                ? "h-9 w-9 sm:h-12 sm:w-12 bg-black p-0.5 sm:p-1" 
                : "h-8 w-8 sm:h-10 sm:w-10 bg-gradient-to-br from-primary to-purple-600 shadow-primary/20"
            }`}>
              {brandLogo?.svgUrl ? (
                <img 
                  src={brandLogo.svgUrl} 
                  alt="Asset-Bridge Logo" 
                  className="h-full w-full object-contain"
                />
              ) : (
                <Zap className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
              )}
            </div>
            <div>
              <div className="text-base sm:text-lg font-bold tracking-tight">
                Asset-Bridge
              </div>
              <p className="hidden sm:block text-[11px] font-medium text-muted-foreground">
                Host Images for AI Previews
              </p>
            </div>
          </Link>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-3">
          <Button variant="ghost" size="icon" className="rounded-xl h-9 w-9 sm:h-10 sm:w-10" asChild>
            <a
              href="https://github.com/tzipiwalles/iconify-react"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Github className="h-4 w-4 sm:h-5 sm:w-5" />
            </a>
          </Button>
          
          {showAuth && !authLoading && user && <UserMenu />}
        </div>
      </div>
    </header>
  )
}
