import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

// GET /api/assets/[name]/svg - Get raw SVG file for a public asset
export async function GET(
  request: Request,
  { params }: { params: { name: string } }
) {
  try {
    const supabase = await createClient()
    const componentName = params.name

    // Find a public asset with this name
    const { data: asset, error } = await supabase
      .from("assets")
      .select("svg_url, component_name")
      .eq("component_name", componentName)
      .eq("visibility", "public")
      .order("created_at", { ascending: false })
      .limit(1)
      .single()

    if (error || !asset) {
      return new NextResponse("Asset not found", { status: 404 })
    }

    // Fetch the SVG from storage
    const svgResponse = await fetch(asset.svg_url)
    
    if (!svgResponse.ok) {
      return new NextResponse("Failed to fetch SVG", { status: 500 })
    }

    const svgContent = await svgResponse.text()

    // Return the SVG with proper headers
    return new NextResponse(svgContent, {
      status: 200,
      headers: {
        "Content-Type": "image/svg+xml",
        "Cache-Control": "public, max-age=31536000, immutable",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET",
      },
    })
  } catch (error) {
    console.error("Error fetching SVG:", error)
    return new NextResponse("Internal server error", { status: 500 })
  }
}
