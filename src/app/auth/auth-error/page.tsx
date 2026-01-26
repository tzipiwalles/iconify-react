"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { AlertCircle, ArrowLeft, RefreshCw } from "lucide-react"
import Link from "next/link"

export default function AuthErrorPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [errorDetails, setErrorDetails] = useState<{
    error: string
    errorCode: string
    errorDescription: string
  } | null>(null)

  useEffect(() => {
    // Parse error from URL hash
    const hash = window.location.hash.substring(1)
    const params = new URLSearchParams(hash)
    
    setErrorDetails({
      error: params.get("error") || "unknown_error",
      errorCode: params.get("error_code") || "",
      errorDescription: params.get("error_description") || "An unexpected error occurred",
    })
  }, [])

  const getErrorMessage = () => {
    if (!errorDetails) return "Loading error details..."

    const { errorCode, errorDescription } = errorDetails

    // Friendly error messages
    if (errorDescription.includes("Database error")) {
      return "We're having trouble setting up your account. Please try again or contact support."
    }

    if (errorCode === "unexpected_failure") {
      return "Something went wrong during sign in. Please try again."
    }

    return errorDescription.replace(/\+/g, " ")
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="w-full max-w-md space-y-6 text-center">
        {/* Error Icon */}
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10">
          <AlertCircle className="h-8 w-8 text-red-400" />
        </div>

        {/* Title */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Authentication Error
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {getErrorMessage()}
          </p>
        </div>

        {/* Error Details (for debugging) */}
        {errorDetails && (
          <div className="rounded-lg border border-border bg-muted/30 p-4 text-left">
            <p className="text-xs font-mono text-muted-foreground">
              <span className="font-semibold">Error:</span> {errorDetails.error}
              <br />
              {errorDetails.errorCode && (
                <>
                  <span className="font-semibold">Code:</span> {errorDetails.errorCode}
                  <br />
                </>
              )}
              <span className="font-semibold">Description:</span>{" "}
              {errorDetails.errorDescription.replace(/\+/g, " ")}
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button
            onClick={() => router.push("/")}
            variant="default"
            className="flex-1 gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Try Again
          </Button>
          <Button
            asChild
            variant="outline"
            className="flex-1 gap-2"
          >
            <Link href="/">
              <ArrowLeft className="h-4 w-4" />
              Back to Home
            </Link>
          </Button>
        </div>

        {/* Support */}
        <p className="text-xs text-muted-foreground">
          Need help?{" "}
          <button
            onClick={() => {
              // This will open the feedback modal when user goes back to home
              router.push("/?feedback=true")
            }}
            className="text-primary hover:underline"
          >
            Contact support
          </button>
        </p>
      </div>
    </div>
  )
}
