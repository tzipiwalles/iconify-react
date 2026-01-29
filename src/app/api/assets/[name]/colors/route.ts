import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"

// PATCH /api/assets/[name]/colors - Update asset colors
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ name: string }> }
) {
  try {
    const supabase = await createClient()
    const { name: componentName } = await context.params
    const body = await request.json()
    
    const { detectedColors, additionalColors } = body as {
      detectedColors?: string[]
      additionalColors?: string[]
    }

    // Verify user is logged in
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      )
    }

    // Get the asset (verify ownership)
    const { data: asset, error: fetchError } = await supabase
      .from("assets")
      .select("*")
      .eq("component_name", componentName)
      .eq("user_id", user.id)
      .single()

    if (fetchError || !asset) {
      return NextResponse.json(
        { success: false, error: "Asset not found or access denied" },
        { status: 404 }
      )
    }

    // Build update object
    const updates: Record<string, unknown> = {}
    let needsSvgUpdate = false
    let colorMapping: { oldColor: string; newColor: string }[] = []

    // Handle detected colors change (affects the SVG)
    if (detectedColors && Array.isArray(detectedColors)) {
      const oldColors = asset.detected_colors as string[]
      
      // Find which colors changed
      colorMapping = oldColors.map((oldColor: string, index: number) => ({
        oldColor,
        newColor: detectedColors[index] || oldColor,
      })).filter(({ oldColor, newColor }) => oldColor !== newColor)
      
      if (colorMapping.length > 0) {
        needsSvgUpdate = true
        updates.detected_colors = detectedColors
      }
    }

    // Handle additional colors (doesn't affect SVG)
    if (additionalColors && Array.isArray(additionalColors)) {
      updates.additional_colors = additionalColors
    }

    // If no changes, return early
    if (Object.keys(updates).length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          componentName: asset.component_name,
          detectedColors: asset.detected_colors,
          additionalColors: asset.additional_colors || [],
          svgUrl: asset.svg_url,
        },
        message: "No changes detected",
      })
    }

    // If SVG needs updating, fetch and modify it
    if (needsSvgUpdate) {
      try {
        // Fetch current SVG
        const svgResponse = await fetch(asset.svg_url)
        let svgContent = await svgResponse.text()
        
        // Replace colors in SVG
        for (const { oldColor, newColor } of colorMapping) {
          // Handle different color formats in SVG
          const oldColorLower = oldColor.toLowerCase()
          const newColorLower = newColor.toLowerCase()
          
          // Replace hex colors (case insensitive)
          const hexRegex = new RegExp(oldColorLower.replace('#', '#?'), 'gi')
          svgContent = svgContent.replace(hexRegex, newColorLower)
          
          // Also replace the 3-digit hex if applicable
          // #ABC -> #AABBCC
          if (oldColor.length === 7) {
            const shortHex = `#${oldColor[1]}${oldColor[3]}${oldColor[5]}`
            if (shortHex.toLowerCase() !== oldColorLower) {
              svgContent = svgContent.replace(
                new RegExp(shortHex, 'gi'),
                newColorLower
              )
            }
          }
        }
        
        // Also update the React component
        let reactComponent = asset.react_component as string
        for (const { oldColor, newColor } of colorMapping) {
          const oldColorLower = oldColor.toLowerCase()
          const newColorLower = newColor.toLowerCase()
          reactComponent = reactComponent.replace(
            new RegExp(oldColorLower, 'gi'),
            newColorLower
          )
        }
        updates.react_component = reactComponent

        // Upload new SVG to storage
        const svgBuffer = Buffer.from(svgContent, 'utf-8')
        const timestamp = Date.now()
        const svgPath = `public/${user.id}/${componentName}_${timestamp}.svg`
        
        const { error: uploadError } = await supabase.storage
          .from("assets")
          .upload(svgPath, svgBuffer, {
            contentType: "image/svg+xml",
            upsert: true,
          })

        if (uploadError) {
          console.error("SVG upload error:", uploadError)
          return NextResponse.json(
            { success: false, error: "Failed to upload updated SVG" },
            { status: 500 }
          )
        }

        // Get public URL for the new SVG
        const { data: { publicUrl } } = supabase.storage
          .from("assets")
          .getPublicUrl(svgPath)

        updates.svg_url = publicUrl
      } catch (svgError) {
        console.error("SVG update error:", svgError)
        return NextResponse.json(
          { success: false, error: "Failed to update SVG colors" },
          { status: 500 }
        )
      }
    }

    // Update the database
    const { data: updatedAsset, error: updateError } = await supabase
      .from("assets")
      .update(updates)
      .eq("id", asset.id)
      .select()
      .single()

    if (updateError) {
      console.error("Database update error:", updateError)
      return NextResponse.json(
        { success: false, error: "Failed to update asset" },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        componentName: updatedAsset.component_name,
        detectedColors: updatedAsset.detected_colors,
        additionalColors: updatedAsset.additional_colors || [],
        svgUrl: updatedAsset.svg_url,
        reactComponent: updatedAsset.react_component,
      },
      message: needsSvgUpdate 
        ? "Colors updated and SVG regenerated" 
        : "Additional colors updated",
    })
  } catch (error) {
    console.error("Error updating colors:", error)
    return NextResponse.json(
      { success: false, error: "Failed to update colors" },
      { status: 500 }
    )
  }
}
