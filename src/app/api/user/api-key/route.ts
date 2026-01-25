import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import crypto from "crypto"

// Generate a new API key
function generateApiKey(): string {
  return "sk_" + crypto.randomBytes(20).toString("hex")
}

// GET /api/user/api-key - Get current API key
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get user's profile with api_key
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("api_key")
      .eq("id", user.id)
      .single()

    if (error) {
      console.error("Error fetching profile:", error)
      return NextResponse.json({ error: "Failed to fetch profile" }, { status: 500 })
    }

    // If no API key exists, generate one
    if (!profile?.api_key) {
      const newKey = generateApiKey()
      
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ api_key: newKey })
        .eq("id", user.id)

      if (updateError) {
        console.error("Error generating API key:", updateError)
        return NextResponse.json({ error: "Failed to generate API key" }, { status: 500 })
      }

      return NextResponse.json({
        success: true,
        data: { apiKey: newKey }
      })
    }

    return NextResponse.json({
      success: true,
      data: { apiKey: profile.api_key }
    })
  } catch (error) {
    console.error("API key fetch error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// POST /api/user/api-key - Refresh (regenerate) API key
export async function POST() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Generate new key
    const newKey = generateApiKey()

    // Update profile with new key
    const { error } = await supabase
      .from("profiles")
      .update({ api_key: newKey })
      .eq("id", user.id)

    if (error) {
      console.error("Error refreshing API key:", error)
      return NextResponse.json({ error: "Failed to refresh API key" }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      data: { apiKey: newKey },
      message: "API key refreshed successfully. Old key is now invalid."
    })
  } catch (error) {
    console.error("API key refresh error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
