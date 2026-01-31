"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { UserMenu } from "@/components/user-menu"
import { ArrowLeft, Github, Zap } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { useSavedAsset } from "@/hooks/use-saved-asset"

const BRAND_LOGO_NAME = "Amodernminimalisttechlogo"

interface SiteHeaderProps {
  showBackButton?: boolean
  backHref?: string
  showAuth?: boolean
  onLoginClick?: () => void
  title?: string
  subtitle?: string
}

export function SiteHeader({ 
  showBackButton = false, 
  backHref = "/",
  showAuth = true,
  onLoginClick,
  title,
  subtitle
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
                ? "h-9 w-9 sm:h-10 sm:w-10 bg-black p-0.5 sm:p-1" 
                : "h-8 w-8 sm:h-9 sm:w-9 bg-gradient-to-br from-primary to-purple-600 shadow-primary/20"
            }`}>
              {brandLogo?.svgUrl ? (
                <img 
                  src={brandLogo.svgUrl} 
                  alt="Asset-Bridge Logo" 
                  className="h-full w-full object-contain"
                />
              ) : (
                <Zap className="h-4 w-4 sm:h-4.5 sm:w-4.5 text-white" />
              )}
            </div>
            <div className="hidden sm:block">
              <div className="text-sm font-bold tracking-tight">
                Asset-Bridge
              </div>
              <p className="text-[10px] font-medium text-muted-foreground">
                Host Images for AI Previews
              </p>
            </div>
          </Link>

          {title && (
            <div className="flex items-center gap-2 sm:gap-3.5 border-l border-border/50 pl-3 sm:pl-4">
              <div>
                <h1 className="text-base sm:text-lg font-bold tracking-tight">{title}</h1>
                {subtitle && (
                  <p className="text-[11px] font-medium text-muted-foreground">
                    {subtitle}
                  </p>
                )}
              </div>
            </div>
          )}
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
