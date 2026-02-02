import { NextRequest, NextResponse } from "next/server"
import sharp from "sharp"
import potrace from "potrace"
import { optimize } from "svgo"
import { createClient } from "@/lib/supabase/server"
import crypto from "crypto"
import fs from "fs"
import path from "path"

// Cache directory for remove.bg results (persists across dev restarts)
const CACHE_DIR = path.join(process.cwd(), ".cache", "rmbg")

// Rate limiting storage (in-memory)
const rateLimitStore = new Map<string, { count: number; date: string }>()
const MAX_REQUESTS_PER_DAY = 5

// Admin emails - exempt from rate limiting
const ADMIN_EMAILS = ["tzipi.walles@gmail.com"]

// Get client IP address
function getClientIP(request: NextRequest): string {
  // Try various headers that might contain the real IP
  const forwarded = request.headers.get("x-forwarded-for")
  const realIP = request.headers.get("x-real-ip")
  const cfConnectingIP = request.headers.get("cf-connecting-ip")
  
  if (forwarded) {
    return forwarded.split(",")[0].trim()
  }
  if (realIP) {
    return realIP
  }
  if (cfConnectingIP) {
    return cfConnectingIP
  }
  
  return "unknown"
}

// Check rate limit
function checkRateLimit(ip: string): { allowed: boolean; remaining: number } {
  const today = new Date().toDateString()
  const record = rateLimitStore.get(ip)
  
  // If no record or it's a new day, reset
  if (!record || record.date !== today) {
    rateLimitStore.set(ip, { count: 0, date: today })
    return { allowed: true, remaining: MAX_REQUESTS_PER_DAY }
  }
  
  // Check if limit exceeded
  if (record.count >= MAX_REQUESTS_PER_DAY) {
    return { allowed: false, remaining: 0 }
  }
  
  return { allowed: true, remaining: MAX_REQUESTS_PER_DAY - record.count }
}

// Increment request count
function incrementRateLimit(ip: string): void {
  const today = new Date().toDateString()
  const record = rateLimitStore.get(ip)
  
  if (record && record.date === today) {
    record.count++
  } else {
    rateLimitStore.set(ip, { count: 1, date: today })
  }
}

// Ensure cache directory exists
function ensureCacheDir() {
  if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true })
  }
}

// Generate hash for image buffer
function getImageHash(buffer: Buffer): string {
  return crypto.createHash("md5").update(buffer).digest("hex")
}

// Get cached result if exists
function getCachedResult(hash: string): Buffer | null {
  try {
    const cachePath = path.join(CACHE_DIR, `${hash}.png`)
    if (fs.existsSync(cachePath)) {
      console.log(`[CACHE] ✅ Hit! Using cached result for ${hash.slice(0, 8)}...`)
      return fs.readFileSync(cachePath)
    }
  } catch (error) {
    console.error("[CACHE] Error reading cache:", error)
  }
  return null
}

// Save result to cache
function saveToCache(hash: string, buffer: Buffer): void {
  try {
    ensureCacheDir()
    const cachePath = path.join(CACHE_DIR, `${hash}.png`)
    fs.writeFileSync(cachePath, buffer)
    console.log(`[CACHE] 💾 Saved result to cache: ${hash.slice(0, 8)}...`)
  } catch (error) {
    console.error("[CACHE] Error saving to cache:", error)
  }
}

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
type OutputMode = "icon" | "logo" | "image"

/**
 * Configuration for each output mode
 */
