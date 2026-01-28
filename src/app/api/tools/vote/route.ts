import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { NextRequest, NextResponse } from "next/server"

// POST - Vote on a tool
export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    const body = await request.json()
    const { toolId, works, sessionId, comment } = body

    if (!toolId || works === undefined) {
      return NextResponse.json(
        { success: false, error: "Tool ID and works status are required" },
        { status: 400 }
      )
    }

    // Get user if logged in
    const { data: { user } } = await supabase.auth.getUser()

    // Check if user/session already voted
    const existingQuery = supabase
      .from("tool_votes")
      .select("id")
      .eq("tool_id", toolId)

    if (user) {
      existingQuery.eq("user_id", user.id)
    } else if (sessionId) {
      existingQuery.eq("session_id", sessionId)
    } else {
      return NextResponse.json(
        { success: false, error: "Session ID required for anonymous voting" },
        { status: 400 }
      )
    }

    const { data: existing } = await existingQuery.single()

    if (existing) {
      // Update existing vote
      const { data, error } = await supabase
        .from("tool_votes")
        .update({ works, comment: comment || null })
        .eq("id", existing.id)
        .select()
        .single()

      if (error) throw error
      return NextResponse.json({ success: true, data, updated: true })
    }

    // Create new vote
    const { data, error } = await supabase
      .from("tool_votes")
      .insert({
        tool_id: toolId,
        user_id: user?.id || null,
        session_id: user ? null : sessionId,
        works,
        comment: comment || null,
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ success: true, data, updated: false })
  } catch (error) {
    console.error("Error voting:", error)
    return NextResponse.json(
      { success: false, error: "Failed to submit vote" },
      { status: 500 }
    )
  }
}
