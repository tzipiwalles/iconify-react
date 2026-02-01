import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

// GET handler for testing if route is reachable
export async function GET(
  request: NextRequest,
  { params }: { params: { name: string } }
) {
  console.log("[Visibility API] GET request for:", params.name)
  return NextResponse.json({ 
    success: true, 
    message: "Visibility route is working",
    name: params.name 
  })
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { name: string } }
) {
  console.log("[Visibility API] PATCH request for:", params.name)
  
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    console.log("[Visibility API] User:", user?.email || "anonymous")
    
    const body = await request.json()
    const { visibility } = body
    console.log("[Visibility API] Requested visibility:", visibility)
    
    if (!["public", "private"].includes(visibility)) {
      return NextResponse.json(
        { success: false, error: "Invalid visibility value" },
        { status: 400 }
      )
    }

    // Find the asset by component name AND user_id (unique per user)
    console.log("[Visibility API] Looking for asset:", params.name, "for user:", user?.id || "anonymous")
    
    let query = supabase
      .from("assets")
      .select("id, user_id")
      .eq("component_name", params.name)
    
    // If user is logged in, find their asset. Otherwise, find anonymous assets.
    if (user) {
      query = query.eq("user_id", user.id)
    } else {
      query = query.is("user_id", null)
    }
    
    const { data: assets, error: fetchError } = await query
      .order("created_at", { ascending: false })
      .limit(1)

    console.log("[Visibility API] Asset query result:", { assets, fetchError })

    if (fetchError || !assets || assets.length === 0) {
      console.log("[Visibility API] Asset not found:", params.name)
      return NextResponse.json(
        { success: false, error: "Asset not found", name: params.name },
        { status: 404 }
      )
    }

    const asset = assets[0]

    // Update visibility
    const { error: updateError } = await supabase
      .from("assets")
      .update({ visibility })
      .eq("id", asset.id)

    if (updateError) {
      console.error("Failed to update visibility:", updateError)
      return NextResponse.json(
        { success: false, error: "Failed to update visibility" },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      visibility,
    })
  } catch (error) {
    console.error("Visibility update error:", error)
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    )
  }
}
