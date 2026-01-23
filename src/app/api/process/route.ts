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

// Output mode types
type OutputMode = "icon" | "logo"

/**
 * Configuration for each output mode
 */
const MODE_CONFIG = {
  icon: {
    colorCount: 1,
    useCurrentColor: true,
    viewBox: "0 0 24 24",
    description: "Standard Icon - single color, themeable"
  },
  logo: {
    colorCount: 6,
    useCurrentColor: false,
    viewBox: "preserve", // Will preserve original aspect ratio
    description: "Brand Logo - original colors, auto-optimized"
  }
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
        : ['#3B82F6', '#8B5CF6', '#06B6D4', '#10B981', '#F59E0B', '#EF4444'].slice(0, colorCount)
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
      : ['#3B82F6', '#8B5CF6', '#06B6D4', '#10B981', '#F59E0B', '#EF4444'].slice(0, colorCount)
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

  console.log(`[API] 🔍 Checking remove.bg API key... ${apiKey ? '✅ FOUND' : '❌ NOT FOUND'}`)

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
        turdSize: 4,
        optTolerance: 0.1,
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
        turdSize: 4,
        optTolerance: 0.1,
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
 */
function removeBackgroundPath(svgString: string): string {
  console.log("[API] Removing background path from SVG...")
  
  const viewBoxMatch = svgString.match(/viewBox="(\d+)\s+(\d+)\s+(\d+)\s+(\d+)"/)
  const vbWidth = viewBoxMatch ? parseInt(viewBoxMatch[3]) : 0
  const vbHeight = viewBoxMatch ? parseInt(viewBoxMatch[4]) : 0
  
  let removedCount = 0
  let keptCount = 0
  
  const result = svgString.replace(/<path\s+([^>]*?)(?:\/?>|>[\s\S]*?<\/path>)/gi, (match, attrs) => {
    const dMatch = attrs.match(/d="([^"]*)"/)
    if (dMatch) {
      const d = dMatch[1]
      
      const startsAtOrigin = /^M\s*0\s+/.test(d) || /^M\s*0\s*,/.test(d)
      const containsFullWidth = d.includes(`${vbWidth}`) || d.includes(`${vbWidth - 1}`)
      const containsFullHeight = d.includes(`${vbHeight}`) || d.includes(`${vbHeight - 1}`)
      const isLikelyBackground = startsAtOrigin && containsFullWidth && containsFullHeight
      
      const isFullRect = /^M\s*0\s+[\d.]+V[\d.]+/.test(d) && containsFullWidth
      
      if (isLikelyBackground || isFullRect) {
        console.log("[API] Removed background path (covers full viewBox)")
        removedCount++
        return ''
      }
    }
    
    keptCount++
    return match
  })
  
  console.log(`[API] Removed ${removedCount} background paths, kept ${keptCount} foreground paths`)
  return removedCount === 0 ? svgString : result
}

/**
 * Replaces colors in SVG with custom brand colors
 * Maps colors by brightness: dark potrace colors → dark custom colors
 */
