import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

interface StatsResponse {
  success: boolean
  data: {
    users: number
    icons: number
    logos: number
    totalAssets: number
  }
}

// Cache the stats for 5 minutes to avoid hitting DB on every request
let cachedStats: { data: StatsResponse; timestamp: number } | null = null
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

export async function GET() {
  try {
    // Return cached stats if still valid
    if (cachedStats && Date.now() - cachedStats.timestamp < CACHE_DURATION) {
      return NextResponse.json(cachedStats.data)
    }
    
    const supabase = await createClient()
    
    // Use the database function that bypasses RLS for counting
    const { data: statsData, error } = await supabase.rpc("get_public_stats")
    
    if (error) {
      console.error("Stats RPC error:", error)
      // Fallback to direct query (may return limited results due to RLS)
      const { count: userCount } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
      
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
      
      cachedStats = { data: stats, timestamp: Date.now() }
      return NextResponse.json(stats)
    }
    
    const stats = {
      success: true,
      data: {
        users: statsData?.users || 0,
        icons: statsData?.icons || 0,
        logos: statsData?.logos || 0,
        totalAssets: statsData?.totalAssets || 0,
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
