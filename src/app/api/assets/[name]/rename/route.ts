import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ name: string }> }
) {
  try {
    const supabase = await createClient()
    const { name: oldName } = await context.params
    const { newName } = await request.json()

    // Validate new name
    if (!newName || typeof newName !== "string" || newName.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: "Invalid name" },
        { status: 400 }
      )
    }

    // Check auth
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      )
    }

    // Sanitize new name (remove special chars, spaces -> underscores)
    const sanitizedName = newName
      .trim()
      .replace(/[^a-zA-Z0-9\s-]/g, "")
      .replace(/\s+/g, "_")

    if (sanitizedName.length === 0) {
      return NextResponse.json(
        { success: false, error: "Name must contain at least one alphanumeric character" },
        { status: 400 }
      )
    }

    // Check if new name already exists for this user
    const { data: existing } = await supabase
      .from("assets")
      .select("id")
      .eq("user_id", user.id)
      .eq("component_name", sanitizedName)
      .single()

    if (existing) {
      return NextResponse.json(
        { success: false, error: "An asset with this name already exists" },
        { status: 409 }
      )
    }

    // Update the asset
    const { data, error } = await supabase
      .from("assets")
      .update({ component_name: sanitizedName })
      .eq("component_name", oldName)
      .eq("user_id", user.id)
      .select()
      .single()

    if (error) {
      console.error("Update error:", error)
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        oldName,
        newName: sanitizedName,
        asset: data,
      },
    })
  } catch (error) {
    console.error("Rename error:", error)
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    )
  }
}
