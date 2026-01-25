import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

// Admin emails - add your email here
const ADMIN_EMAILS = ["tzipi.walles@gmail.com"]

export async function GET() {
  try {
    const supabase = await createClient()
    
    // Check if user is authenticated and is admin
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    
    if (!ADMIN_EMAILS.includes(user.email || "")) {
      return NextResponse.json({ error: "Forbidden - Admin only" }, { status: 403 })
    }
    
    // Fetch all profiles with their asset counts
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false })
    
    if (profilesError) throw profilesError
    
    // Fetch asset counts per user
    const { data: assetCounts, error: assetsError } = await supabase
      .from("assets")
      .select("user_id, mode")
    
    if (assetsError) throw assetsError
    
    // Calculate stats per user
    const userStats = profiles?.map(profile => {
      const userAssets = assetCounts?.filter(a => a.user_id === profile.id) || []
      const iconCount = userAssets.filter(a => a.mode === "icon").length
      const logoCount = userAssets.filter(a => a.mode === "logo").length
      
      return {
        id: profile.id,
        email: profile.email,
        fullName: profile.full_name,
        avatarUrl: profile.avatar_url,
        createdAt: profile.created_at,
        totalAssets: userAssets.length,
        iconCount,
        logoCount,
      }
    }) || []
    
    // Calculate totals
    const totals = {
      totalUsers: profiles?.length || 0,
      totalAssets: assetCounts?.length || 0,
      totalIcons: assetCounts?.filter(a => a.mode === "icon").length || 0,
      totalLogos: assetCounts?.filter(a => a.mode === "logo").length || 0,
    }
    
    return NextResponse.json({
      success: true,
      data: {
        users: userStats,
        totals,
      },
    })
  } catch (error) {
    console.error("Admin API error:", error)
    return NextResponse.json(
      { error: "Failed to fetch admin data" },
      { status: 500 }
    )
  }
}
