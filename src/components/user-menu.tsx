"use client"

import { useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { User, LogOut, FolderOpen, ChevronDown } from "lucide-react"
import Link from "next/link"

export function UserMenu() {
  const { user, signOut, loading } = useAuth()
  const [isOpen, setIsOpen] = useState(false)
  const [isSigningOut, setIsSigningOut] = useState(false)

  if (loading) {
    return (
      <div className="h-10 w-10 animate-pulse rounded-xl bg-muted" />
    )
  }

  if (!user) {
    return null
  }

  const handleSignOut = async () => {
    try {
      setIsSigningOut(true)
      await signOut()
    } catch (error) {
      console.error("Sign out error:", error)
    } finally {
      setIsSigningOut(false)
      setIsOpen(false)
    }
  }

  // Get initial from name or email
  const displayName = user.user_metadata?.full_name || user.user_metadata?.name || user.email
  const userInitial = displayName?.charAt(0).toUpperCase() || "U"

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 rounded-xl border border-border bg-card/50 px-3 py-2 transition-colors hover:bg-muted"
      >
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-purple-600 text-sm font-semibold text-white">
          {userInitial}
        </div>
        <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          {/* Dropdown */}
          <div className="absolute right-0 top-full z-50 mt-2 w-56 rounded-xl border border-border bg-card p-2 shadow-xl">
            {/* User info */}
            <div className="mb-2 border-b border-border px-3 pb-3 pt-1">
              <p className="truncate text-sm font-medium">{user.user_metadata?.full_name || user.email}</p>
              <p className="truncate text-xs text-muted-foreground">{user.email}</p>
            </div>

            {/* Menu items */}
            <Link
              href="/my-assets"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-muted"
            >
              <FolderOpen className="h-4 w-4 text-muted-foreground" />
              My Assets
            </Link>

            <Link
              href="/profile"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-muted"
            >
              <User className="h-4 w-4 text-muted-foreground" />
              Profile
            </Link>

            <hr className="my-2 border-border" />

            <button
              onClick={handleSignOut}
              disabled={isSigningOut}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-destructive transition-colors hover:bg-destructive/10"
            >
              {isSigningOut ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-destructive/30 border-t-destructive" />
              ) : (
                <LogOut className="h-4 w-4" />
              )}
              Sign out
            </button>
          </div>
        </>
      )}
    </div>
  )
}
