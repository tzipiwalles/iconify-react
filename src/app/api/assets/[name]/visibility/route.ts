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

    // Find the asset by component name (get the most recent one if there are duplicates)
    console.log("[Visibility API] Looking for asset:", params.name)
    const { data: assets, error: fetchError } = await supabase
      .from("assets")
      .select("id, user_id")
      .eq("component_name", params.name)
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

    // Check ownership: either the user owns it or it's an anonymous asset
    const isOwner = asset.user_id === user?.id
    const isAnonymousAsset = asset.user_id === null

    // Only allow update if user owns it OR if it's anonymous (anyone can make anonymous assets public)
    if (!isOwner && !isAnonymousAsset) {
      return NextResponse.json(
        { success: false, error: "Not authorized to update this asset" },
        { status: 403 }
      )
    }

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
