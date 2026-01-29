import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

// GET /api/assets/public - Get all public assets
export async function GET() {
  try {
    const supabase = await createClient()

    const { data: assets, error } = await supabase
      .from("assets")
      .select(`
        id,
        component_name,
        svg_url,
        mode,
        detected_colors,
        created_at
      `)
      .eq("visibility", "public")
      .order("created_at", { ascending: false })
      .limit(50)

    if (error) {
      console.error("Error fetching public assets:", error)
      return NextResponse.json(
        { success: false, error: "Failed to fetch public assets" },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: assets.map(asset => ({
        id: asset.id,
        componentName: asset.component_name,
        svgUrl: asset.svg_url,
        mode: asset.mode,
        detectedColors: asset.detected_colors,
        createdAt: asset.created_at,
      })),
    })
  } catch (error) {
    console.error("Error fetching public assets:", error)
    return NextResponse.json(
      { success: false, error: "Failed to fetch public assets" },
      { status: 500 }
    )
  }
}