const MODE_CONFIG: Record<OutputMode, { colorCount: number; useCurrentColor: boolean; viewBox: string; description: string }> = {
  icon: {
    colorCount: 1,
    useCurrentColor: true,
    viewBox: "0 0 24 24",
    description: "Standard Icon - single color, themeable"
  },
  logo: {
    colorCount: 4, // Max 4 for potrace performance (5+ is very slow)
    useCurrentColor: false,
    viewBox: "preserve", // Will preserve original aspect ratio
    description: "Brand Logo - original colors, auto-optimized"
  },
  image: {
    colorCount: 0, // No vectorization
    useCurrentColor: false,
    viewBox: "none",
    description: "Raw Image - no conversion, just upload"
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
    // Use ensureAlpha() to preserve transparency, and 'inside' fit to avoid adding background
    const { data, info } = await sharp(buffer)
      .ensureAlpha() // Always get RGBA so we can skip transparent pixels
      .resize(100, 100, { fit: 'inside', background: { r: 0, g: 0, b: 0, alpha: 0 } })
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
        
        // Note: We don't skip black pixels anymore - black is a valid logo color (e.g., Intel logo)
        
        // Skip near-gray pixels (low saturation, not distinctive)
        const maxChannel = Math.max(r, g, b)
        const minChannel = Math.min(r, g, b)
        const saturation = maxChannel > 0 ? (maxChannel - minChannel) / maxChannel : 0
        if (saturation < 0.15 && maxChannel > 50 && maxChannel < 200) continue // Skip grayish pixels
        
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
  if (pixels.length === 0) return []
  if (pixels.length <= k) return pixels
  
  // K-means++ initialization: select diverse starting points
  const centers: { r: number; g: number; b: number }[] = []
  
  // First center: random pixel
  centers.push({ ...pixels[Math.floor(Math.random() * pixels.length)] })
  
  // Remaining centers: select pixels far from existing centers
  while (centers.length < k) {
    const distances: number[] = []
    let totalDist = 0
    
    for (const pixel of pixels) {
      // Find minimum distance to any existing center
      let minDist = Infinity
      for (const center of centers) {
        const dist = colorDistance(pixel, center)
        if (dist < minDist) minDist = dist
      }
      distances.push(minDist * minDist) // Square for weighted probability
      totalDist += minDist * minDist
    }
    
    // Select next center with probability proportional to distance squared
    let threshold = Math.random() * totalDist
    for (let i = 0; i < pixels.length; i++) {
      threshold -= distances[i]
      if (threshold <= 0) {
        centers.push({ ...pixels[i] })
        break
      }
    }
    
    // Fallback if no center was added
    if (centers.length < k && distances.length > 0) {
      const maxDistIdx = distances.indexOf(Math.max(...distances))
      centers.push({ ...pixels[maxDistIdx] })
    }
  }
  
  // Run k-means iterations (more iterations for better convergence)
  for (let iter = 0; iter < 20; iter++) {
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
  
  // Sort centers by saturation/vibrancy (most saturated first)
  centers.sort((a, b) => {
    const satA = Math.max(a.r, a.g, a.b) - Math.min(a.r, a.g, a.b)
    const satB = Math.max(b.r, b.g, b.b) - Math.min(b.r, b.g, b.b)
    return satB - satA
  })
  
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
 * Detects the dominant background color by sampling pixels from the entire image
 * Background is assumed to be the most common color
 */
async function detectBackgroundColor(buffer: Buffer): Promise<{ r: number; g: number; b: number }> {
  const { data, info } = await sharp(buffer)
    .raw()
    .toBuffer({ resolveWithObject: true })

  const { width, height, channels } = info
  
  // Sample every Nth pixel to build a histogram (faster than all pixels)
  const sampleStep = Math.max(1, Math.floor(Math.sqrt(width * height) / 50)) // ~2500 samples
  const colorCounts = new Map<string, { color: { r: number; g: number; b: number }; count: number }>()
  
  for (let y = 0; y < height; y += sampleStep) {
    for (let x = 0; x < width; x += sampleStep) {
      const idx = (y * width + x) * channels
      const r = data[idx]
      const g = data[idx + 1]
      const b = data[idx + 2]
      
      // Round to buckets of 20 to group similar colors
      const key = `${Math.round(r / 20) * 20},${Math.round(g / 20) * 20},${Math.round(b / 20) * 20}`
      const existing = colorCounts.get(key)
      if (existing) {
        existing.count++
      } else {
        colorCounts.set(key, { color: { r, g, b }, count: 1 })
      }
    }
  }

  // Find the most common color (likely the background)
  let maxCount = 0
  let bgColor = { r: 255, g: 255, b: 255 } // default white
  
  const colorEntries = Array.from(colorCounts.values())
  for (const { color, count } of colorEntries) {
    if (count > maxCount) {
      maxCount = count
      bgColor = color
    }
  }

  const totalSamples = colorEntries.reduce((sum, entry) => sum + entry.count, 0)
  const percentage = ((maxCount / totalSamples) * 100).toFixed(1)
  console.log(`[API] Detected background color: RGB(${bgColor.r}, ${bgColor.g}, ${bgColor.b}) - ${percentage}% of image`)
  return bgColor
}

/**
 * Removes background using remove.bg API (for Logo mode)
 * Uses file-based caching to save API credits during development
 */
async function removeBackgroundWithRemoveBg(buffer: Buffer): Promise<Buffer<ArrayBuffer> | null> {
  const apiKey = process.env.REMOVE_BG_API_KEY
  
  if (!apiKey) {
    console.log("[API] ⚠️ No REMOVE_BG_API_KEY found")
    return null
  }

  // Check cache first
  const imageHash = getImageHash(buffer)
  const cached = getCachedResult(imageHash)
  if (cached) {
    return cached as Buffer<ArrayBuffer>
  }

  // Call remove.bg API
  try {
    console.log("[API] 🚀 Calling remove.bg API...")
    
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
      return null
    }

    const arrayBuffer = await response.arrayBuffer()
    const resultBuffer = Buffer.from(arrayBuffer) as Buffer<ArrayBuffer>
    console.log(`[API] ✅ remove.bg SUCCESS! Output: ${resultBuffer.length} bytes`)
    
    // Save to cache for future use
    saveToCache(imageHash, resultBuffer)
    
    return resultBuffer
  } catch (error) {
    console.error("[API] ❌ remove.bg API call failed:", error)
    return null
  }
}

/**
 * Removes background using local algorithm (for Icon mode, or fallback)
 */
async function removeBackgroundLocal(buffer: Buffer): Promise<Buffer<ArrayBuffer>> {
  console.log("[API] 🔧 Using local background removal...")
  
  try {
    // Detect background color from entire image
    const bgColor = await detectBackgroundColor(buffer)
    console.log(`[API] Detected BG color: RGB(${bgColor.r}, ${bgColor.g}, ${bgColor.b})`)
    
    // Color distance threshold (0-441, where 441 = max distance in RGB space)
    const threshold = 80
    
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
      
      // Calculate Euclidean color distance
      const colorDist = Math.sqrt(
        Math.pow(r - bgColor.r, 2) +
        Math.pow(g - bgColor.g, 2) +
        Math.pow(b - bgColor.b, 2)
      )
      
      if (colorDist <= threshold) {
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
 * Removes background from image
 * - Logo mode: Uses remove.bg API (with caching) for best quality
 * - Icon mode: Uses local algorithm (sufficient for silhouette conversion)
 */
async function removeBackgroundFromImage(buffer: Buffer, mode: OutputMode): Promise<Buffer<ArrayBuffer>> {
  if (mode === "logo") {
    // Try remove.bg first (with caching)
    const removeBgResult = await removeBackgroundWithRemoveBg(buffer)
    if (removeBgResult) {
      return removeBgResult
    }
    console.log("[API] ⚠️ Falling back to local removal for logo...")
  }
  
  // Use local removal for icon mode, or as fallback for logo
  return removeBackgroundLocal(buffer)
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
        turdSize: 2,       // Lower = more detail preserved
        optTolerance: 0.2, // Slightly smoother curves
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
 * Creates a color mask - pixels matching the target color become white, others black
 */
async function createColorMask(
  buffer: Buffer, 
  targetColor: { r: number; g: number; b: number },
  tolerance: number = 50
): Promise<Buffer> {
  const { data, info } = await sharp(buffer)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })

  const { width, height } = info
  const channels = 4 // RGBA
  
  // Create grayscale mask buffer
  const maskData = Buffer.alloc(width * height)
  
  for (let i = 0; i < data.length; i += channels) {
    const r = data[i]
    const g = data[i + 1]
    const b = data[i + 2]
    const a = data[i + 3]
    
    // Check if pixel matches target color within tolerance
    const diffR = Math.abs(r - targetColor.r)
    const diffG = Math.abs(g - targetColor.g)
    const diffB = Math.abs(b - targetColor.b)
    
    const pixelIndex = i / channels
    
    // If transparent or matches color, mark as white (foreground)
    if (a < 128) {
      maskData[pixelIndex] = 0 // Transparent = black (background)
    } else if (diffR <= tolerance && diffG <= tolerance && diffB <= tolerance) {
      maskData[pixelIndex] = 255 // Match = white (foreground)
    } else {
      maskData[pixelIndex] = 0 // No match = black (background)
    }
  }

  // Debug: count how many pixels matched
  const matchCount = maskData.filter(v => v === 255).length
  const totalPixels = width * height
  const matchPercent = ((matchCount / totalPixels) * 100).toFixed(1)
  console.log(`[API] Mask for RGB(${targetColor.r},${targetColor.g},${targetColor.b}): ${matchCount}/${totalPixels} pixels (${matchPercent}%)`)

  // IMPORTANT: Potrace traces DARK pixels on light background
  // Our mask has white=foreground, black=background
  // We need to INVERT it so potrace traces the logo, not the background
  const invertedMask = Buffer.alloc(maskData.length)
  for (let i = 0; i < maskData.length; i++) {
    invertedMask[i] = 255 - maskData[i]
  }

  // Convert to PNG (with inverted mask)
  return sharp(invertedMask, {
    raw: { width, height, channels: 1 }
  }).png().toBuffer()
}

/**
 * Traces a single color mask with potrace and returns SVG path
 */
async function traceMaskToPath(maskBuffer: Buffer, color: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const params: PotraceParams = {
      threshold: 128,
      color: color,
      background: "transparent",
      turdSize: 2,
      optTolerance: 0.2,
    }

    potrace.trace(maskBuffer, params, (err: Error | null, svg: string) => {
      if (err) {
        console.error("Potrace trace error:", err)
        reject(err)
        return
      }
      
      // Check if potrace added a background rect/path
      const hasRect = svg.includes('<rect')
      if (hasRect) {
        console.log(`[API] ⚠️ Potrace added <rect> background for color ${color}`)
      }
      
      // Extract just the path element(s) from the SVG (skip rect if exists)
      const pathMatches = svg.match(/<path[^>]*\/>/gi) || []
      console.log(`[API] Potrace generated ${pathMatches.length} paths for ${color}`)
      
      // Debug: show first path's d attribute length
      if (pathMatches.length > 0 && pathMatches[0]) {
        const dMatch = pathMatches[0].match(/d="([^"]*)"/)
        if (dMatch && dMatch[1]) {
          console.log(`[API] First path d length: ${dMatch[1].length} chars`)
        }
      }
      
      resolve(pathMatches.join('\n'))
    })
  })
}

/**
 * Converts a raster image to multi-color SVG using color-based segmentation
 * This creates separate masks for each detected color and traces them individually
 */
async function colorSegmentToSvg(
  buffer: Buffer, 
  detectedColors: string[]
): Promise<string> {
  console.log("[API] Using color-based segmentation for accurate colors...")
  
  // Get image dimensions
  const metadata = await sharp(buffer).metadata()
  const width = metadata.width || 100
  const height = metadata.height || 100
  
  // Convert hex colors to RGB
  const rgbColors = detectedColors.map(hex => {
    const r = parseInt(hex.slice(1, 3), 16)
    const g = parseInt(hex.slice(3, 5), 16)
    const b = parseInt(hex.slice(5, 7), 16)
    return { hex, r, g, b }
  })
  
  console.log(`[API] Processing ${rgbColors.length} color layers...`)
  
  // Create mask and trace for each color
  const pathsPromises = rgbColors.map(async (color, index) => {
    console.log(`[API] Layer ${index + 1}/${rgbColors.length}: ${color.hex}`)
    
    try {
      const mask = await createColorMask(buffer, color, 60) // Tolerance of 60
      const paths = await traceMaskToPath(mask, color.hex)
      return paths
    } catch (error) {
      console.error(`[API] Error processing layer ${color.hex}:`, error)
      return ''
    }
  })
  
  const allPaths = await Promise.all(pathsPromises)
  const validPaths = allPaths.filter(p => p.length > 0)
  
  console.log(`[API] Generated ${validPaths.length} color layers`)
  
  // Combine into single SVG with explicit transparency
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}">
${validPaths.join('\n')}
</svg>`
  
  return svg
}

/**
 * Converts a raster image buffer to multi-color SVG using potrace posterize
 * DEPRECATED: Use colorSegmentToSvg for better color accuracy
 */
async function posterizeToSvg(buffer: Buffer, colorCount: number): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      const params = {
        steps: Math.min(colorCount, 5),
        fillStrategy: "dominant",
        rangeDistribution: "auto",
        background: "transparent",
        turdSize: 2,
        optTolerance: 0.2,
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
  
  // First, remove any <rect> elements (background fills)
  let result = svgString.replace(/<rect[^>]*\/?>(?:<\/rect>)?/gi, () => {
    console.log("[API] Removed <rect> background element")
    return ''
  })
  
  const viewBoxMatch = result.match(/viewBox="(\d+)\s+(\d+)\s+(\d+)\s+(\d+)"/)
  const vbWidth = viewBoxMatch ? parseInt(viewBoxMatch[3]) : 0
  const vbHeight = viewBoxMatch ? parseInt(viewBoxMatch[4]) : 0
  
  let removedCount = 0
  let keptCount = 0
  
  result = result.replace(/<path\s+([^>]*?)(?:\/?>|>[\s\S]*?<\/path>)/gi, (match, attrs) => {
    const dMatch = attrs.match(/d="([^"]*)"/)
    if (dMatch) {
      const d = dMatch[1]
      
      // Count the complexity of the path (number of commands)
      const commandCount = (d.match(/[MLHVCSQTAZ]/gi) || []).length
      
      // A simple background rectangle has very few commands (usually 4-8)
      // A real logo/icon has many more commands (curves, lines, etc.)
      const isSimplePath = commandCount <= 8
      
      // Check if path starts at origin and covers full viewBox
      const startsAtOrigin = /^M\s*0[\s,]+0?\s/.test(d) || /^M\s*0[\s,]+0[VHLC\s]/.test(d)
      const containsFullWidth = d.includes(`${vbWidth}`) || d.includes(`${vbWidth - 1}`)
      const containsFullHeight = d.includes(`${vbHeight}`) || d.includes(`${vbHeight - 1}`)
      
      // Only remove if it's a SIMPLE path that covers the full viewBox
      // Complex paths (the actual logo) should be kept even if they span the viewBox
      const isLikelyBackground = isSimplePath && startsAtOrigin && containsFullWidth && containsFullHeight
      
      // Check if it's a full rectangle path (M 0 0 V height H width V 0 Z)
      const isFullRect = isSimplePath && /^M\s*0[\s,]+[\d.]+[VH]/.test(d) && (containsFullWidth || containsFullHeight)
      
      if (isLikelyBackground || isFullRect) {
        console.log(`[API] Removed background path (simple path with ${commandCount} commands covering full viewBox)`)
        removedCount++
        return ''
      }
      
      console.log(`[API] Kept path with ${commandCount} commands`)
    }
    
    keptCount++
    return match
  })
  
  console.log(`[API] Removed ${removedCount} background paths, kept ${keptCount} foreground paths`)
  return removedCount === 0 ? svgString : result
}

/**
 * Scales SVG content to fit within 24x24 viewBox
 * Since the image was squared before potrace, this is a simple scale operation
 */
function scaleIconToFit(svgString: string): string {
  // Extract the current viewBox from the SVG (created by potrace)
  const viewBoxMatch = svgString.match(/viewBox="([\d.]+)\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)"/)
  
  if (!viewBoxMatch) {
    console.log("[API] No viewBox found in SVG, skipping scale")
    return svgString
  }
  
  const vbWidth = parseFloat(viewBoxMatch[3])
  const vbHeight = parseFloat(viewBoxMatch[4])
  
  console.log(`[API] Potrace viewBox: ${vbWidth}x${vbHeight}`)
  
  // Calculate scale factor (e.g., 512 → 24 = scale of 0.046875)
  const scale = 24 / Math.max(vbWidth, vbHeight)
  console.log(`[API] Scale factor: ${scale}`)
  
  // Find SVG opening and closing tags
  const svgOpenMatch = svgString.match(/<svg[^>]*>/)
  if (!svgOpenMatch) {
    console.log("[API] Could not find SVG opening tag")
    return svgString
  }
  
  // Replace viewBox with 24x24
  const newSvg = svgString.replace(
    /viewBox="[\d.\s]+"/, 
    'viewBox="0 0 24 24"'
  )
  
  // Extract content between svg tags
  const openTag = newSvg.match(/<svg[^>]*>/)![0]
  const openTagEnd = newSvg.indexOf(openTag) + openTag.length
  const closeTagStart = newSvg.lastIndexOf('</svg>')
  const content = newSvg.substring(openTagEnd, closeTagStart)
  
  // Wrap content in a group with scale transform
  const scaledContent = `<g transform="scale(${scale})">${content}</g>`
  
  const result = openTag + scaledContent + '</svg>'
  console.log(`[API] Added scale transform: scale(${scale})`)
  
  return result
}

/**
 * Replaces colors in SVG with custom brand colors
 * Strategy: 
 * - Separate "white/light" colors (brightness > 180) to preserve them
 * - Distribute remaining vibrant colors evenly across paths
 */
function applyCustomColors(svgString: string, customColors: string[]): string {
  console.log("[API] Applying brand colors to SVG...")
  console.log("[API] Colors to apply:", customColors.join(", "))
  
  // Separate light colors (white/cream) from vibrant colors
  const WHITE_THRESHOLD = 180
  const lightColors = customColors.filter(c => getColorBrightness(c) > WHITE_THRESHOLD)
  const vibrantColors = customColors.filter(c => getColorBrightness(c) <= WHITE_THRESHOLD)
  
  console.log(`[API] Light colors (preserved): ${lightColors.join(", ") || "none"}`)
  console.log(`[API] Vibrant colors: ${vibrantColors.join(", ")}`)
  
  // Count all paths first
  const pathMatches = svgString.match(/<path[^>]*\/?>/gi) || []
  const pathCount = pathMatches.length
  console.log(`[API] Found ${pathCount} paths in SVG`)
  
  if (pathCount === 0) {
    console.log("[API] No paths found, returning original")
    return svgString
  }
  
  // If we have no vibrant colors, use the original colors
  const colorsToApply = vibrantColors.length > 0 ? vibrantColors : customColors
  
  // Sort vibrant colors by brightness (darkest first)
  const sortedColors = [...colorsToApply].sort((a, b) => {
    return getColorBrightness(a) - getColorBrightness(b)
  })
  console.log("[API] Sorted vibrant colors (dark→light):", sortedColors.join(", "))
  
  // Determine how many paths should be "light" (white text)
  // If we detected light colors, assume ~25% of paths might be text
  const lightPathCount = lightColors.length > 0 ? Math.ceil(pathCount * 0.25) : 0
  const vibrantPathCount = pathCount - lightPathCount
  
  // Replace each path with a color from the palette
  let pathIndex = 0
  const result = svgString.replace(/<path\s+([^>]*?)\s*(\/?>)/gi, (match, attrs, ending) => {
    // Remove any existing fill attribute and clean up whitespace
    let cleanAttrs = attrs.replace(/fill\s*=\s*["'][^"']*["']/gi, '')
    cleanAttrs = cleanAttrs.replace(/\s+/g, ' ').trim()
    
    let assignedColor: string
    
    // Last paths get the light color (text is usually at the bottom/end)
    if (lightColors.length > 0 && pathIndex >= vibrantPathCount) {
      assignedColor = lightColors[0] // Use the detected light color
      console.log(`[API] Path ${pathIndex + 1}/${pathCount} → ${assignedColor} (light/text)`)
    } else {
      // Distribute vibrant colors evenly
      const colorIndex = vibrantPathCount > 0 
        ? Math.floor((pathIndex / vibrantPathCount) * sortedColors.length)
        : 0
      assignedColor = sortedColors[Math.min(colorIndex, sortedColors.length - 1)]
      console.log(`[API] Path ${pathIndex + 1}/${pathCount} → ${assignedColor}`)
    }
    
    pathIndex++
    
    // Build clean path element
    if (cleanAttrs) {
      return `<path ${cleanAttrs} fill="${assignedColor}"${ending}`
    } else {
      return `<path fill="${assignedColor}"${ending}`
    }
  })
  
  console.log(`[API] ✅ Applied colors to ${pathIndex} paths`)
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
    // Icon mode: always 24x24 viewBox
    // Content will be scaled to fit (handled in scaleIconToFit function)
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
                // Replace fill attribute (unless none or transparent)
                if (node.attributes.fill && 
                    node.attributes.fill !== "none" && 
                    node.attributes.fill !== "transparent") {
                  node.attributes.fill = "currentColor"
                }
                // Replace stroke attribute (unless none or transparent)
                if (node.attributes.stroke && 
                    node.attributes.stroke !== "none" && 
                    node.attributes.stroke !== "transparent") {
                  node.attributes.stroke = "currentColor"
                }
                // Handle style attribute - replace fill/stroke colors
                if (node.attributes.style) {
                  node.attributes.style = node.attributes.style
                    .replace(/fill\s*:\s*(?!none|transparent)[^;]+/gi, "fill:currentColor")
                    .replace(/stroke\s*:\s*(?!none|transparent)[^;]+/gi, "stroke:currentColor")
                }
              },
            },
          }
        },
      },
      // Remove style blocks that might contain colors
      {
        name: "removeStyleElement",
        fn: () => {
          return {
            element: {
              enter: (node: { name: string }, parentNode: { children?: unknown[] }) => {
                if (node.name === "style" && parentNode.children) {
                  const index = parentNode.children.indexOf(node)
                  if (index > -1) {
                    parentNode.children.splice(index, 1)
                  }
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
 * Uses service role key to bypass RLS for server-side uploads
 */
async function uploadToSupabase(
  svgContent: string,
  fileName: string
): Promise<string | null> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.log("Supabase not configured or missing service role key, skipping upload")
    return null
  }

  try {
    // Use service role key for server-side uploads to bypass RLS
    const { createClient: createSupabaseClient } = await import("@supabase/supabase-js")
    const supabaseAdmin = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )

    const { data, error } = await supabaseAdmin.storage
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
    } = supabaseAdmin.storage.from("assets").getPublicUrl(data.path)

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
  
  // Check if user is admin (exempt from rate limiting)
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  console.log(`[API] 👤 User detected: ${user?.id || 'anonymous'} (${user?.email || 'no email'})`)
  const isAdmin = user?.email && ADMIN_EMAILS.includes(user.email)
  
  // Check rate limit (skip for admin users)
  const clientIP = getClientIP(request)
  
  if (!isAdmin) {
    const { allowed, remaining } = checkRateLimit(clientIP)
    
    if (!allowed) {
      console.log(`[API] ⛔ Rate limit exceeded for IP: ${clientIP}`)
      return NextResponse.json(
        { 
          success: false, 
          error: "Daily limit reached. Come back tomorrow!",
          limitInfo: {
            maxRequests: MAX_REQUESTS_PER_DAY,
            remaining: 0
          }
        },
        { status: 429 }
      )
    }
    
    console.log(`[API] ✅ Rate limit check passed for IP: ${clientIP} (${remaining} remaining today)`)
  } else {
    console.log(`[API] 👑 Admin user detected - skipping rate limit`)
  }
  
  try {
    console.log("[API] ========== Starting file processing ==========")
    console.log(`[API] Environment: ${process.env.VERCEL ? 'Vercel' : 'Local'}`)
    
    const formData = await request.formData()
    const file = formData.get("file") as File | null
    const mode = (formData.get("mode") as OutputMode) || "icon"
    const shouldRemoveBackground = formData.get("removeBackground") === "true"
    const customComponentName = formData.get("componentName") as string | null
    
    // Get mode configuration, but allow override from debug page
    const modeConfig = MODE_CONFIG[mode]
    const customColorCount = formData.get("colorCount")
    // Use custom colorCount if provided (debug mode), otherwise use mode default
    // Limit to max 4 for performance (potrace struggles with 5+)
    const colorCount = customColorCount 
      ? Math.min(parseInt(customColorCount as string) || modeConfig.colorCount, 4)
      : Math.min(modeConfig.colorCount, 4)
    
    console.log(`[API] Mode: ${mode} (${modeConfig.description})`)
    console.log(`[API] Remove background: ${shouldRemoveBackground}`)
    console.log(`[API] Color count: ${colorCount} (custom: ${customColorCount || 'no'})`)

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

    // Handle IMAGE mode - just upload the file without any processing
    if (mode === "image") {
      console.log("[API] 🖼️ Image mode - uploading raw file without vectorization")
      
      const timestamp = Date.now()
      let publicUrl: string | null = null
      let savedAssetId: string | null = null
      
      if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
        try {
          const { createClient: createSupabaseClient } = await import("@supabase/supabase-js")
          const supabaseAdmin = createSupabaseClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL,
            process.env.SUPABASE_SERVICE_ROLE_KEY
          )
          
          // Determine file extension
          const ext = fileName.split('.').pop()?.toLowerCase() || 'png'
          const storagePath = `images/${user?.id || 'anonymous'}/${componentName}_${timestamp}.${ext}`
          
          // Upload the raw image
          const { error: uploadError } = await supabaseAdmin.storage
            .from("assets")
            .upload(storagePath, buffer, {
              contentType: fileType,
              upsert: true,
            })
          
          if (uploadError) {
            console.error("[API] Image upload error:", uploadError)
            throw new Error("Failed to upload image")
          }
          
          // Get public URL
          const { data: { publicUrl: url } } = supabaseAdmin.storage
            .from("assets")
            .getPublicUrl(storagePath)
          
          publicUrl = url
          console.log(`[API] 📤 Image uploaded to: ${publicUrl}`)
          
          // Check for existing asset with same name for this user
          const userId = user?.id || null
          let query = supabaseAdmin
            .from("assets")
            .select("id, component_name")
            .eq("component_name", componentName)
          
          if (userId) {
            query = query.eq("user_id", userId)
          } else {
            query = query.is("user_id", null)
          }
          
          const { data: existingAsset } = await query.single()
          
          let finalComponentName = componentName
          if (existingAsset) {
            finalComponentName = `${componentName}_${timestamp}`
            console.log(`[API] Asset "${componentName}" already exists, using "${finalComponentName}"`)
          }
          
          // Save to database
          const { data: assetData, error: insertError } = await supabaseAdmin
            .from("assets")
            .insert({
              user_id: userId,
              original_filename: fileName,
              original_url: publicUrl,
              original_size_bytes: file.size,
              mode: "image",
              component_name: finalComponentName,
              remove_background: false,
              svg_url: publicUrl, // For images, svg_url points to the image itself
              react_component: `// Raw image: ${finalComponentName}\nexport const ${finalComponentName} = () => <img src="${publicUrl}" alt="${finalComponentName}" />`,
              detected_colors: [],
              visibility: "private",
            })
            .select()
            .single()
          
          if (insertError) {
            console.error("[API] Failed to save image asset to DB:", insertError)
          } else {
            savedAssetId = assetData.id
            console.log(`[API] 💾 Image asset saved to DB: ${savedAssetId}, user_id: ${userId || 'null'}, name: ${finalComponentName}`)
          }
        } catch (error) {
          console.error("[API] Image mode error:", error)
          return NextResponse.json(
            { error: "Failed to upload image" },
            { status: 500 }
          )
        }
      }
      
      const totalTime = Date.now() - startTime
      console.log(`[API] ✅ Image upload complete in ${totalTime}ms`)
      
      return NextResponse.json({
        success: true,
        data: {
          componentName,
          optimizedSvg: null,
          reactComponent: `// Raw image: ${componentName}\nexport const ${componentName} = () => <img src="${publicUrl}" alt="${componentName}" />`,
          publicUrl,
          originalFileName: fileName,
          detectedColors: [],
          mode: "image",
          assetId: savedAssetId,
        },
      })
    }

    let svgString: string
    let detectedColors: string[] = []
    let originalWidth: number | undefined
    let originalHeight: number | undefined

    // Step 1: Handle different file types (for icon/logo modes)
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

      // Get dimensions and check for transparency
      const metadata = await sharp(buffer).metadata()
      originalWidth = metadata.width
      originalHeight = metadata.height
      console.log(`[API] Original image dimensions: ${originalWidth}x${originalHeight}`)
      
      // Check if PNG has alpha channel (transparency)
      // Only block transparent images in LOGO mode (color detection is complex)
      // Icon mode creates a silhouette anyway, so transparency is fine
      if (mode === "logo" && fileType === "image/png" && metadata.channels === 4 && !shouldRemoveBackground) {
        // Check if image actually uses transparency
        const { data } = await sharp(buffer).raw().toBuffer({ resolveWithObject: true })
        let hasTransparency = false
        for (let i = 3; i < data.length; i += 4) {
          if (data[i] < 250) { // Alpha < 250 means some transparency
            hasTransparency = true
            break
          }
        }
        
        if (hasTransparency) {
          console.log("[API] ⚠️ Logo mode with transparent background - not fully supported yet")
          return NextResponse.json(
            { 
              error: "Logo mode doesn't support transparent backgrounds yet. Please use Icon mode, upload an image with a solid background, or enable 'Remove Background' option.",
              errorType: "TRANSPARENT_NOT_SUPPORTED"
            },
            { status: 400 }
          )
        }
      }
      
      // For Icon mode with transparency, flatten to white background for silhouette creation
      if (mode === "icon" && fileType === "image/png" && metadata.channels === 4) {
        console.log("[API] Icon mode with transparent PNG - flattening to white background")
        buffer = await sharp(buffer)
          .flatten({ background: { r: 255, g: 255, b: 255 } })
          .png()
          .toBuffer() as Buffer<ArrayBuffer>
      }
      
      // Step 2: Background removal (if requested)
      if (shouldRemoveBackground) {
        console.log(`[API] ⏱️ ${Date.now() - startTime}ms - Starting background removal (${mode} mode)...`)
        const noBgBuffer = await removeBackgroundFromImage(buffer, mode)
        
        // Check if remove.bg changed the dimensions (cropped)
        const noBgMeta = await sharp(noBgBuffer).metadata()
        console.log(`[API] After remove.bg: ${noBgMeta.width}x${noBgMeta.height}`)
        
        if (noBgMeta.width !== originalWidth || noBgMeta.height !== originalHeight) {
          // remove.bg cropped the image - composite it back onto original size canvas
          console.log(`[API] Restoring original dimensions with transparent background...`)
          buffer = await sharp({
            create: {
              width: originalWidth!,
              height: originalHeight!,
              channels: 4,
              background: { r: 0, g: 0, b: 0, alpha: 0 }
            }
          })
          .composite([{
            input: noBgBuffer,
            gravity: 'center'
          }])
          .png()
          .toBuffer() as Buffer<ArrayBuffer>
        } else {
          buffer = noBgBuffer as Buffer<ArrayBuffer>
        }
        
        // For logo mode, trim transparent/white areas after background removal
        if (mode === "logo") {
          const beforeTrim = await sharp(buffer).metadata()
          buffer = await sharp(buffer)
            .trim({ threshold: 10 }) // Remove transparent/white borders
            .png()
            .toBuffer() as Buffer<ArrayBuffer>
          const afterTrim = await sharp(buffer).metadata()
          console.log(`[API] Trimmed logo: ${beforeTrim.width}x${beforeTrim.height} → ${afterTrim.width}x${afterTrim.height}`)
        }
        
        console.log(`[API] ⏱️ ${Date.now() - startTime}ms - Background removal complete`)
      }
      
      // Step 3: Extract colors for logo mode (after background removal)
      if (mode === "logo") {
        console.log("[API] Detecting brand colors...")
        detectedColors = await extractDominantColors(buffer, colorCount, false)
        console.log(`[API] Detected ${detectedColors.length} colors: ${detectedColors.join(", ")}`)
      }

      // Step 4: Resize and SQUARE the image for processing
      console.log("[API] Preparing image for vectorization...")
      const targetSize = 512 // Square size for processing
      
      let processedBuffer: Buffer
      
      if (mode === "icon" && originalWidth && originalHeight) {
        // ICON MODE: Convert to black silhouette on white background
        console.log(`[API] Creating silhouette: ${originalWidth}x${originalHeight}`)
        
        // Step 1: Get raw pixel data
        const { data, info } = await sharp(buffer)
          .flatten({ background: { r: 255, g: 255, b: 255 } })
          .raw()
          .toBuffer({ resolveWithObject: true })
        
        // Step 2: Convert to black/white silhouette
        // Any pixel that's not nearly white (r,g,b all > 250) becomes black
        const silhouetteData = Buffer.alloc(data.length)
        for (let i = 0; i < data.length; i += info.channels) {
          const r = data[i]
          const g = data[i + 1]
          const b = data[i + 2]
          
          // If pixel is nearly white, keep it white; otherwise make it black
          const isWhite = r > 250 && g > 250 && b > 250
          const value = isWhite ? 255 : 0
          
          silhouetteData[i] = value     // R
          silhouetteData[i + 1] = value // G
          silhouetteData[i + 2] = value // B
          if (info.channels === 4) {
            silhouetteData[i + 3] = 255 // A (fully opaque)
          }
        }
        
        // Step 3: Convert raw data to PNG first
        const silhouettePng = await sharp(silhouetteData, {
          raw: {
            width: info.width,
            height: info.height,
            channels: info.channels
          }
        }).png().toBuffer()
        
        // Trim whitespace around the content
        const trimmedBuffer = await sharp(silhouettePng)
          .trim({ background: '#FFFFFF', threshold: 10 })
          .png()
          .toBuffer()
        
        const trimmedMeta = await sharp(trimmedBuffer).metadata()
        console.log(`[API] After trim: ${trimmedMeta.width}x${trimmedMeta.height}`)
        
        // Now resize to fill the square (content will take up most of the space)
        processedBuffer = await sharp(trimmedBuffer)
          .resize(targetSize, targetSize, {
            fit: 'contain',
            background: { r: 255, g: 255, b: 255 }
          })
          .png()
          .toBuffer()
        
        console.log(`[API] Silhouette trimmed and squared to ${targetSize}x${targetSize}`)
      } else {
        // LOGO MODE: Simple resize only (no silhouette conversion)
        console.log(`[API] Logo mode: simple resize`)
        
        // Resize with transparent background preserved
        processedBuffer = await sharp(buffer)
          .ensureAlpha() // Ensure we have alpha channel
          .resize(targetSize, targetSize, {
            fit: 'inside',
            withoutEnlargement: true,
            background: { r: 0, g: 0, b: 0, alpha: 0 } // Transparent background
          })
          .png()
          .toBuffer()
      }

      // Step 5: Vectorize using potrace
      if (mode === "icon") {
        console.log(`[API] ⏱️ ${Date.now() - startTime}ms - Tracing (icon mode)...`)
        svgString = await traceToSvg(processedBuffer)
      } else {
        // For small images (<50KB), use posterize (more reliable)
        // For larger images, use color segmentation (more accurate)
        const useColorSegmentation = buffer.length > 50000 // 50KB threshold
        
        if (useColorSegmentation && detectedColors.length > 0) {
          console.log(`[API] ⏱️ ${Date.now() - startTime}ms - Color segmentation (large image, ${detectedColors.length} colors)...`)
          svgString = await colorSegmentToSvg(processedBuffer, detectedColors)
        } else {
          console.log(`[API] ⏱️ ${Date.now() - startTime}ms - Posterize (small image, ${colorCount} colors)...`)
          svgString = await posterizeToSvg(processedBuffer, colorCount)
        }
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
    
    // Step 6.5: Scale icon content to fit 24x24 (if icon mode)
    if (mode === "icon") {
      optimizedSvg = scaleIconToFit(optimizedSvg)
    }
    
    // Step 7: Remove background path (icon mode only)
    // For logo mode, background is already removed from the image before vectorization
    if (mode === "icon" && shouldRemoveBackground) {
      optimizedSvg = removeBackgroundPath(optimizedSvg)
    }
    
    // Step 8: Apply brand colors for logo mode (only if posterize was used)
    // colorSegmentToSvg already applies colors, posterizeToSvg needs color application
    if (mode === "logo" && detectedColors.length > 0) {
      // Check if colors were already applied (colorSegmentToSvg adds colors directly)
      const hasColoredPaths = optimizedSvg.includes('fill="#') && !optimizedSvg.includes('fill="#000')
      
      if (!hasColoredPaths) {
        console.log(`[API] Applying brand colors: ${detectedColors.join(", ")}`)
        optimizedSvg = applyCustomColors(optimizedSvg, detectedColors)
      } else {
        console.log(`[API] Colors already applied during segmentation`)
      }
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
    console.log(`[API] SVG size: ${optimizedSvg.length} chars`)
    console.log(`[API] SVG start: ${optimizedSvg.substring(0, 300)}...`)
    
    if (totalTime > 8000) {
      console.warn(`[API] ⚠️ WARNING: Processing took ${totalTime}ms - close to Vercel timeout`)
    }
    
    // Increment rate limit counter after successful processing (skip for admin)
    if (!isAdmin) {
      incrementRateLimit(clientIP)
    }
    
    // Auto-save asset to database
    let savedAssetId: string | null = null
    if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
      try {
        const originalFileName = `${user?.id || 'anonymous'}/${componentName}_original_${timestamp}${path.extname(fileName)}`
        
        const { createClient: createSupabaseClient } = await import("@supabase/supabase-js")
        const supabaseAdmin = createSupabaseClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL,
          process.env.SUPABASE_SERVICE_ROLE_KEY
        )
        
        // Check if an asset with this name already exists for this user
        const userId = user?.id || null
        let query = supabaseAdmin
          .from("assets")
          .select("id, component_name")
          .eq("component_name", componentName)
        
        if (userId) {
          query = query.eq("user_id", userId)
        } else {
          query = query.is("user_id", null)
        }
        
        const { data: existingAsset } = await query.single()
        
        // If asset already exists, update it instead of creating a new one
        let finalComponentName = componentName
        if (existingAsset) {
          // Append timestamp to make name unique
          finalComponentName = `${componentName}_${timestamp}`
          console.log(`[API] Asset "${componentName}" already exists, using "${finalComponentName}"`)
        }
        
        // Upload original file
        await supabaseAdmin.storage
          .from("assets")
          .upload(`originals/${originalFileName}`, file, {
            contentType: fileType,
            upsert: true,
          })
        
        const { data: { publicUrl: originalUrl } } = supabaseAdmin.storage
          .from("assets")
          .getPublicUrl(`originals/${originalFileName}`)
        
        // Insert asset record
        const { data: assetData, error: insertError } = await supabaseAdmin
          .from("assets")
          .insert({
            user_id: userId,
            original_filename: fileName,
            original_url: originalUrl,
            original_size_bytes: file.size,
            mode: mode,
            component_name: finalComponentName,
            remove_background: shouldRemoveBackground,
            svg_url: publicUrl,
            react_component: reactComponent,
            detected_colors: mode === "logo" ? detectedColors : [],
            visibility: "private",
          })
          .select()
          .single()
        
        if (insertError) {
          console.error("[API] Failed to save asset to DB:", insertError)
        } else {
          savedAssetId = assetData.id
          console.log(`[API] 💾 Asset saved to DB: ${savedAssetId}`)
        }
      } catch (dbError) {
        console.error("[API] Database save error:", dbError)
      }
    } else {
      console.log("[API] Skipping DB save - Supabase not configured")
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
        assetId: savedAssetId,  // Return the saved asset ID
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
