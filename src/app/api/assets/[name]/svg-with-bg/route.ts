import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

// GET /api/assets/[name]/svg-with-bg?bg=black - Get SVG with background
export async function GET(
  request: Request,
  { params }: { params: { name: string } }
) {
  try {
    const { searchParams } = new URL(request.url)
    const bgColor = searchParams.get("bg") || "black" // default to black
    const size = parseInt(searchParams.get("size") || "512") // default 512x512
    
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

    // Fetch the original SVG
    const svgResponse = await fetch(asset.svg_url)
    
    if (!svgResponse.ok) {
      return new NextResponse("Failed to fetch SVG", { status: 500 })
    }

    const originalSvg = await svgResponse.text()
    
    // Parse the original SVG to get its viewBox
    const viewBoxMatch = originalSvg.match(/viewBox="([^"]*)"/)
    const viewBox = viewBoxMatch ? viewBoxMatch[1] : "0 0 24 24"
    
    // Parse viewBox dimensions
    const viewBoxParts = viewBox.split(/\s+/).map(Number)
    const vbWidth = viewBoxParts[2] || 24
    const vbHeight = viewBoxParts[3] || 24
    
    // Extract the path/content from original SVG (everything between <svg> tags)
    const contentMatch = originalSvg.match(/<svg[^>]*>([\s\S]*)<\/svg>/)
    const svgContent = contentMatch ? contentMatch[1] : originalSvg
    
    // Calculate scale to fit with padding (70% of canvas)
    const padding = size * 0.15
    const availableSize = size * 0.7
    const scale = Math.min(availableSize / vbWidth, availableSize / vbHeight)
    
    // Center the content
    const scaledWidth = vbWidth * scale
    const scaledHeight = vbHeight * scale
    const offsetX = (size - scaledWidth) / 2
    const offsetY = (size - scaledHeight) / 2

    // Create new SVG with background
    const wrappedSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" fill="${bgColor === 'white' ? '#ffffff' : '#000000'}"/>
  <g transform="translate(${offsetX}, ${offsetY}) scale(${scale})">
    ${svgContent}
  </g>
</svg>`

    // Return the wrapped SVG with proper headers
    return new NextResponse(wrappedSvg, {
      status: 200,
      headers: {
        "Content-Type": "image/svg+xml",
        "Cache-Control": "public, max-age=31536000, immutable",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET",
      },
    })
  } catch (error) {
    console.error("Error creating SVG with background:", error)
    return new NextResponse("Internal server error", { status: 500 })
  }
}
