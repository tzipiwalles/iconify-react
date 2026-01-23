import { NextRequest, NextResponse } from "next/server"
import sharp from "sharp"
import potrace from "potrace"
import { optimize } from "svgo"
import { createClient } from "@/lib/supabase/server"

// Type definitions for potrace
interface PotraceParams {
  threshold?: number
  color?: string
  background?: string
  turdSize?: number
  optTolerance?: number
  steps?: number
  fillStrategy?: string
  rangeDistribution?: string
}

/**
 * Extracts dominant colors from an image using sharp
 * Returns array of hex colors sorted by dominance (most dominant first)
 * sampleFromCenter: when true, samples only from center 60% to avoid background edges
 */
async function extractDominantColors(buffer: Buffer, colorCount: number, sampleFromCenter: boolean = false): Promise<string[]> {
  try {
    // Resize to small size for faster color analysis
    const { data, info } = await sharp(buffer)
      .resize(100, 100, { fit: 'cover' })
      .raw()
      .toBuffer({ resolveWithObject: true })
    
    // Collect all pixels with their colors
    const pixels: { r: number; g: number; b: number }[] = []
    
    // If sampling from center, define the bounds (center 60%)
    const centerMargin = sampleFromCenter ? 0.2 : 0 // 20% margin on each side
    const minX = Math.floor(info.width * centerMargin)
    const maxX = Math.floor(info.width * (1 - centerMargin))
    const minY = Math.floor(info.height! * centerMargin)
    const maxY = Math.floor(info.height! * (1 - centerMargin))
    
    for (let y = 0; y < info.height!; y++) {
      for (let x = 0; x < info.width; x++) {
        // Skip edge pixels if sampling from center
        if (sampleFromCenter && (x < minX || x > maxX || y < minY || y > maxY)) {
          continue
        }
        
        const i = (y * info.width + x) * info.channels
        const r = data[i]
        const g = data[i + 1]
        const b = data[i + 2]
        
        // Skip very transparent pixels if RGBA
        if (info.channels === 4 && data[i + 3] < 128) continue
        
        // Skip near-white pixels (likely light background)
        if (r > 240 && g > 240 && b > 240) continue
        
        pixels.push({ r, g, b })
      }
    }
    
    if (pixels.length === 0) {
      // Return colorful defaults instead of black/gray
      return colorCount === 1 
        ? ['#3B82F6']  // Blue
        : ['#3B82F6', '#8B5CF6', '#06B6D4', '#10B981', '#F59E0B'].slice(0, colorCount)
    }
    
    // Use k-means-like clustering to find dominant colors
    const clusters = kMeansClustering(pixels, colorCount)
    
    // Convert cluster centers to hex
    const colors = clusters.map(c => {
      const r = Math.round(c.r)
      const g = Math.round(c.g)
      const b = Math.round(c.b)
      return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`.toUpperCase()
    })
    
    // Sort by brightness (darkest first) for consistent layering
    colors.sort((a, b) => {
      const brightnessA = getColorBrightness(a)
      const brightnessB = getColorBrightness(b)
      return brightnessA - brightnessB
    })
    
    console.log(`[API] Detected colors: ${colors.join(', ')}`)
    return colors
  } catch (error) {
    console.error('[API] Color extraction failed:', error)
    // Return colorful defaults instead of grayscale
    return colorCount === 1 
      ? ['#3B82F6'] 
      : ['#3B82F6', '#8B5CF6', '#06B6D4', '#10B981', '#F59E0B'].slice(0, colorCount)
  }
}

/**
 * Simple k-means clustering for color extraction
 */
function kMeansClustering(
  pixels: { r: number; g: number; b: number }[],
  k: number
): { r: number; g: number; b: number }[] {
  // Initialize cluster centers with random pixels
  const centers: { r: number; g: number; b: number }[] = []
  const step = Math.floor(pixels.length / k)
  for (let i = 0; i < k; i++) {
    const pixel = pixels[Math.min(i * step, pixels.length - 1)]
    centers.push({ ...pixel })
  }
  
  // Run k-means iterations
  for (let iter = 0; iter < 10; iter++) {
    // Assign pixels to nearest cluster
    const clusters: { r: number; g: number; b: number }[][] = Array.from({ length: k }, () => [])
    
    for (const pixel of pixels) {
      let minDist = Infinity
      let nearestCluster = 0
      
      for (let i = 0; i < k; i++) {
        const dist = colorDistance(pixel, centers[i])
        if (dist < minDist) {
          minDist = dist
          nearestCluster = i
        }
      }
      
      clusters[nearestCluster].push(pixel)
    }
    
    // Update cluster centers
    for (let i = 0; i < k; i++) {
      if (clusters[i].length > 0) {
        const sumR = clusters[i].reduce((sum, p) => sum + p.r, 0)
        const sumG = clusters[i].reduce((sum, p) => sum + p.g, 0)
        const sumB = clusters[i].reduce((sum, p) => sum + p.b, 0)
        const count = clusters[i].length
        
        centers[i] = {
          r: sumR / count,
          g: sumG / count,
          b: sumB / count
        }
      }
    }
  }
  
  return centers
}

/**
 * Calculate Euclidean distance between two colors
 */
function colorDistance(
  c1: { r: number; g: number; b: number },
  c2: { r: number; g: number; b: number }
): number {
  return Math.sqrt(
    Math.pow(c1.r - c2.r, 2) +
    Math.pow(c1.g - c2.g, 2) +
    Math.pow(c1.b - c2.b, 2)
  )
}

/**
 * Detects the dominant background color by sampling corner pixels
 */
async function detectBackgroundColor(buffer: Buffer): Promise<{ r: number; g: number; b: number }> {
  const { data, info } = await sharp(buffer)
    .raw()
    .toBuffer({ resolveWithObject: true })

  const { width, height, channels } = info
  const samplePositions = [
    [0, 0], // top-left
    [width - 1, 0], // top-right
    [0, height - 1], // bottom-left
    [width - 1, height - 1], // bottom-right
    [Math.floor(width / 2), 0], // top-center
    [Math.floor(width / 2), height - 1], // bottom-center
  ]

  const colors: { r: number; g: number; b: number }[] = []
  
  for (const [x, y] of samplePositions) {
    const idx = (y * width + x) * channels
    colors.push({
      r: data[idx],
      g: data[idx + 1],
      b: data[idx + 2],
    })
  }

  // Find most common color (simple mode)
  const colorCounts = new Map<string, { color: { r: number; g: number; b: number }; count: number }>()
  
  for (const color of colors) {
    // Round to reduce variations
    const key = `${Math.round(color.r / 10) * 10},${Math.round(color.g / 10) * 10},${Math.round(color.b / 10) * 10}`
    const existing = colorCounts.get(key)
    if (existing) {
      existing.count++
    } else {
      colorCounts.set(key, { color, count: 1 })
    }
  }

  let maxCount = 0
  let bgColor = { r: 255, g: 255, b: 255 } // default white
  
  // Convert iterator to array for ES5 compatibility
  const colorEntries = Array.from(colorCounts.values())
  for (const { color, count } of colorEntries) {
    if (count > maxCount) {
      maxCount = count
      bgColor = color
    }
  }

  console.log(`[API] Detected background color: rgb(${bgColor.r}, ${bgColor.g}, ${bgColor.b})`)
  return bgColor
}

/**
 * Removes background by making similar colors transparent.
 * If REMOVE_BG_API_KEY is set, calls the remove.bg API instead.
 */
async function removeBackgroundFromImage(buffer: Buffer): Promise<Buffer<ArrayBuffer>> {
  const apiKey = process.env.REMOVE_BG_API_KEY

  console.log(`[API] 🔍 Checking remove.bg API key... ${apiKey ? '✅ FOUND (starts with: ' + apiKey.substring(0, 8) + '...)' : '❌ NOT FOUND'}`)
  console.log(`[API] 📦 Input buffer size: ${buffer.length} bytes`)

  // If API key is available, use remove.bg for better results
  if (apiKey) {
    try {
      console.log("[API] 🚀 Using remove.bg API for background removal...")
      const formData = new FormData()
      formData.append("image_file", new Blob([new Uint8Array(buffer)]), "image.png")
      formData.append("size", "auto")

      const response = await fetch("https://api.remove.bg/v1.0/removebg", {
        method: "POST",
        headers: {
          "X-Api-Key": apiKey,
        },
        body: formData,
      })

      console.log(`[API] 📡 remove.bg response status: ${response.status}`)

      if (!response.ok) {
        const error = await response.text()
        console.error("[API] ❌ remove.bg API error:", error)
        throw new Error(`Background removal failed: ${response.status}`)
      }

      const arrayBuffer = await response.arrayBuffer()
      const resultBuffer = Buffer.from(arrayBuffer) as Buffer<ArrayBuffer>
      console.log(`[API] ✅ remove.bg SUCCESS! Output buffer size: ${resultBuffer.length} bytes`)
      return resultBuffer
    } catch (error) {
      console.error("[API] ⚠️ remove.bg API error, falling back to local removal:", error)
    }
  }

  // Local background removal using sharp
  console.log("[API] 🔧 Using local background removal...")
  
  try {
    // Detect background color from corners
    const bgColor = await detectBackgroundColor(buffer)
    
    // Tolerance for color matching (0-255)
    const tolerance = 30
    
    // Get raw pixel data
    const { data, info } = await sharp(buffer)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true })

    const { width, height } = info
    const channels = 4 // RGBA after ensureAlpha
    
    // Create new buffer with transparency
    const newData = Buffer.from(data)
    
    for (let i = 0; i < data.length; i += channels) {
      const r = data[i]
      const g = data[i + 1]
      const b = data[i + 2]
      
      // Check if pixel is similar to background color
      const diffR = Math.abs(r - bgColor.r)
      const diffG = Math.abs(g - bgColor.g)
      const diffB = Math.abs(b - bgColor.b)
      
      if (diffR <= tolerance && diffG <= tolerance && diffB <= tolerance) {
        // Make transparent
        newData[i + 3] = 0
      }
    }

    // Convert back to PNG
    const result = await sharp(newData, {
      raw: {
        width,
        height,
        channels: 4,
      },
    })
      .png()
      .toBuffer()

    console.log("[API] Local background removal complete")
    return result as Buffer<ArrayBuffer>
  } catch (error) {
    console.error("Local background removal error:", error)
    return buffer as Buffer<ArrayBuffer>
  }
}

/**
 * Converts a raster image buffer to monochrome SVG using potrace trace
 */
async function traceToSvg(buffer: Buffer): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      const params: PotraceParams = {
        threshold: 128,
        color: "currentColor",
        background: "transparent",
        turdSize: 4,           // Remove small noise (increased from 2)
        optTolerance: 0.1,     // More accurate curves (decreased from 0.2)
      }

      potrace.trace(buffer, params, (err: Error | null, svg: string) => {
        if (err) {
          console.error("Potrace error:", err)
          reject(err)
          return
        }
        resolve(svg)
      })
    } catch (error) {
      console.error("Potrace initialization error:", error)
      reject(error)
    }
  })
}

/**
 * Converts a raster image buffer to multi-color SVG using potrace posterize
 */
async function posterizeToSvg(buffer: Buffer, colorCount: number): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      const params = {
        steps: colorCount,
        fillStrategy: "dominant",
        rangeDistribution: "auto",
        background: "transparent",
        turdSize: 4,           // Remove small noise (increased from 2)
        optTolerance: 0.1,     // More accurate curves (decreased from 0.2)
      }

      potrace.posterize(buffer, params, (err: Error | null, svg: string) => {
        if (err) {
          console.error("Potrace posterize error:", err)
          reject(err)
          return
        }
        resolve(svg)
      })
    } catch (error) {
      console.error("Potrace posterize initialization error:", error)
      reject(error)
    }
  })
}

/**
 * Removes the background path from SVG
 * Identifies background by looking for paths that start at 0,0 and cover the full viewBox
 */
function removeBackgroundPath(svgString: string): string {
  console.log("[API] Removing background path from SVG...")
  
  // Extract viewBox dimensions
  const viewBoxMatch = svgString.match(/viewBox="(\d+)\s+(\d+)\s+(\d+)\s+(\d+)"/)
  const vbWidth = viewBoxMatch ? parseInt(viewBoxMatch[3]) : 0
  const vbHeight = viewBoxMatch ? parseInt(viewBoxMatch[4]) : 0
  
  let removedCount = 0
  let keptCount = 0
  
  const result = svgString.replace(/<path\s+([^>]*?)(?:\/?>|>[\s\S]*?<\/path>)/gi, (match, attrs) => {
    // Check if the path's d attribute starts with M0 or covers the full area
    const dMatch = attrs.match(/d="([^"]*)"/)
    if (dMatch) {
      const d = dMatch[1]
      
      // Background paths typically:
      // 1. Start at M0 0 or M0 [height/2] (covers from top-left)
      // 2. Contain the viewBox dimensions
      // 3. Are simple rectangles covering the whole area
      
      const startsAtOrigin = /^M\s*0\s+/.test(d) || /^M\s*0\s*,/.test(d)
      const containsFullWidth = d.includes(`${vbWidth}`) || d.includes(`${vbWidth - 1}`)
      const containsFullHeight = d.includes(`${vbHeight}`) || d.includes(`${vbHeight - 1}`)
      const isLikelyBackground = startsAtOrigin && containsFullWidth && containsFullHeight
      
      // Also check if it starts with M0 and immediately has V (vertical) covering height
      const isFullRect = /^M\s*0\s+[\d.]+V[\d.]+/.test(d) && containsFullWidth
      
      if (isLikelyBackground || isFullRect) {
        console.log("[API] Removed background path (covers full viewBox)")
        removedCount++
        return '' // Remove this path
      }
    }
    
    keptCount++
    return match
  })
  
  console.log(`[API] Removed ${removedCount} background paths, kept ${keptCount} foreground paths`)
  
  // If we didn't remove anything, the background detection failed
  // In this case, don't modify the SVG
  if (removedCount === 0) {
    console.log("[API] No background path detected, keeping original SVG")
    return svgString
  }
  
  return result
}

/**
 * Replaces colors in SVG with custom brand colors
 * Assigns colors to paths/shapes based on their order
 * Preserves pure white/black colors (likely text) by not replacing them:
 * - Brightness > 200: white/light gray text
 * - Brightness < 30: black/dark text
 */
function applyCustomColors(svgString: string, customColors: string[]): string {
  console.log("[API] Applying custom colors to SVG...")
  console.log("[API] SVG before colors:", svgString.substring(0, 300))
  
  let result = svgString
  let pathIndex = 0
  let preservedPaths = 0
  
  // Replace fills in path elements (handle both <path .../> and <path ...></path>)
  result = result.replace(/<path\s+([^>]*?)(\/?>)/gi, (match, attrs, ending) => {
    // Check if path already has a fill color
    const fillMatch = attrs.match(/fill\s*=\s*["']([^"']*)["']/i)
    
    if (fillMatch) {
      const existingColor = fillMatch[1]
      const brightness = getColorBrightness(existingColor)
      
      // Preserve very bright (white/light gray) or very dark (black) colors - likely text
      // Brightness > 200 = white/light gray
      // Brightness < 30 = pure black/very dark
      if (brightness > 200 || brightness < 30) {
        console.log(`[API] Path ${pathIndex + 1}: preserving text color ${existingColor} (brightness: ${brightness})`)
        pathIndex++
        preservedPaths++
        return match // Keep original
      }
    }
    
    const color = customColors[pathIndex % customColors.length]
    pathIndex++
    
    // Remove any existing fill attribute
    const cleanAttrs = attrs.replace(/\s*fill\s*=\s*["'][^"']*["']/gi, '')
    console.log(`[API] Path ${pathIndex}: applying ${color}`)
    return `<path ${cleanAttrs} fill="${color}"${ending}`
  })
  
  // Also handle rect, circle, polygon, ellipse
  const shapes = ['rect', 'circle', 'polygon', 'ellipse']
  for (const shape of shapes) {
    const regex = new RegExp(`<${shape}\\s+([^>]*?)(\\/?>)`, 'gi')
    result = result.replace(regex, (match, attrs, ending) => {
      // Check for existing bright or very dark colors (likely text)
      const fillMatch = attrs.match(/fill\s*=\s*["']([^"']*)["']/i)
      
      if (fillMatch) {
        const existingColor = fillMatch[1]
        const brightness = getColorBrightness(existingColor)
        
        // Preserve white/light gray or pure black
        if (brightness > 200 || brightness < 30) {
          console.log(`[API] ${shape} ${pathIndex + 1}: preserving text color ${existingColor} (brightness: ${brightness})`)
          pathIndex++
          preservedPaths++
          return match
        }
      }
      
      const color = customColors[pathIndex % customColors.length]
      pathIndex++
      const cleanAttrs = attrs.replace(/\s*fill\s*=\s*["'][^"']*["']/gi, '')
      console.log(`[API] ${shape} ${pathIndex}: applying ${color}`)
      return `<${shape} ${cleanAttrs} fill="${color}"${ending}`
    })
  }
  
  console.log(`[API] Applied colors to ${pathIndex - preservedPaths} elements, preserved ${preservedPaths} text elements (white/black)`)
  console.log("[API] SVG after colors:", result.substring(0, 300))
  return result
}

/**
 * Calculates the perceived brightness of a color (0-255)
 */
function getColorBrightness(color: string): number {
  let r = 0, g = 0, b = 0
  
  if (color.startsWith('#')) {
    const hex = color.slice(1)
    if (hex.length === 3) {
      r = parseInt(hex[0] + hex[0], 16)
      g = parseInt(hex[1] + hex[1], 16)
      b = parseInt(hex[2] + hex[2], 16)
    } else if (hex.length === 6) {
      r = parseInt(hex.slice(0, 2), 16)
      g = parseInt(hex.slice(2, 4), 16)
      b = parseInt(hex.slice(4, 6), 16)
    }
  } else if (color.startsWith('rgb')) {
    const match = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/)
    if (match) {
      r = parseInt(match[1])
      g = parseInt(match[2])
      b = parseInt(match[3])
    }
  }
  
  // Perceived brightness formula
  return (r * 299 + g * 587 + b * 114) / 1000
}

/**
 * Optimizes SVG string with SVGO
 * - Forces viewBox to 0 0 24 24
 * - Converts fills/strokes to currentColor (only for monochrome)
 * - Removes width/height attributes
 * - Sets float precision to 1
 */
function optimizeSvg(svgString: string, useCurrentColor: boolean = true, removeFillOpacity: boolean = false): string {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const plugins: any[] = [
    {
      name: "preset-default",
      params: {
        overrides: {
          removeViewBox: false,
          removeUselessStrokeAndFill: false,
        },
      },
    },
    // Remove width and height attributes (and optionally fill-opacity)
    {
      name: "removeAttrs",
      params: {
        attrs: removeFillOpacity 
          ? ["width", "height", "fill-opacity", "fillOpacity"] 
          : ["width", "height"],
      },
    },
    // Add/update viewBox to 24x24
    {
      name: "addAttributesToSVGElement",
      params: {
        attributes: [{ viewBox: "0 0 24 24" }],
      },
    },
  ]

  // Only convert to currentColor for monochrome SVGs
  if (useCurrentColor) {
    plugins.push(
      {
        name: "convertColors",
        params: {
          currentColor: true,
        },
      },
      // Custom plugin to ensure all fills and strokes use currentColor
      {
        name: "customColorReplace",
        fn: () => {
          return {
            element: {
              enter: (node: { attributes: Record<string, string> }) => {
                if (node.attributes.fill && node.attributes.fill !== "none") {
                  node.attributes.fill = "currentColor"
                }
                if (node.attributes.stroke && node.attributes.stroke !== "none") {
                  node.attributes.stroke = "currentColor"
                }
              },
            },
          }
        },
      }
    )
  }

  const result = optimize(svgString, {
    multipass: true,
    floatPrecision: 1,
    plugins,
  })

  return result.data
}

/**
 * Converts SVG attribute names to JSX-compatible camelCase
 * e.g., fill-opacity -> fillOpacity, stroke-width -> strokeWidth
 */
function svgToJsxAttributes(svgString: string): string {
  const attributeMap: Record<string, string> = {
    'fill-opacity': 'fillOpacity',
    'fill-rule': 'fillRule',
    'stroke-opacity': 'strokeOpacity',
    'stroke-width': 'strokeWidth',
    'stroke-linecap': 'strokeLinecap',
    'stroke-linejoin': 'strokeLinejoin',
    'stroke-dasharray': 'strokeDasharray',
    'stroke-dashoffset': 'strokeDashoffset',
    'stroke-miterlimit': 'strokeMiterlimit',
    'clip-path': 'clipPath',
    'clip-rule': 'clipRule',
    'font-family': 'fontFamily',
    'font-size': 'fontSize',
    'font-style': 'fontStyle',
    'font-weight': 'fontWeight',
    'text-anchor': 'textAnchor',
    'text-decoration': 'textDecoration',
    'dominant-baseline': 'dominantBaseline',
    'alignment-baseline': 'alignmentBaseline',
    'baseline-shift': 'baselineShift',
    'stop-color': 'stopColor',
    'stop-opacity': 'stopOpacity',
    'flood-color': 'floodColor',
    'flood-opacity': 'floodOpacity',
    'color-interpolation': 'colorInterpolation',
    'color-interpolation-filters': 'colorInterpolationFilters',
    'enable-background': 'enableBackground',
    'marker-start': 'markerStart',
    'marker-mid': 'markerMid',
    'marker-end': 'markerEnd',
    'paint-order': 'paintOrder',
    'shape-rendering': 'shapeRendering',
    'vector-effect': 'vectorEffect',
    'pointer-events': 'pointerEvents',
    'xlink:href': 'xlinkHref',
    'xmlns:xlink': 'xmlnsXlink',
  }
  
  let result = svgString
  
  // Replace each SVG attribute with its JSX equivalent
  for (const [svgAttr, jsxAttr] of Object.entries(attributeMap)) {
    // Match attribute="value" pattern
    const regex = new RegExp(`\\b${svgAttr}=`, 'g')
    result = result.replace(regex, `${jsxAttr}=`)
  }
  
  return result
}

/**
 * Generates a React TSX component from optimized SVG
 * Uses simplified syntax for maximum compatibility with AI platforms like Base44
 */
function generateReactComponent(svgContent: string, componentName: string, isMonochrome: boolean = true): string {
  // Extract the inner content of the SVG (everything between <svg> and </svg>)
  const svgInnerMatch = svgContent.match(/<svg[^>]*>([\s\S]*)<\/svg>/i)
  let innerContent = svgInnerMatch ? svgInnerMatch[1].trim() : ""
  
  // Convert SVG attributes to JSX-compatible camelCase
  innerContent = svgToJsxAttributes(innerContent)

  // Extract viewBox from the original SVG
  const viewBoxMatch = svgContent.match(/viewBox="([^"]*)"/)
  const viewBox = viewBoxMatch ? viewBoxMatch[1] : "0 0 24 24"

  // For monochrome, use fill="currentColor", for multi-color, don't override fills
  const fillProp = isMonochrome ? '\n      fill="currentColor"' : ''

  // Simplified component syntax for better compatibility
  const component = `import React from "react"

export default function ${componentName}({ size = 24, className, ...props }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="${viewBox}"
      width={size}
      height={size}${fillProp}
      className={className}
      {...props}
    >
      ${innerContent}
    </svg>
  )
}
`

  return component
}

/**
 * Uploads SVG to Supabase Storage and returns public URL
 */
async function uploadToSupabase(
  svgContent: string,
  fileName: string
): Promise<string | null> {
  // Check if Supabase is configured
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    console.log("Supabase not configured, skipping upload")
    return null
  }

  try {
    const supabase = await createClient()

    const { data, error } = await supabase.storage
      .from("assets")
      .upload(`svgs/${fileName}`, svgContent, {
        contentType: "image/svg+xml",
        upsert: true,
      })

    if (error) {
      console.error("Supabase upload error:", error)
      return null
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("assets").getPublicUrl(data.path)

    return publicUrl
  } catch (error) {
    console.error("Upload to Supabase failed:", error)
    return null
  }
}

/**
 * Generates a valid component name from filename
 * - Limits to max 25 characters for readability
 * - Falls back to "CustomIcon" + timestamp if name is problematic
 */
function generateComponentName(filename: string, customName?: string): string {
  const MAX_LENGTH = 25
  
  // Use custom name if provided
  if (customName && customName.trim()) {
    const sanitized = customName
      .trim()
      .replace(/[^a-zA-Z0-9]/g, "")
    
    if (sanitized.length > 0) {
      // Ensure it starts with uppercase letter
      const pascalCase = sanitized.charAt(0).toUpperCase() + sanitized.slice(1)
      return pascalCase.slice(0, MAX_LENGTH)
    }
  }
  
  // Remove extension and invalid characters
  const baseName = filename
    .replace(/\.[^.]+$/, "") // Remove extension
    .replace(/[^a-zA-Z0-9]/g, " ") // Replace invalid chars with space
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join("")

  // Ensure it starts with a letter
  let safeName = baseName.match(/^[A-Z]/) ? baseName : `Icon${baseName}`
  
  // Truncate if too long
  if (safeName.length > MAX_LENGTH) {
    safeName = safeName.slice(0, MAX_LENGTH)
  }

  return safeName || "CustomIcon"
}

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  try {
    console.log("[API] ========== Starting file processing ==========")
    console.log(`[API] Environment: ${process.env.VERCEL ? 'Vercel' : 'Local'}`)
    
    const formData = await request.formData()
    const file = formData.get("file") as File | null
    const shouldRemoveBackground = formData.get("removeBackground") === "true"
    const colorCount = parseInt(formData.get("colorCount") as string) || 1
    const customColorsRaw = formData.get("customColors") as string
    const autoDetectColors = formData.get("autoDetectColors") === "true"
    const customComponentName = formData.get("componentName") as string | null
    
    console.log(`[API] ⏱️  Elapsed: ${Date.now() - startTime}ms - Form data parsed`)
    
    let customColors: string[] = ["currentColor"]
    
    try {
      customColors = JSON.parse(customColorsRaw || '["currentColor"]')
    } catch {
      console.log("[API] Failed to parse custom colors, using default")
    }

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    const fileName = file.name
    const fileType = file.type
    const componentName = generateComponentName(fileName, customComponentName || undefined)
    
    console.log(`[API] Processing: ${fileName} (${fileType}), colors: ${colorCount}, autoDetect: ${autoDetectColors}`)

    // Read file as buffer
    const arrayBuffer = await file.arrayBuffer()
    let buffer = Buffer.from(arrayBuffer)
    console.log(`[API] File buffer size: ${buffer.length} bytes`)

    let svgString: string
    // True monochrome only if: 1 color AND no auto-detect AND no background removal
    const isMonochrome = colorCount === 1 && !autoDetectColors && !shouldRemoveBackground
    let detectedColors: string[] = []

    // Step 1: Handle different file types
    if (fileType === "image/svg+xml" || fileName.toLowerCase().endsWith(".svg")) {
      console.log("[API] Processing as SVG...")
      svgString = buffer.toString("utf-8")
    } else if (
      fileType === "image/png" ||
      fileType === "image/jpeg" ||
      fileType === "image/jpg"
    ) {
      console.log("[API] Processing as raster image...")

      // Step 2: Background removal (if requested) - DO THIS FIRST!
      if (shouldRemoveBackground) {
        console.log(`[API] ⏱️  Elapsed: ${Date.now() - startTime}ms - Starting background removal...`)
        buffer = await removeBackgroundFromImage(buffer)
        console.log(`[API] ⏱️  Elapsed: ${Date.now() - startTime}ms - Background removal complete`)
      }
      
      // Step 2b: Extract colors AFTER background removal for accurate colors
      // Extract colors if:
      // - auto-detect is enabled, OR
      // - multi-color mode with default colors
      const shouldExtractColors = autoDetectColors || 
        (!isMonochrome && (customColors[0] === "currentColor" || customColors.length === 0))
      
      if (shouldExtractColors) {
        console.log("[API] Auto-detecting colors from image (after bg removal)...")
        // No need to sample from center anymore since background is already removed
        detectedColors = await extractDominantColors(buffer, colorCount, false)
        
        if (detectedColors.length > 0) {
          customColors = detectedColors.slice(0, colorCount)
        }
      }

      // Step 3: Resize and convert to PNG with sharp
      // Resize large images to max 512px for faster processing
      console.log("[API] Converting with sharp...")
      const metadata = await sharp(buffer).metadata()
      const maxDimension = 1024  // Increased for better detail quality
      
      let sharpInstance = sharp(buffer)
      
      if (metadata.width && metadata.height) {
        const maxSide = Math.max(metadata.width, metadata.height)
        if (maxSide > maxDimension) {
          console.log(`[API] Resizing from ${metadata.width}x${metadata.height} to max ${maxDimension}px`)
          sharpInstance = sharpInstance.resize(maxDimension, maxDimension, {
            fit: 'inside',
            withoutEnlargement: true
          })
        }
      }
      
      const processedBuffer = await sharpInstance
        .png()
        .toBuffer()
      console.log(`[API] Sharp processed: ${processedBuffer.length} bytes`)

      // Step 4: Vectorize using potrace
      if (isMonochrome) {
        console.log(`[API] ⏱️  Elapsed: ${Date.now() - startTime}ms - Tracing with potrace (monochrome)...`)
        svgString = await traceToSvg(processedBuffer)
      } else {
        console.log(`[API] ⏱️  Elapsed: ${Date.now() - startTime}ms - Posterizing with potrace (${colorCount} colors)...`)
        svgString = await posterizeToSvg(processedBuffer, colorCount)
      }
      console.log(`[API] ⏱️  Elapsed: ${Date.now() - startTime}ms - Potrace completed`)
    } else {
      return NextResponse.json(
        { error: `Unsupported file type: ${fileType}. Please upload PNG, JPG, or SVG.` },
        { status: 400 }
      )
    }

    // Step 5: Optimize SVG
    console.log("[API] Optimizing SVG...")
    // Use currentColor only when: 1 color AND no auto-detect AND no background removal
    const useCurrentColor = colorCount === 1 && !autoDetectColors && !shouldRemoveBackground
    // Remove fill-opacity to get solid colors
    const removeFillOpacity = colorCount > 1 || (colorCount === 1 && shouldRemoveBackground)
    let optimizedSvg = optimizeSvg(svgString, useCurrentColor, removeFillOpacity)
    
    // Step 5a: Remove background path if background removal was requested
    if (shouldRemoveBackground) {
      optimizedSvg = removeBackgroundPath(optimizedSvg)
    }
    
    // Step 5b: Apply custom/detected colors (if not using currentColor)
    if (!useCurrentColor && customColors.length > 0 && customColors[0] !== "currentColor") {
      console.log(`[API] Applying custom colors: ${customColors.join(", ")}`)
      optimizedSvg = applyCustomColors(optimizedSvg, customColors)
    }

    // Step 6: Generate React component
    console.log("[API] Generating React component...")
    const reactComponent = generateReactComponent(optimizedSvg, componentName, useCurrentColor)

    // Step 7: Upload to Supabase (optional)
    const timestamp = Date.now()
    const svgFileName = `${componentName.toLowerCase()}-${timestamp}.svg`
    const publicUrl = await uploadToSupabase(optimizedSvg, svgFileName)

    const totalTime = Date.now() - startTime
    console.log(`[API] ✅ Processing complete! Total time: ${totalTime}ms`)
    
    if (totalTime > 8000) {
      console.warn(`[API] ⚠️  WARNING: Processing took ${totalTime}ms - close to Vercel timeout (10s)`)
    }
    
    return NextResponse.json({
      success: true,
      data: {
        componentName,
        optimizedSvg,
        reactComponent,
        publicUrl,
        originalFileName: fileName,
        detectedColors: useCurrentColor ? [] : customColors,
      },
    })
  } catch (error) {
    const totalTime = Date.now() - startTime
    console.error(`[API] ❌ Processing error after ${totalTime}ms:`, error)
    return NextResponse.json(
      {
        error: "Failed to process file",
        details: error instanceof Error ? error.message : "Unknown error",
        processingTime: `${totalTime}ms`,
      },
      { status: 500 }
    )
  }
}
