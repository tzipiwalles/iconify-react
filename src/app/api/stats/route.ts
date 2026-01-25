import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

// Cache the stats for 5 minutes to avoid hitting DB on every request
let cachedStats: { data: any; timestamp: number } | null = null
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

export async function GET() {
  try {
    // Return cached stats if still valid
    if (cachedStats && Date.now() - cachedStats.timestamp < CACHE_DURATION) {
      return NextResponse.json(cachedStats.data)
    }
    
    const supabase = await createClient()
    
    // Count users
    const { count: userCount } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
    
    // Count assets by mode
    const { data: assets } = await supabase
      .from("assets")
      .select("mode")
    
    const iconCount = assets?.filter(a => a.mode === "icon").length || 0
    const logoCount = assets?.filter(a => a.mode === "logo").length || 0
    
    const stats = {
      success: true,
      data: {
        users: userCount || 0,
        icons: iconCount,
        logos: logoCount,
        totalAssets: iconCount + logoCount,
      },
    }
    
    // Cache the result
    cachedStats = { data: stats, timestamp: Date.now() }
    
    return NextResponse.json(stats)
  } catch (error) {
    console.error("Stats API error:", error)
    return NextResponse.json({
      success: true,
      data: { users: 0, icons: 0, logos: 0, totalAssets: 0 },
    })
  }
}
