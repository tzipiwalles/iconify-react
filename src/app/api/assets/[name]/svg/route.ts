import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

// Helper to verify API key and get the owner's user_id
async function verifyApiKey(supabase: Awaited<ReturnType<typeof createClient>>, apiKey: string): Promise<string | null> {
  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("api_key", apiKey)
    .single()
  
  return profile?.id || null
}

// GET /api/assets/[name]/svg - Get raw SVG file
// Public assets: no key needed
// Private/Org assets: requires ?key=sk_xxx
export async function GET(
  request: Request,
  { params }: { params: { name: string } }
) {
  try {
    const supabase = await createClient()
    const componentName = params.name
    const { searchParams } = new URL(request.url)
    const apiKey = searchParams.get("key")

    // First, try to find a PUBLIC asset (no key needed)
    const { data: publicAsset } = await supabase
      .from("assets")
      .select("svg_url, component_name, user_id")
      .eq("component_name", componentName)
      .eq("visibility", "public")
      .order("created_at", { ascending: false })
      .limit(1)
      .single()

    if (publicAsset) {
      // Public asset found - serve it
      const svgResponse = await fetch(publicAsset.svg_url)
      if (!svgResponse.ok) {
        return new NextResponse("Failed to fetch SVG", { status: 500 })
      }
      const svgContent = await svgResponse.text()
      
      return new NextResponse(svgContent, {
        status: 200,
        headers: {
          "Content-Type": "image/svg+xml",
          "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400", // 1 hour cache, revalidate in background for 24h
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET",
        },
      })
    }

    // No public asset - check for private/org asset with API key
    if (!apiKey) {
      return new NextResponse("Asset not found or requires API key. Add ?key=your_api_key", { status: 404 })
    }

    // Verify API key
    const keyOwnerId = await verifyApiKey(supabase, apiKey)
    if (!keyOwnerId) {
      return new NextResponse("Invalid API key", { status: 401 })
    }

    // Find asset owned by this user OR in their organization
    const { data: profile } = await supabase
      .from("profiles")
      .select("organization_id")
      .eq("id", keyOwnerId)
      .single()

    // Try to find the asset:
    // 1. Private asset owned by the key owner
    // 2. Organization asset if user is in an org
    let asset = null

    // Check for private asset owned by key owner
    const { data: privateAsset } = await supabase
      .from("assets")
      .select("svg_url, component_name, user_id, visibility")
      .eq("component_name", componentName)
      .eq("user_id", keyOwnerId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single()

    if (privateAsset) {
      asset = privateAsset
    } else if (profile?.organization_id) {
      // Check for organization asset
      const { data: orgAsset } = await supabase
        .from("assets")
        .select("svg_url, component_name, user_id, visibility")
        .eq("component_name", componentName)
        .eq("visibility", "organization")
        .order("created_at", { ascending: false })
        .limit(1)
        .single()
      
      if (orgAsset) {
        // Verify the asset owner is in the same org
        const { data: ownerProfile } = await supabase
          .from("profiles")
          .select("organization_id")
          .eq("id", orgAsset.user_id)
          .single()
        
        if (ownerProfile?.organization_id === profile.organization_id) {
          asset = orgAsset
        }
      }
    }

    if (!asset) {
      return new NextResponse("Asset not found or access denied", { status: 404 })
    }

    // Fetch and serve the SVG
    const svgResponse = await fetch(asset.svg_url)
    if (!svgResponse.ok) {
      return new NextResponse("Failed to fetch SVG", { status: 500 })
    }
    const svgContent = await svgResponse.text()

    return new NextResponse(svgContent, {
      status: 200,
      headers: {
        "Content-Type": "image/svg+xml",
        "Cache-Control": "private, max-age=3600", // Shorter cache for private assets
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET",
      },
    })
  } catch (error) {
    console.error("Error fetching SVG:", error)
    return new NextResponse("Internal server error", { status: 500 })
  }
}
