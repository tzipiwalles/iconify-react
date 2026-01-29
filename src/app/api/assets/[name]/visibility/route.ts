import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"

// PATCH /api/assets/[name]/visibility - Update asset visibility
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ name: string }> }
) {
  try {
    const supabase = await createClient()
    const { name: componentName } = await context.params
    const { visibility } = await request.json()

    // Validate visibility
    if (!["public", "private"].includes(visibility)) {
      return NextResponse.json(
        { success: false, error: "Invalid visibility. Must be 'public' or 'private'" },
        { status: 400 }
      )
    }

    // Verify user is logged in
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      )
    }

    // Update the asset (verify ownership via user_id)
    const { data, error } = await supabase
      .from("assets")
      .update({ visibility })
      .eq("component_name", componentName)
      .eq("user_id", user.id)
      .select()
      .single()

    if (error) {
      console.error("Visibility update error:", error)
      return NextResponse.json(
        { success: false, error: "Asset not found or access denied" },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        componentName: data.component_name,
        visibility: data.visibility,
      },
    })
  } catch (error) {
    console.error("Error updating visibility:", error)
    return NextResponse.json(
      { success: false, error: "Failed to update visibility" },
      { status: 500 }
    )
  }
}
