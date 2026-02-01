import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

// Debug endpoint to list all assets - only works in development
export async function GET() {
  // Only allow in development
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json(
      { error: "Not available in production" },
      { status: 403 }
    )
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json(
      { error: "Missing Supabase configuration" },
      { status: 500 }
    )
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  })

  try {
    const { data: assets, error } = await supabaseAdmin
      .from("assets")
      .select("id, component_name, user_id, visibility, created_at")
      .order("created_at", { ascending: false })
      .limit(50)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Also search specifically for "ML"
    const { data: mlAsset, error: mlError } = await supabaseAdmin
      .from("assets")
      .select("*")
      .ilike("component_name", "%ML%")

    return NextResponse.json({
      total: assets?.length || 0,
      assets: assets?.map(a => ({
        name: a.component_name,
        user_id: a.user_id ? "has_user" : "anonymous",
        visibility: a.visibility,
        created: a.created_at
      })),
      mlSearch: mlAsset || [],
      mlError: mlError?.message
    })
  } catch (error) {
    return NextResponse.json(
      { error: String(error) },
      { status: 500 }
    )
  }
}
