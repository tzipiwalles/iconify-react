import { NextRequest, NextResponse } from "next/server"

// Validate API key from environment
function validateApiKey(request: NextRequest): boolean {
  const apiKey = request.headers.get("x-api-key")
  const validKey = process.env.ASSET_BRIDGE_API_KEY
  
  if (!validKey) {
    console.error("[API v1] ASSET_BRIDGE_API_KEY not configured")
    return false
  }
  
  return apiKey === validKey
}

// Fetch image from URL
async function fetchImageFromUrl(url: string): Promise<{ buffer: Buffer; contentType: string; filename: string } | null> {
  try {
    const response = await fetch(url)
    if (!response.ok) {
      console.error(`[API v1] Failed to fetch image from URL: ${response.status}`)
      return null
    }
    
    const contentType = response.headers.get("content-type") || "image/png"
    const arrayBuffer = await response.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    
    // Extract filename from URL or generate one
    const urlPath = new URL(url).pathname
    const filename = urlPath.split("/").pop() || `image_${Date.now()}.png`
    
    return { buffer, contentType, filename }
  } catch (error) {
    console.error("[API v1] Error fetching image:", error)
    return null
  }
}

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  console.log("[API v1] 🚀 Upload request received")
  
  // Validate API key
  if (!validateApiKey(request)) {
    return NextResponse.json(
      { 
        success: false, 
        error: "Unauthorized. Invalid or missing API key.",
        hint: "Include 'x-api-key' header with your API key"
      },
      { status: 401 }
    )
  }
  
  try {
    const contentType = request.headers.get("content-type") || ""
    
    let file: File | null = null
    let mode = "logo"
    let componentName: string | null = null
    let removeBackground = true
    
    // Handle multipart/form-data (file upload)
    if (contentType.includes("multipart/form-data")) {
      console.log("[API v1] Processing multipart/form-data")
      const formData = await request.formData()
      
      file = formData.get("file") as File | null
      mode = (formData.get("mode") as string) || "logo"
      componentName = formData.get("name") as string | null
      removeBackground = formData.get("remove_background") !== "false"
      
      if (!file) {
        return NextResponse.json(
          { success: false, error: "No file provided in form data" },
          { status: 400 }
        )
      }
    }
    // Handle application/json (URL-based upload)
    else if (contentType.includes("application/json")) {
      console.log("[API v1] Processing JSON request")
      const body = await request.json()
      
      const imageUrl = body.url || body.image_url
      mode = body.mode || "logo"
      componentName = body.name || body.component_name
      removeBackground = body.remove_background !== false
      
      if (!imageUrl) {
        return NextResponse.json(
          { success: false, error: "No image URL provided. Include 'url' or 'image_url' in request body" },
          { status: 400 }
        )
      }
      
      // Fetch the image from URL
      const fetchedImage = await fetchImageFromUrl(imageUrl)
      if (!fetchedImage) {
        return NextResponse.json(
          { success: false, error: "Failed to fetch image from provided URL" },
          { status: 400 }
        )
      }
      
      // Create a File object from the fetched buffer
      const blob = new Blob([fetchedImage.buffer], { type: fetchedImage.contentType })
      file = new File([blob], fetchedImage.filename, { type: fetchedImage.contentType })
    }
    else {
      return NextResponse.json(
        { 
          success: false, 
          error: "Unsupported content type",
          hint: "Use 'multipart/form-data' for file uploads or 'application/json' with image URL"
        },
        { status: 400 }
      )
    }
    
    if (!file) {
      return NextResponse.json(
        { success: false, error: "No image provided" },
        { status: 400 }
      )
    }
    
    // Validate file type
    const allowedTypes = ["image/png", "image/jpeg", "image/jpg", "image/webp", "image/svg+xml"]
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Unsupported file type: ${file.type}`,
          allowed_types: allowedTypes
        },
        { status: 400 }
      )
    }
    
    // Forward to internal process endpoint
    const internalFormData = new FormData()
    internalFormData.append("file", file)
    internalFormData.append("mode", mode)
    internalFormData.append("removeBackground", removeBackground.toString())
    if (componentName) {
      internalFormData.append("componentName", componentName)
    }
    
    // Get the base URL for internal request
    const baseUrl = process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}` 
      : process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"
    
    console.log(`[API v1] Forwarding to internal process endpoint: ${baseUrl}/api/process`)
    
    const processResponse = await fetch(`${baseUrl}/api/process`, {
      method: "POST",
      body: internalFormData,
    })
    
    const result = await processResponse.json()
    
    if (!processResponse.ok || !result.success) {
      console.error("[API v1] Process failed:", result.error)
      return NextResponse.json(
        { 
          success: false, 
          error: result.error || "Processing failed",
          details: result.errorType
        },
        { status: processResponse.status }
      )
    }
    
    const totalTime = Date.now() - startTime
    console.log(`[API v1] ✅ Upload complete in ${totalTime}ms`)
    
    // Return clean API response
    return NextResponse.json({
      success: true,
      data: {
        name: result.data.componentName,
        url: `https://www.assetbridge.app/api/assets/${result.data.componentName}/svg`,
        svg_url: result.data.publicUrl,
        mode: result.data.mode || mode,
        detected_colors: result.data.detectedColors || [],
        asset_id: result.data.assetId,
      },
      meta: {
        processing_time_ms: totalTime,
        vectorized: mode !== "image",
      }
    })
    
  } catch (error) {
    console.error("[API v1] Error:", error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : "Internal server error"
      },
      { status: 500 }
    )
  }
}

// GET endpoint for API documentation
export async function GET() {
  return NextResponse.json({
    name: "Asset-Bridge API",
    version: "v1",
    description: "Programmatically upload images and get optimized SVG URLs for AI agents",
    endpoints: {
      "POST /api/v1/upload": {
        description: "Upload an image and get back an optimized, permanent URL",
        authentication: "x-api-key header required",
        content_types: ["multipart/form-data", "application/json"],
        parameters: {
          "file": "(form-data) The image file to upload",
          "url": "(json) URL of image to fetch and process",
          "mode": "Processing mode: 'icon' | 'logo' | 'image' (default: 'logo')",
          "name": "Optional custom name for the asset",
          "remove_background": "Whether to remove background (default: true)"
        },
        response: {
          "success": "boolean",
          "data.name": "Generated component name",
          "data.url": "Permanent URL for the asset",
          "data.svg_url": "Direct SVG/image URL",
          "data.mode": "Processing mode used",
          "data.detected_colors": "Array of detected brand colors"
        }
      }
    },
    examples: {
      curl_file_upload: `curl -X POST https://www.assetbridge.app/api/v1/upload \\
  -H "x-api-key: YOUR_API_KEY" \\
  -F "file=@logo.png" \\
  -F "mode=logo"`,
      curl_url_upload: `curl -X POST https://www.assetbridge.app/api/v1/upload \\
  -H "x-api-key: YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"url": "https://example.com/logo.png", "mode": "logo"}'`
    }
  })
}
