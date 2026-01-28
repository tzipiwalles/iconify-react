/**
 * Track user events for analytics
 * Non-blocking - errors are logged but don't affect the user experience
 */

// Generate or retrieve session ID for anonymous tracking
function getSessionId(): string {
  if (typeof window === "undefined") return ""
  
  let sessionId = sessionStorage.getItem("ab_session_id")
  if (!sessionId) {
    sessionId = `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    sessionStorage.setItem("ab_session_id", sessionId)
  }
  return sessionId
}

export type EventType = 
  | "generate_click"      // User clicked Generate button
  | "generate_success"    // Generation completed successfully
  | "generate_error"      // Generation failed
  | "save_asset"          // User saved an asset
  | "share_click"         // User clicked Share
  | "copy_url"            // User copied URL
  | "copy_component"      // User copied React component
  | "download_svg"        // User downloaded SVG
  | "page_view"           // Page view

export interface EventMetadata {
  mode?: "icon" | "logo"
  fileType?: string
  fileSize?: number
  componentName?: string
  error?: string
  source?: string
  [key: string]: unknown
}

export async function trackEvent(
  eventType: EventType,
  metadata?: EventMetadata
): Promise<void> {
  try {
    const sessionId = getSessionId()
    
    // Fire and forget - don't await
    fetch("/api/track", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        eventType,
        metadata,
        sessionId,
      }),
    }).catch(() => {
      // Silently fail - tracking shouldn't affect UX
    })
  } catch {
    // Silently fail
  }
}
