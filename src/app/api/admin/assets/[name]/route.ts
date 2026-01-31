import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { isAdmin } from "@/lib/admin"

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ name: string }> }
) {
  try {
    const { name: componentName } = await context.params
    console.log(`[Admin Delete] Attempting to delete asset: ${componentName}`)

    // Check for required environment variables
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error("Missing required environment variables: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY")
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 })
    }

    // Create admin client inside the function to avoid build-time errors
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
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
      console.error("[Admin Delete] Auth error:", authError)
      return NextResponse.json({ error: "Invalid token", details: authError?.message }, { status: 401 })
    }

    console.log(`[Admin Delete] User: ${user.email}`)

    // Check if user is admin
    if (!isAdmin(user)) {
      console.error("[Admin Delete] User is not admin:", user.email)
      return NextResponse.json({ error: "Forbidden - Admin only" }, { status: 403 })
    }

    console.log(`[Admin Delete] Admin check passed`)

    // Get the asset first to find the storage path
    const { data: asset, error: fetchError } = await supabaseAdmin
      .from("assets")
      .select("id, user_id, svg_url")
      .eq("component_name", componentName)
      .single()

    if (fetchError || !asset) {
      console.error("[Admin Delete] Asset not found:", fetchError)
      return NextResponse.json({ 
        error: "Asset not found", 
        details: fetchError?.message 
      }, { status: 404 })
    }

    console.log(`[Admin Delete] Found asset:`, asset.id)

    // Delete from storage if exists
    if (asset.svg_url) {
      // Extract path from URL: .../storage/v1/object/public/assets/outputs/user_id/filename.svg
      // or: .../storage/v1/object/public/assets/svgs/filename.svg
      const urlParts = asset.svg_url.split("/assets/")
      if (urlParts.length > 1) {
        const storagePath = urlParts[1]
        console.log(`[Admin Delete] Deleting from storage: ${storagePath}`)
        const { error: storageError } = await supabaseAdmin.storage.from("assets").remove([storagePath])
        if (storageError) {
          console.error("[Admin Delete] Storage delete error:", storageError)
          // Continue even if storage delete fails
        }
      }
    }

    // Delete the asset record
    console.log(`[Admin Delete] Deleting asset record from database`)
    const { error: deleteError } = await supabaseAdmin
      .from("assets")
      .delete()
      .eq("id", asset.id)

    if (deleteError) {
      console.error("[Admin Delete] Database delete error:", deleteError)
      return NextResponse.json({ 
        error: "Failed to delete asset", 
        details: deleteError.message 
      }, { status: 500 })
    }

    console.log(`[Admin Delete] Successfully deleted asset: ${componentName}`)

    return NextResponse.json({ 
      success: true, 
      message: `Asset "${componentName}" deleted by admin` 
    })

  } catch (error) {
    console.error("Admin delete error:", error instanceof Error ? error.message : error)
    return NextResponse.json({ 
      error: "Internal server error",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}
