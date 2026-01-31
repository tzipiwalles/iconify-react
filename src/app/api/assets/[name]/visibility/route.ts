import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function PATCH(
  request: NextRequest,
  { params }: { params: { name: string } }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    const { visibility } = await request.json()
    
    if (!["public", "private"].includes(visibility)) {
      return NextResponse.json(
        { success: false, error: "Invalid visibility value" },
        { status: 400 }
      )
    }

    // Find the asset by component name
    const { data: asset, error: fetchError } = await supabase
      .from("assets")
      .select("id, user_id")
      .eq("component_name", params.name)
      .single()

    if (fetchError || !asset) {
      return NextResponse.json(
        { success: false, error: "Asset not found" },
        { status: 404 }
      )
    }

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
