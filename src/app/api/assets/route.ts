import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { trackApiUsage } from "@/lib/api-usage"

// GET /api/assets - List public assets (shared library)
export async function GET(request: Request) {
  const startTime = Date.now()
  
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    
    const mode = searchParams.get("mode") // "icon" | "logo" | null (all)
    const limit = parseInt(searchParams.get("limit") || "50")
    const offset = parseInt(searchParams.get("offset") || "0")

    let query = supabase
      .from("assets")
      .select("id, component_name, svg_url, mode, detected_colors, created_at")
      .eq("visibility", "public")
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1)

    if (mode && (mode === "icon" || mode === "logo")) {
      query = query.eq("mode", mode)
    }

    const { data: assets, error } = await query

    if (error) throw error

    const responseTimeMs = Date.now() - startTime

    // Track API usage (non-blocking)
    trackApiUsage(request, {
      endpoint: "/api/assets",
      method: "GET",
      queryParams: Object.fromEntries(searchParams),
      statusCode: 200,
      responseTimeMs,
    })

    return NextResponse.json({
      success: true,
      data: assets || [],
      pagination: {
        limit,
        offset,
        hasMore: (assets?.length || 0) === limit,
      },
    })
  } catch (error) {
    console.error("Error listing assets:", error)
    
    const responseTimeMs = Date.now() - startTime
    
    // Track failed request
    trackApiUsage(request, {
      endpoint: "/api/assets",
      method: "GET",
      statusCode: 500,
      responseTimeMs,
    })
    
    return NextResponse.json(
      { success: false, error: "Failed to list assets" },
      { status: 500 }
    )
  }
}
