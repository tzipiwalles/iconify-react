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

    // Get event stats using the function
    const { data: eventStats, error: statsError } = await supabase
      .rpc("get_event_stats")

    // Get totals for key events
    const { count: generateClicks } = await supabase
      .from("events")
      .select("id", { count: "exact", head: true })
      .eq("event_type", "generate_click")

    const { count: generateSuccess } = await supabase
      .from("events")
      .select("id", { count: "exact", head: true })
      .eq("event_type", "generate_success")

    const { count: saveAssets } = await supabase
      .from("events")
      .select("id", { count: "exact", head: true })
      .eq("event_type", "save_asset")

    // Get unique users who clicked generate
    const { data: uniqueGenerators } = await supabase
      .from("events")
      .select("user_id, session_id")
      .eq("event_type", "generate_click")

    const uniqueGenerateUsers = new Set(
      uniqueGenerators?.map(e => e.user_id || e.session_id) || []
    ).size

    // Get today's stats
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    const { count: todayGenerates } = await supabase
      .from("events")
      .select("id", { count: "exact", head: true })
      .eq("event_type", "generate_click")
      .gte("created_at", today.toISOString())

    // Get recent events
    const { data: recentEvents } = await supabase
      .from("events")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50)

    return NextResponse.json({
      success: true,
      data: {
        summary: {
          generateClicks: generateClicks || 0,
          generateSuccess: generateSuccess || 0,
          saveAssets: saveAssets || 0,
          uniqueGenerateUsers,
          todayGenerates: todayGenerates || 0,
          conversionRate: generateClicks 
            ? Math.round((generateSuccess || 0) / generateClicks * 100) 
            : 0,
        },
        eventStats: eventStats || [],
        recentEvents: recentEvents || [],
      },
    })
  } catch (error) {
    console.error("Events stats error:", error)
    return NextResponse.json(
      { success: false, error: "Failed to fetch event stats" },
      { status: 500 }
    )
  }
}
