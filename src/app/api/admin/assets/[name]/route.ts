import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { isAdmin } from "@/lib/admin"

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ name: string }> }
) {
  try {
    const { name: componentName } = await context.params

    // Create admin client inside the function to avoid build-time errors
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Get auth header
    const authHeader = request.headers.get("authorization")
    if (!authHeader) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const token = authHeader.replace("Bearer ", "")
    
    // Verify user
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
    
    if (authError || !user) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 })
    }

    // Check if user is admin
    if (!isAdmin(user)) {
      return NextResponse.json({ error: "Forbidden - Admin only" }, { status: 403 })
    }

    // Get the asset first to find the storage path
    const { data: asset, error: fetchError } = await supabaseAdmin
      .from("assets")
      .select("id, user_id, svg_url")
      .eq("component_name", componentName)
      .single()

    if (fetchError || !asset) {
      return NextResponse.json({ error: "Asset not found" }, { status: 404 })
    }

    // Delete from storage if exists
    if (asset.svg_url) {
      // Extract path from URL: .../storage/v1/object/public/svgs/user_id/filename.svg
      const urlParts = asset.svg_url.split("/svgs/")
      if (urlParts.length > 1) {
        const storagePath = urlParts[1]
        await supabaseAdmin.storage.from("svgs").remove([storagePath])
      }
    }

    // Delete the asset record
    const { error: deleteError } = await supabaseAdmin
      .from("assets")
      .delete()
      .eq("id", asset.id)

    if (deleteError) {
      console.error("Error deleting asset:", deleteError)
      return NextResponse.json({ error: "Failed to delete asset" }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      message: `Asset "${componentName}" deleted by admin` 
    })

  } catch (error) {
    console.error("Admin delete error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
