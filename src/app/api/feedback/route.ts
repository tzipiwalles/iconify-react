import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json()
    const { message, email } = body

    if (!message || typeof message !== "string" || message.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: "Message is required" },
        { status: 400 }
      )
    }

    if (message.length > 2000) {
      return NextResponse.json(
        { success: false, error: "Message is too long (max 2000 characters)" },
        { status: 400 }
      )
    }

    // Get user if authenticated
    const { data: { user } } = await supabase.auth.getUser()

    // Get user agent for debugging
    const userAgent = request.headers.get("user-agent") || "Unknown"

    // Insert feedback
    const { data, error } = await supabase
      .from("feedback")
      .insert({
        user_id: user?.id || null,
        email: email || null,
        message: message.trim(),
        user_agent: userAgent,
      })
      .select()
      .single()

    if (error) {
      console.error("Failed to save feedback:", error)
      return NextResponse.json(
        { success: false, error: "Failed to save feedback" },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: { id: data.id },
    })
  } catch (error) {
    console.error("Feedback API error:", error)
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function GET() {
  try {
    const supabase = await createClient()

    // Check if user is admin
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user || user.email !== "tzipi.walles@gmail.com") {
      return NextResponse.json(
        { success: false, error: "Access denied" },
        { status: 403 }
      )
    }

    // Fetch all feedback
    const { data, error } = await supabase
      .from("feedback")
      .select("*")
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Failed to fetch feedback:", error)
      return NextResponse.json(
        { success: false, error: "Failed to fetch feedback" },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: data || [],
    })
  } catch (error) {
    console.error("Feedback GET error:", error)
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    )
  }
}