function applyCustomColors(svgString: string, customColors: string[]): string {
  console.log("[API] Applying brand colors to SVG...")
  console.log("[API] Colors to apply:", customColors.join(", "))
  
  let result = svgString
  let replacedCount = 0
  let preservedCount = 0
  
  // Replace fills in path elements
  result = result.replace(/<path\s+([^>]*?)(\/?>)/gi, (match, attrs, ending) => {
    const fillMatch = attrs.match(/fill\s*=\s*["']([^"']*)["']/i)
    
    if (fillMatch) {
      const existingColor = fillMatch[1]
      const brightness = getColorBrightness(existingColor)
      
      // Preserve very bright (white) or very dark (black) colors - likely text
      if (brightness > 220 || brightness < 20) {
        console.log(`[API] Preserving: ${existingColor} (brightness: ${brightness})`)
        preservedCount++
        return match
      }
      
      // Map grayscale brightness to custom color
      const colorIndex = Math.floor((brightness / 255) * customColors.length)
      const mappedIndex = Math.min(colorIndex, customColors.length - 1)
      const newColor = customColors[mappedIndex]
      
      const cleanAttrs = attrs.replace(/\s*fill\s*=\s*["'][^"']*["']/gi, '')
      console.log(`[API] Mapping: ${existingColor} → ${newColor}`)
      replacedCount++
      return `<path ${cleanAttrs} fill="${newColor}"${ending}`
    }
    
    const cleanAttrs = attrs.replace(/\s*fill\s*=\s*["'][^"']*["']/gi, '')
    replacedCount++
    return `<path ${cleanAttrs} fill="${customColors[0]}"${ending}`
  })
  
  // Also handle rect, circle, polygon, ellipse
  const shapes = ['rect', 'circle', 'polygon', 'ellipse']
  for (const shape of shapes) {
    const regex = new RegExp(`<${shape}\\s+([^>]*?)(\\/?>)`, 'gi')
    result = result.replace(regex, (match, attrs, ending) => {
      const fillMatch = attrs.match(/fill\s*=\s*["']([^"']*)["']/i)
      
      if (fillMatch) {
        const existingColor = fillMatch[1]
        const brightness = getColorBrightness(existingColor)
        
        if (brightness > 220 || brightness < 20) {
          preservedCount++
          return match
        }
        
        const colorIndex = Math.floor((brightness / 255) * customColors.length)
        const mappedIndex = Math.min(colorIndex, customColors.length - 1)
        const newColor = customColors[mappedIndex]
        
        const cleanAttrs = attrs.replace(/\s*fill\s*=\s*["'][^"']*["']/gi, '')
        replacedCount++
        return `<${shape} ${cleanAttrs} fill="${newColor}"${ending}`
      }
      
      const cleanAttrs = attrs.replace(/\s*fill\s*=\s*["'][^"']*["']/gi, '')
      replacedCount++
      return `<${shape} ${cleanAttrs} fill="${customColors[0]}"${ending}`
    })
  }
  
  console.log(`[API] ✅ Applied ${replacedCount} colors, preserved ${preservedCount} text elements`)
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
  
  return (r * 299 + g * 587 + b * 114) / 1000
}

/**
 * Optimizes SVG string with SVGO
 * For Icon mode: forces 24x24 viewBox and currentColor
 * For Logo mode: preserves aspect ratio and colors
 */
