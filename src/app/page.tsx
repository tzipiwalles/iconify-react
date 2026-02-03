"use client"

import { useState, useEffect, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Zap, Github, Sparkles, LogIn, Coffee, Users, ImageIcon, ArrowRight, XCircle, Settings, CheckCircle2 } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { useAuth } from "@/contexts/auth-context"
import { useSavedAsset } from "@/hooks/use-saved-asset"
import { useStats } from "@/hooks/use-stats"
import { AuthModal } from "@/components/auth-modal"
import { FeedbackModal } from "@/components/feedback-modal"
import { UserMenu } from "@/components/user-menu"
import { ToolCompatibility } from "@/components/tool-compatibility"

// Brand logo component name
const BRAND_LOGO_NAME = "ABLogo"

interface PublicAsset {
  id: string
  componentName: string
  svgUrl: string
  mode: "icon" | "logo" | "image"
  detectedColors: string[]
  createdAt: string
}

export default function Home() {
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [showFeedbackModal, setShowFeedbackModal] = useState(false)
  const [marqueeAssets, setMarqueeAssets] = useState<PublicAsset[]>([])
  const [loadingAssets, setLoadingAssets] = useState(true)
  const [lightboxImage, setLightboxImage] = useState<{ src: string; alt: string } | null>(null)
  
  const { user, loading: authLoading } = useAuth()

  const { asset: brandLogo } = useSavedAsset(BRAND_LOGO_NAME)
  const { stats } = useStats()

  // Load public assets for marquee (random selection of ~10)
  useEffect(() => {
    const fetchPublicAssets = async () => {
      try {
        const res = await fetch("/api/assets/public")
        const data = await res.json()
        if (data.success && data.data.length > 0) {
          // Shuffle and take up to 12 assets for the marquee
          const shuffled = [...data.data].sort(() => Math.random() - 0.5)
          setMarqueeAssets(shuffled.slice(0, 12))
        }
      } catch (error) {
        console.error("Failed to fetch public assets:", error)
      } finally {
        setLoadingAssets(false)
      }
    }
    fetchPublicAssets()
  }, [])

  // Open feedback modal if requested via localStorage
  useEffect(() => {
    const shouldShowFeedback = localStorage.getItem("openFeedback")
    if (shouldShowFeedback === "true") {
      setShowFeedbackModal(true)
      localStorage.removeItem("openFeedback")
    }
  }, [])

  return (
    <div className="dark min-h-screen bg-background">
      {/* Decorative background */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-1/2 left-1/2 h-[1000px] w-[1000px] -translate-x-1/2 rounded-full bg-gradient-to-b from-primary/8 via-purple-500/4 to-transparent blur-3xl" />
        <div className="absolute -bottom-1/2 right-0 h-[800px] w-[800px] rounded-full bg-gradient-to-t from-emerald-500/6 via-teal-500/3 to-transparent blur-3xl" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:72px_72px]" />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-14 sm:h-16 max-w-6xl items-center justify-between px-3 sm:px-6">
          <div className="flex items-center gap-2 sm:gap-3.5">
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
          </div>

          <div className="flex items-center gap-1.5 sm:gap-3">
            <span className="hidden items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-400 lg:inline-flex">
              <Sparkles className="h-3 w-3" />
              AI Workflow Ready
            </span>
            
            <Link href="/gallery">
              <Button variant="ghost" size="sm" className="rounded-xl text-xs sm:text-sm px-2.5 sm:px-3">
                Gallery
              </Button>
            </Link>
            
            <Button variant="ghost" size="icon" className="rounded-xl h-9 w-9 sm:h-10 sm:w-10" asChild>
              <a
                href="https://github.com/tzipiwalles/iconify-react"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Github className="h-4 w-4 sm:h-5 sm:w-5" />
              </a>
            </Button>
            
            {/* Auth section */}
            {!authLoading && (
              user ? (
                <UserMenu />
              ) : (
                <Button
                  onClick={() => setShowAuthModal(true)}
                  variant="outline"
                  size="sm"
                  className="gap-1.5 sm:gap-2 rounded-xl text-xs sm:text-sm px-2.5 sm:px-4"
                >
                  <LogIn className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  <span className="hidden xs:inline">Sign in</span>
                  <span className="xs:hidden">Login</span>
                </Button>
              )
            )}
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="mx-auto max-w-6xl px-4 sm:px-6 py-8 sm:py-12">
        {/* Hero Section */}
        <div className="mb-12 text-center">
          <h1 className="mb-4 text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
            Use Your Real Custom Logo in{" "}
            <span className="bg-gradient-to-r from-primary via-purple-400 to-fuchsia-400 bg-clip-text text-transparent">
              AI Previews
            </span>
          </h1>
          <p className="mx-auto max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg mb-8">
            Stop seeing broken image icons. Host your logos, icons & images instantly — get permanent links for Cursor, ChatGPT Canvas, Base44 & more.
          </p>
          
          {/* CTA Button */}
          <Link href="/create">
            <Button
              size="lg"
              className="group relative h-14 px-8 gap-3 overflow-hidden rounded-2xl text-lg font-semibold shadow-lg transition-all hover:shadow-xl hover:scale-105"
            >
              {/* Animated gradient background */}
              <div className="absolute inset-0 bg-gradient-to-r from-primary via-purple-500 via-fuchsia-500 to-primary bg-[length:200%_100%] animate-[gradient_3s_ease-in-out_infinite]" />
              <span className="relative flex items-center gap-3">
                <Zap className="h-6 w-6" />
                Host Your Asset
              </span>
            </Button>
          </Link>
        </div>

        {/* Community Assets Marquee */}
        {!loadingAssets && marqueeAssets.length > 0 && (
          <div className="mb-16">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-medium text-muted-foreground">
                Community Activity
              </p>
              <Link href="/gallery" className="text-sm text-primary hover:underline flex items-center gap-1">
                View all <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
            
            {/* Marquee container */}
            <div className="relative overflow-hidden">
              {/* Gradient masks */}
              <div className="absolute left-0 top-0 bottom-0 w-16 bg-gradient-to-r from-background to-transparent z-10" />
              <div className="absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-background to-transparent z-10" />
              
              {/* Scrolling content */}
              <div className="flex animate-marquee gap-4">
                {[...marqueeAssets, ...marqueeAssets].map((asset, i) => (
                  <div
                    key={`${asset.id}-${i}`}
                    className="flex-shrink-0 w-20 h-20 rounded-xl border border-border bg-card/50 p-3 transition-all hover:border-primary/30"
                  >
                    <img
                      src={asset.svgUrl}
                      alt={asset.componentName}
                      className="h-full w-full object-contain"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Why Not Google Drive? Comparison Section */}
        <div className="mb-16">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold sm:text-3xl mb-2">
              Why not just use Google Drive?
            </h2>
            <p className="text-muted-foreground">
              Traditional file hosting wasn&apos;t built for AI workflows
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {/* Card 1: Google Drive / Dropbox */}
            <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/10">
                  <XCircle className="h-5 w-5 text-red-500" />
                </div>
                <h3 className="font-semibold">Google Drive / Dropbox</h3>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Links expire or break in AI chats. Heavy authentication blocks agents from reading files.
              </p>
            </div>

            {/* Card 2: AWS S3 / Cloud Storage */}
            <div className="rounded-2xl border border-yellow-500/20 bg-yellow-500/5 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-yellow-500/10">
                  <Settings className="h-5 w-5 text-yellow-500" />
                </div>
                <h3 className="font-semibold">AWS S3 / Cloud Storage</h3>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Complex setup. Requires manual CORS configuration and bucket permissions to work with Cursor/Canvas.
              </p>
            </div>

            {/* Card 3: Asset-Bridge (The Solution) */}
            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-6 ring-1 ring-emerald-500/20">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10">
                  <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                </div>
                <h3 className="font-semibold text-emerald-400">Asset-Bridge</h3>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Instant, permanent, AI-ready URLs. Auto-vectorized and CORS-optimized for all AI tools.
              </p>
            </div>
          </div>
        </div>

        {/* Showcase Section */}
        <div className="mb-16">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-bold sm:text-3xl">
              Works flawlessly with your favorite AI tools
            </h2>
            <p className="mt-2 text-muted-foreground">Real examples from our users</p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {/* Card 1 - ChatGPT Canvas */}
            <div className="group overflow-hidden rounded-2xl border border-border bg-card transition-all hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5">
              <button
                onClick={() => setLightboxImage({ src: "/showcase/chatgpt-canvas.png", alt: "Magazine cover created in ChatGPT Canvas with Asset-Bridge logo" })}
                className="relative aspect-[4/3] w-full overflow-hidden bg-muted cursor-zoom-in"
              >
                <Image
                  src="/showcase/chatgpt-canvas.png"
                  alt="Magazine cover created in ChatGPT Canvas with Asset-Bridge logo"
                  fill
                  className="object-cover object-top transition-transform group-hover:scale-105"
                />
                <div className="absolute top-3 left-3">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-black/70 backdrop-blur-sm px-3 py-1 text-xs font-medium text-white">
                    <img src="https://www.assetbridge.app/api/assets/Openai/svg" alt="" className="h-3.5 w-3.5" style={{ filter: 'brightness(0) invert(1)' }} />
                    ChatGPT Canvas
                  </span>
                </div>
              </button>
              <div className="p-4">
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                  <img 
                    src="https://www.assetbridge.app/api/assets/Blossomco/svg" 
                    alt="Blossomco logo" 
                    className="h-8 w-8 flex-shrink-0"
                  />
                  Brand assets integrated perfectly into marketing designs.
                </p>
              </div>
            </div>

            {/* Card 2 - Google AI Studio */}
            <div className="group overflow-hidden rounded-2xl border border-border bg-card transition-all hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5">
              <button
                onClick={() => setLightboxImage({ src: "/showcase/gemini-dashboard.png", alt: "Smart home dashboard created in Google AI Studio with Asset-Bridge logo" })}
                className="relative aspect-[4/3] w-full overflow-hidden bg-muted cursor-zoom-in"
              >
                <Image
                  src="/showcase/gemini-dashboard.png"
                  alt="Smart home dashboard created in Google AI Studio with Asset-Bridge logo"
                  fill
                  className="object-cover object-top transition-transform group-hover:scale-105"
                />
                <div className="absolute top-3 left-3">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-black/70 backdrop-blur-sm px-3 py-1 text-xs font-medium text-white">
                    <span className="text-blue-400">●</span> Google AI Studio
                  </span>
                </div>
              </button>
              <div className="p-4">
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                  <img 
                    src="https://www.assetbridge.app/api/assets/NexusOS/svg" 
                    alt="NexusOS logo" 
                    className="h-8 w-8 flex-shrink-0"
                  />
                  Live SaaS dashboards generated with dark mode logos.
                </p>
              </div>
            </div>

            {/* Card 3 - Base44 */}
            <div className="group overflow-hidden rounded-2xl border border-border bg-card transition-all hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5">
              <button
                onClick={() => setLightboxImage({ src: "/showcase/base44-ecommerce.png", alt: "E-commerce site created in Base44 with Asset-Bridge logo" })}
                className="relative aspect-[4/3] w-full overflow-hidden bg-muted cursor-zoom-in"
              >
                <Image
                  src="/showcase/base44-ecommerce.png"
                  alt="E-commerce site created in Base44 with Asset-Bridge logo"
                  fill
                  className="object-cover object-top transition-transform group-hover:scale-105"
                />
                <div className="absolute top-3 left-3">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-black/70 backdrop-blur-sm px-3 py-1 text-xs font-medium text-white">
                    <span className="text-orange-400">●</span> Base44 (No-Code)
                  </span>
                </div>
              </button>
              <div className="p-4">
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                  <img 
                    src="https://www.assetbridge.app/api/assets/Blossomco/svg" 
                    alt="Blossomco logo" 
                    className="h-8 w-8 flex-shrink-0"
                  />
                  Full e-commerce sites built instantly with custom branding.
                </p>
              </div>
            </div>

            {/* Card 4 - v0.dev */}
            <div className="group overflow-hidden rounded-2xl border border-border bg-card transition-all hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5">
              <button
                onClick={() => setLightboxImage({ src: "/showcase/v0-quiz-app.png", alt: "Quiz app created in v0.dev with Asset-Bridge logo" })}
                className="relative aspect-[4/3] w-full overflow-hidden bg-muted cursor-zoom-in"
              >
                <Image
                  src="/showcase/v0-quiz-app.png"
                  alt="Quiz app created in v0.dev with Asset-Bridge logo"
                  fill
                  className="object-cover object-top transition-transform group-hover:scale-105"
                />
                <div className="absolute top-3 left-3">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-black/70 backdrop-blur-sm px-3 py-1 text-xs font-medium text-white">
                    <img src="https://www.assetbridge.app/api/assets/V0ByVercelLogo/svg" alt="" className="h-3.5 w-3.5" style={{ filter: 'brightness(0) invert(1)' }} />
                    v0.dev
                  </span>
                </div>
              </button>
              <div className="p-4">
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                  <img 
                    src="https://www.assetbridge.app/api/assets/QuizFlow/svg" 
                    alt="QuizFlow logo" 
                    className="h-8 w-8 flex-shrink-0"
                  />
                  React Components generated in v0.
                </p>
              </div>
            </div>

            {/* Card 5 - Gemini Canvas (Application) */}
            <div className="group overflow-hidden rounded-2xl border border-border bg-card transition-all hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5">
              <button
                onClick={() => setLightboxImage({ src: "/showcase/gemini-canvas-sec1.png", alt: "Password Generator app created in Gemini Canvas" })}
                className="relative aspect-[4/3] w-full overflow-hidden bg-muted cursor-zoom-in"
              >
                <Image
                  src="/showcase/gemini-canvas-sec1.png"
                  alt="Password Generator app created in Gemini Canvas"
                  fill
                  className="object-cover object-top transition-transform group-hover:scale-105"
                />
                <div className="absolute top-3 left-3">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-black/70 backdrop-blur-sm px-3 py-1 text-xs font-medium text-white">
                    <span className="text-cyan-400">✦</span> Gemini Canvas
                  </span>
                </div>
              </button>
              <div className="p-4">
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                  <img 
                    src="https://www.assetbridge.app/api/assets/Sec1/svg" 
                    alt="Sec1 logo" 
                    className="h-8 w-8 flex-shrink-0"
                  />
                  Branded web application with custom logo integration.
                </p>
              </div>
            </div>

            {/* Card 6 - Gemini Canvas (Presentation) */}
            <div className="group overflow-hidden rounded-2xl border border-border bg-card transition-all hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5">
              <button
                onClick={() => setLightboxImage({ src: "/showcase/gemini-canvas-nexus.png", alt: "Investor presentation created in Gemini Canvas" })}
                className="relative aspect-[4/3] w-full overflow-hidden bg-muted cursor-zoom-in"
              >
                <Image
                  src="/showcase/gemini-canvas-nexus.png"
                  alt="Investor presentation created in Gemini Canvas"
                  fill
                  className="object-cover object-top transition-transform group-hover:scale-105"
                />
                <div className="absolute top-3 left-3">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-black/70 backdrop-blur-sm px-3 py-1 text-xs font-medium text-white">
                    <span className="text-cyan-400">✦</span> Gemini Canvas
                  </span>
                </div>
              </button>
              <div className="p-4">
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                  <img 
                    src="https://www.assetbridge.app/api/assets/NexusOS/svg" 
                    alt="NexusOS logo" 
                    className="h-8 w-8 flex-shrink-0"
                  />
                  Professional investor deck with smooth transitions.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Tool Compatibility Section */}
        <div className="mb-16">
          <ToolCompatibility />
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-border/50 py-4">
        <div className="mx-auto max-w-6xl px-6">
          {/* Stats */}
          <div className="mb-3 flex items-center justify-center gap-6 text-sm">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Users className="h-4 w-4" />
              <span className="font-medium text-foreground">{stats.users}</span> users
            </div>
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Zap className="h-4 w-4" />
              <span className="font-medium text-foreground">{stats.icons}</span> icons
            </div>
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <ImageIcon className="h-4 w-4" />
              <span className="font-medium text-foreground">{stats.logos}</span> logos
            </div>
          </div>
          
          <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-muted-foreground">
            <span>© 2025 Asset-Bridge</span>
            <span>•</span>
            <a
              href="https://github.com/tzipiwalles/iconify-react"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-foreground transition-colors"
            >
              Open Source
            </a>
            <span>•</span>
            <button
              onClick={() => setShowFeedbackModal(true)}
              className="hover:text-foreground transition-colors"
            >
              Send Feedback
            </button>
            <span>•</span>
            <a
              href="https://www.buymeacoffee.com/tzipiwalles"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-2.5 py-1 text-amber-400 transition-colors hover:bg-amber-500/20"
            >
              <Coffee className="h-3.5 w-3.5" />
              Buy me a coffee
            </a>
          </div>
        </div>
      </footer>

      {/* Lightbox Modal for Showcase Images */}
      {lightboxImage && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm cursor-zoom-out"
          onClick={() => setLightboxImage(null)}
        >
          <div className="relative max-h-[90vh] max-w-[90vw]">
            <Image
              src={lightboxImage.src}
              alt={lightboxImage.alt}
              width={1200}
              height={900}
              className="rounded-lg object-contain max-h-[90vh]"
              onClick={(e) => e.stopPropagation()}
            />
            <button
              onClick={() => setLightboxImage(null)}
              className="absolute -top-4 -right-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-sm hover:bg-white/20 transition-colors"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Auth Modal */}
      <AuthModal 
        isOpen={showAuthModal} 
        onClose={() => setShowAuthModal(false)} 
      />

      {/* Feedback Modal */}
      <FeedbackModal
        isOpen={showFeedbackModal}
        onClose={() => setShowFeedbackModal(false)}
      />
    </div>
  )
}
