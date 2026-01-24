import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

// GET /api/assets/[name] - Get a shared asset by component name
export async function GET(
  request: Request,
  { params }: { params: { name: string } }
) {
  try {
    const supabase = await createClient()
    const componentName = params.name

    // First try to find a public asset with this name
    const { data: publicAsset, error: publicError } = await supabase
      .from("assets")
      .select("*")
      .eq("component_name", componentName)
      .eq("visibility", "public")
      .order("created_at", { ascending: false })
      .limit(1)
      .single()

    if (publicAsset) {
      return NextResponse.json({
        success: true,
        data: {
          id: publicAsset.id,
          componentName: publicAsset.component_name,
          reactComponent: publicAsset.react_component,
          svgUrl: publicAsset.svg_url,
          optimizedSvg: null, // Could fetch from storage if needed
          mode: publicAsset.mode,
          detectedColors: publicAsset.detected_colors,
          visibility: publicAsset.visibility,
          createdAt: publicAsset.created_at,
        },
      })
    }

    // Check if user is authenticated for private/org assets
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
        return NextResponse.json({
          success: true,
          data: {
            id: ownAsset.id,
            componentName: ownAsset.component_name,
            reactComponent: ownAsset.react_component,
            svgUrl: ownAsset.svg_url,
            optimizedSvg: null,
            mode: ownAsset.mode,
            detectedColors: ownAsset.detected_colors,
            visibility: ownAsset.visibility,
            createdAt: ownAsset.created_at,
          },
        })
      }

      // Try to find organization asset (if user belongs to an org)
      const { data: profile } = await supabase
        .from("profiles")
        .select("organization_id")
        .eq("id", user.id)
        .single()

      if (profile?.organization_id) {
        const { data: orgAsset } = await supabase
          .from("assets")
          .select("*, profiles!inner(organization_id)")
          .eq("component_name", componentName)
          .eq("visibility", "organization")
          .eq("profiles.organization_id", profile.organization_id)
          .order("created_at", { ascending: false })
          .limit(1)
          .single()

        if (orgAsset) {
          return NextResponse.json({
            success: true,
            data: {
              id: orgAsset.id,
              componentName: orgAsset.component_name,
              reactComponent: orgAsset.react_component,
              svgUrl: orgAsset.svg_url,
              optimizedSvg: null,
              mode: orgAsset.mode,
              detectedColors: orgAsset.detected_colors,
              visibility: orgAsset.visibility,
              createdAt: orgAsset.created_at,
            },
          })
        }
      }
    }

    return NextResponse.json(
      { success: false, error: "Asset not found or not accessible" },
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
