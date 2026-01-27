import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    // Only admin can access
    if (!user || user.email !== "tzipi.walles@gmail.com") {
      return NextResponse.json(
        { success: false, error: "Access denied" },
        { status: 403 }
      )
    }

    // Get API usage stats
    const { data: usageData, error: usageError } = await supabase
      .from("api_usage")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100)

    if (usageError) throw usageError

    // Get summary stats
    const { data: totalCalls } = await supabase
      .from("api_usage")
      .select("id", { count: "exact", head: true })

    const { data: last24h } = await supabase
      .from("api_usage")
      .select("id", { count: "exact", head: true })
      .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())

    const { data: last7days } = await supabase
      .from("api_usage")
      .select("id", { count: "exact", head: true })
      .gte("created_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())

    // Get endpoint breakdown
    const { data: endpointStats } = await supabase
      .rpc("get_endpoint_stats")
      .limit(10)

    return NextResponse.json({
      success: true,
      data: {
        recentCalls: usageData || [],
        summary: {
          totalCalls: totalCalls || 0,
          last24h: last24h || 0,
          last7days: last7days || 0,
        },
        endpointStats: endpointStats || [],
      },
    })
  } catch (error) {
    console.error("API usage stats error:", error)
    return NextResponse.json(
      { success: false, error: "Failed to fetch API usage stats" },
      { status: 500 }
    )
  }
}
