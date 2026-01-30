import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: Request) {
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

    // Get excluded user IDs from query params
    const { searchParams } = new URL(request.url)
    const excludedUsersParam = searchParams.get('excludedUsers')
    const excludedUserIds = excludedUsersParam ? excludedUsersParam.split(',') : []

    // Get event stats using the function
    const { data: eventStats, error: statsError } = await supabase
      .rpc("get_event_stats")

    // Build query for events, excluding specified users
    let generateClicksQuery = supabase
      .from("events")
      .select("id", { count: "exact", head: true })
      .eq("event_type", "generate_click")
    
    if (excludedUserIds.length > 0) {
      // Filter: only include events where user_id is null OR not in excluded list
      generateClicksQuery = generateClicksQuery.or(`user_id.is.null,user_id.not.in.(${excludedUserIds.join(',')})`)
    }
    
    const { count: generateClicks } = await generateClicksQuery

    let generateSuccessQuery = supabase
      .from("events")
      .select("id", { count: "exact", head: true })
      .eq("event_type", "generate_success")
    
    if (excludedUserIds.length > 0) {
      generateSuccessQuery = generateSuccessQuery.or(`user_id.is.null,user_id.not.in.(${excludedUserIds.join(',')})`)
    }
    
    const { count: generateSuccess } = await generateSuccessQuery

    let saveAssetsQuery = supabase
      .from("events")
      .select("id", { count: "exact", head: true })
      .eq("event_type", "save_asset")
    
    if (excludedUserIds.length > 0) {
      saveAssetsQuery = saveAssetsQuery.or(`user_id.is.null,user_id.not.in.(${excludedUserIds.join(',')})`)
    }
    
    const { count: saveAssets } = await saveAssetsQuery

    // Get unique users who clicked generate
    let uniqueGeneratorsQuery = supabase
      .from("events")
      .select("user_id, session_id")
      .eq("event_type", "generate_click")
    
    if (excludedUserIds.length > 0) {
      uniqueGeneratorsQuery = uniqueGeneratorsQuery.or(`user_id.is.null,user_id.not.in.(${excludedUserIds.join(',')})`)
    }
    
    const { data: uniqueGenerators } = await uniqueGeneratorsQuery

    const uniqueGenerateUsers = new Set(
      uniqueGenerators?.map(e => e.user_id || e.session_id) || []
    ).size

    // Get today's stats
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    let todayGeneratesQuery = supabase
      .from("events")
      .select("id", { count: "exact", head: true })
      .eq("event_type", "generate_click")
      .gte("created_at", today.toISOString())
    
    if (excludedUserIds.length > 0) {
      todayGeneratesQuery = todayGeneratesQuery.or(`user_id.is.null,user_id.not.in.(${excludedUserIds.join(',')})`)
    }
    
    const { count: todayGenerates } = await todayGeneratesQuery

    // Get recent events
    let recentEventsQuery = supabase
      .from("events")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50)
    
    if (excludedUserIds.length > 0) {
      recentEventsQuery = recentEventsQuery.or(`user_id.is.null,user_id.not.in.(${excludedUserIds.join(',')})`)
    }
    
    const { data: recentEvents } = await recentEventsQuery

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
