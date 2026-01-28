import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { NextRequest, NextResponse } from "next/server"

// GET - Fetch all tools with vote counts
export async function GET() {
  try {
    const supabase = createRouteHandlerClient({ cookies })

    // Use the function to get tools with vote stats
    const { data, error } = await supabase.rpc("get_tool_stats")

    if (error) {
      // Fallback to simple query if function doesn't exist
      const { data: tools, error: toolsError } = await supabase
        .from("ai_tools")
        .select("*")
        .order("verified", { ascending: false })
        .order("works", { ascending: false, nullsFirst: false })
        .order("name")

      if (toolsError) throw toolsError

      return NextResponse.json({
        success: true,
        data: tools?.map(t => ({
          ...t,
          works_votes: 0,
          doesnt_work_votes: 0,
          total_votes: 0
        })) || []
      })
    }

    return NextResponse.json({ success: true, data: data || [] })
  } catch (error) {
    console.error("Error fetching tools:", error)
    return NextResponse.json(
      { success: false, error: "Failed to fetch tools" },
      { status: 500 }
    )
  }
}

// POST - Suggest a new tool
export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    const body = await request.json()
    const { name, url, sessionId } = body

    if (!name) {
      return NextResponse.json(
        { success: false, error: "Tool name is required" },
        { status: 400 }
      )
    }

    // Get user if logged in
    const { data: { user } } = await supabase.auth.getUser()

    const { data, error } = await supabase
      .from("tool_suggestions")
      .insert({
        name,
        url: url || null,
        user_id: user?.id || null,
        session_id: user ? null : sessionId,
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error("Error suggesting tool:", error)
    return NextResponse.json(
      { success: false, error: "Failed to suggest tool" },
      { status: 500 }
    )
  }
}
