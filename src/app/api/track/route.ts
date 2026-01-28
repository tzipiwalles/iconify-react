import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

// POST /api/track - Track user events
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json()
    
    const { eventType, metadata, sessionId } = body

    if (!eventType) {
      return NextResponse.json(
        { success: false, error: "eventType is required" },
        { status: 400 }
      )
    }

    // Get user info
    const { data: { user } } = await supabase.auth.getUser()
    
    // Get request info
    const ipAddress = request.headers.get("x-forwarded-for") || 
                      request.headers.get("x-real-ip") || 
                      "unknown"
    const userAgent = request.headers.get("user-agent") || "unknown"

    // Insert event
    const { error } = await supabase
      .from("events")
      .insert({
        event_type: eventType,
        user_id: user?.id || null,
        session_id: sessionId || null,
        metadata: metadata || {},
        ip_address: ipAddress,
        user_agent: userAgent,
      })

    if (error) {
      console.error("Failed to track event:", error)
      // Don't return error to client - tracking should be silent
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Track API error:", error)
    // Don't return error to client - tracking should be silent
    return NextResponse.json({ success: true })
  }
}