function optimizeSvg(
  svgString: string, 
  mode: OutputMode,
  originalWidth?: number,
  originalHeight?: number
): string {
  const config = MODE_CONFIG[mode]
  
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
    // Remove width and height attributes
    {
      name: "removeAttrs",
      params: {
        attrs: mode === "logo" 
          ? ["width", "height", "fill-opacity", "fillOpacity"]
          : ["width", "height"],
      },
    },
  ]

  // Set viewBox based on mode
  if (mode === "icon") {
    // Icon mode: force 24x24 viewBox
    plugins.push({
      name: "addAttributesToSVGElement",
      params: {
        attributes: [{ viewBox: "0 0 24 24" }],
      },
    })
  } else if (mode === "logo" && originalWidth && originalHeight) {
    // Logo mode: preserve aspect ratio with reasonable dimensions
    const maxDim = 100
    const scale = maxDim / Math.max(originalWidth, originalHeight)
    const scaledWidth = Math.round(originalWidth * scale)
    const scaledHeight = Math.round(originalHeight * scale)
    plugins.push({
      name: "addAttributesToSVGElement",
      params: {
        attributes: [{ viewBox: `0 0 ${scaledWidth} ${scaledHeight}` }],
      },
    })
  }

  // Only convert to currentColor for Icon mode
  if (config.useCurrentColor) {
    plugins.push(
      {
        name: "convertColors",
        params: {
          currentColor: true,
        },
      },
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
  
  for (const [svgAttr, jsxAttr] of Object.entries(attributeMap)) {
    const regex = new RegExp(`\\b${svgAttr}=`, 'g')
    result = result.replace(regex, `${jsxAttr}=`)
  }
  
  return result
}

/**
 * Generates a React TSX component from optimized SVG
 */
function generateReactComponent(svgContent: string, componentName: string, mode: OutputMode): string {
  const svgInnerMatch = svgContent.match(/<svg[^>]*>([\s\S]*)<\/svg>/i)
  let innerContent = svgInnerMatch ? svgInnerMatch[1].trim() : ""
  
  innerContent = svgToJsxAttributes(innerContent)

  const viewBoxMatch = svgContent.match(/viewBox="([^"]*)"/)
  const viewBox = viewBoxMatch ? viewBoxMatch[1] : "0 0 24 24"

  // For icon mode, use fill="currentColor", for logo mode, don't override
  const fillProp = mode === "icon" ? '\n      fill="currentColor"' : ''

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
 */
function generateComponentName(filename: string, customName?: string, mode?: OutputMode): string {
  const MAX_LENGTH = 25
  const suffix = mode === "icon" ? "Icon" : "Logo"
  
  if (customName && customName.trim()) {
    const sanitized = customName
      .trim()
      .replace(/[^a-zA-Z0-9]/g, "")
    
    if (sanitized.length > 0) {
      const pascalCase = sanitized.charAt(0).toUpperCase() + sanitized.slice(1)
      return pascalCase.slice(0, MAX_LENGTH)
    }
  }
  
  const baseName = filename
    .replace(/\.[^.]+$/, "")
    .replace(/[^a-zA-Z0-9]/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join("")

  let safeName = baseName.match(/^[A-Z]/) ? baseName : `${suffix}${baseName}`
  
  if (safeName.length > MAX_LENGTH) {
    safeName = safeName.slice(0, MAX_LENGTH)
  }

  return safeName || `Custom${suffix}`
}

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  try {
    console.log("[API] ========== Starting file processing ==========")
    console.log(`[API] Environment: ${process.env.VERCEL ? 'Vercel' : 'Local'}`)
    
    const formData = await request.formData()
    const file = formData.get("file") as File | null
    const mode = (formData.get("mode") as OutputMode) || "icon"
    const shouldRemoveBackground = formData.get("removeBackground") === "true"
    const customComponentName = formData.get("componentName") as string | null
    
    // Get mode configuration
    const modeConfig = MODE_CONFIG[mode]
    const colorCount = modeConfig.colorCount
    
    console.log(`[API] Mode: ${mode} (${modeConfig.description})`)
    console.log(`[API] Remove background: ${shouldRemoveBackground}`)
    console.log(`[API] Color count: ${colorCount}`)

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    const fileName = file.name
    const fileType = file.type
    const componentName = generateComponentName(fileName, customComponentName || undefined, mode)
    
    console.log(`[API] Processing: ${fileName} (${fileType})`)

    // Read file as buffer
    const arrayBuffer = await file.arrayBuffer()
    let buffer = Buffer.from(arrayBuffer)
    console.log(`[API] File buffer size: ${buffer.length} bytes`)

    let svgString: string
    let detectedColors: string[] = []
    let originalWidth: number | undefined
    let originalHeight: number | undefined

    // Step 1: Handle different file types
    if (fileType === "image/svg+xml" || fileName.toLowerCase().endsWith(".svg")) {
      console.log("[API] Processing as SVG...")
      svgString = buffer.toString("utf-8")
      
      // Extract original dimensions from SVG for logo mode
      const widthMatch = svgString.match(/width="(\d+)"/)
      const heightMatch = svgString.match(/height="(\d+)"/)
      const vbMatch = svgString.match(/viewBox="[\d.]+ [\d.]+ ([\d.]+) ([\d.]+)"/)
      
      if (widthMatch && heightMatch) {
        originalWidth = parseInt(widthMatch[1])
        originalHeight = parseInt(heightMatch[1])
      } else if (vbMatch) {
        originalWidth = parseFloat(vbMatch[1])
        originalHeight = parseFloat(vbMatch[2])
      }
    } else if (
      fileType === "image/png" ||
      fileType === "image/jpeg" ||
      fileType === "image/jpg"
    ) {
      console.log("[API] Processing as raster image...")

      // Get original dimensions for logo mode
      const metadata = await sharp(buffer).metadata()
      originalWidth = metadata.width
      originalHeight = metadata.height

      // Step 2: Background removal (if requested)
      if (shouldRemoveBackground) {
        console.log(`[API] ⏱️ ${Date.now() - startTime}ms - Starting background removal...`)
        buffer = await removeBackgroundFromImage(buffer)
        console.log(`[API] ⏱️ ${Date.now() - startTime}ms - Background removal complete`)
      }
      
      // Step 3: Extract colors for logo mode (after background removal)
      if (mode === "logo") {
        console.log("[API] Detecting brand colors...")
        detectedColors = await extractDominantColors(buffer, colorCount, false)
        console.log(`[API] Detected ${detectedColors.length} colors: ${detectedColors.join(", ")}`)
      }

      // Step 4: Resize for processing
      console.log("[API] Resizing image for vectorization...")
      const maxDimension = 1024
      
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
      
      const processedBuffer = await sharpInstance.png().toBuffer()

      // Step 5: Vectorize using potrace
      if (mode === "icon") {
        console.log(`[API] ⏱️ ${Date.now() - startTime}ms - Tracing (icon mode)...`)
        svgString = await traceToSvg(processedBuffer)
      } else {
        console.log(`[API] ⏱️ ${Date.now() - startTime}ms - Posterizing (logo mode, ${colorCount} colors)...`)
        svgString = await posterizeToSvg(processedBuffer, colorCount)
      }
      console.log(`[API] ⏱️ ${Date.now() - startTime}ms - Vectorization complete`)
    } else {
      return NextResponse.json(
        { error: `Unsupported file type: ${fileType}. Please upload PNG, JPG, or SVG.` },
        { status: 400 }
      )
    }

    // Step 6: Optimize SVG
    console.log("[API] Optimizing SVG...")
    let optimizedSvg = optimizeSvg(svgString, mode, originalWidth, originalHeight)
    
    // Step 7: Remove background path if background removal was requested
    if (shouldRemoveBackground) {
      optimizedSvg = removeBackgroundPath(optimizedSvg)
    }
    
    // Step 8: Apply brand colors for logo mode
    if (mode === "logo" && detectedColors.length > 0) {
      console.log(`[API] Applying brand colors: ${detectedColors.join(", ")}`)
      optimizedSvg = applyCustomColors(optimizedSvg, detectedColors)
    }

    // Step 9: Generate React component
    console.log("[API] Generating React component...")
    const reactComponent = generateReactComponent(optimizedSvg, componentName, mode)

    // Step 10: Upload to Supabase (optional)
    const timestamp = Date.now()
    const svgFileName = `${componentName.toLowerCase()}-${timestamp}.svg`
    const publicUrl = await uploadToSupabase(optimizedSvg, svgFileName)

    const totalTime = Date.now() - startTime
    console.log(`[API] ✅ Processing complete! Total time: ${totalTime}ms`)
    
    if (totalTime > 8000) {
      console.warn(`[API] ⚠️ WARNING: Processing took ${totalTime}ms - close to Vercel timeout`)
    }
    
    return NextResponse.json({
      success: true,
      data: {
        componentName,
        optimizedSvg,
        reactComponent,
        publicUrl,
        originalFileName: fileName,
        detectedColors: mode === "logo" ? detectedColors : [],
        mode,
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
