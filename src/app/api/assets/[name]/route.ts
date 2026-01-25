import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

// Helper to verify API key and get the owner's user_id
async function verifyApiKey(supabase: Awaited<ReturnType<typeof createClient>>, apiKey: string): Promise<{ userId: string; orgId: string | null } | null> {
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, organization_id")
    .eq("api_key", apiKey)
    .single()
  
  return profile ? { userId: profile.id, orgId: profile.organization_id } : null
}

// Format asset response
function formatAssetResponse(asset: Record<string, unknown>) {
  return {
    success: true,
    data: {
      id: asset.id,
      componentName: asset.component_name,
      reactComponent: asset.react_component,
      svgUrl: asset.svg_url,
      optimizedSvg: null,
      mode: asset.mode,
      detectedColors: asset.detected_colors,
      visibility: asset.visibility,
      createdAt: asset.created_at,
    },
  }
}

// GET /api/assets/[name] - Get a shared asset by component name
// Supports: session auth, API key auth (?key=sk_xxx), or public access
export async function GET(
  request: Request,
  { params }: { params: { name: string } }
) {
  try {
    const supabase = await createClient()
    const componentName = params.name
    const { searchParams } = new URL(request.url)
    const apiKey = searchParams.get("key")

    // First try to find a public asset with this name
    const { data: publicAsset } = await supabase
      .from("assets")
      .select("*")
      .eq("component_name", componentName)
      .eq("visibility", "public")
      .order("created_at", { ascending: false })
      .limit(1)
      .single()

    if (publicAsset) {
      return NextResponse.json(formatAssetResponse(publicAsset))
    }

    // Try API key authentication first (for external access)
    if (apiKey) {
      const keyOwner = await verifyApiKey(supabase, apiKey)
      
      if (!keyOwner) {
        return NextResponse.json(
          { success: false, error: "Invalid API key" },
          { status: 401 }
        )
      }

      // Try to find user's own asset
      const { data: ownAsset } = await supabase
        .from("assets")
        .select("*")
        .eq("component_name", componentName)
        .eq("user_id", keyOwner.userId)
        .order("created_at", { ascending: false })
        .limit(1)
        .single()

      if (ownAsset) {
        return NextResponse.json(formatAssetResponse(ownAsset))
      }

      // Try to find organization asset
      if (keyOwner.orgId) {
        const { data: orgAssets } = await supabase
          .from("assets")
          .select("*, user:profiles!assets_user_id_fkey(organization_id)")
          .eq("component_name", componentName)
          .eq("visibility", "organization")
          .order("created_at", { ascending: false })
          .limit(10)

        const orgAsset = orgAssets?.find(a => 
          (a.user as { organization_id: string | null })?.organization_id === keyOwner.orgId
        )

        if (orgAsset) {
          return NextResponse.json(formatAssetResponse(orgAsset))
        }
      }

      return NextResponse.json(
        { success: false, error: "Asset not found or not accessible with this API key" },
        { status: 404 }
      )
    }

    // Try session authentication (for logged-in users in the app)
    const { data: { user } } = await supabase.auth.getUser()

    if (user) {
      // Try to find user's own asset
      const { data: ownAsset } = await supabase
        .from("assets")
        .select("*")
        .eq("component_name", componentName)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .single()

      if (ownAsset) {
        return NextResponse.json(formatAssetResponse(ownAsset))
      }

      // Try to find organization asset
      const { data: profile } = await supabase
        .from("profiles")
        .select("organization_id")
        .eq("id", user.id)
        .single()

      if (profile?.organization_id) {
        const { data: orgAssets } = await supabase
          .from("assets")
          .select("*, user:profiles!assets_user_id_fkey(organization_id)")
          .eq("component_name", componentName)
          .eq("visibility", "organization")
          .order("created_at", { ascending: false })
          .limit(10)

        const orgAsset = orgAssets?.find(a => 
          (a.user as { organization_id: string | null })?.organization_id === profile.organization_id
        )

        if (orgAsset) {
          return NextResponse.json(formatAssetResponse(orgAsset))
        }
      }
    }

    return NextResponse.json(
      { success: false, error: "Asset not found. For private assets, add ?key=your_api_key" },
      { status: 404 }
    )
  } catch (error) {
    console.error("Error fetching asset:", error)
    return NextResponse.json(
      { success: false, error: "Failed to fetch asset" },
      { status: 500 }
    )
  }
}
