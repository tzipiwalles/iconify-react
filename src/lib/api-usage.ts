import { createClient } from "@/lib/supabase/server"

interface ApiUsageData {
  endpoint: string
  method: string
  queryParams?: Record<string, string>
  statusCode?: number
  responseTimeMs?: number
}

/**
 * Track API usage for analytics
 * Non-blocking - errors are logged but don't affect the response
 */
export async function trackApiUsage(
  request: Request,
  data: ApiUsageData
): Promise<void> {
  try {
    const supabase = await createClient()
    
    // Get user info
    const { data: { user } } = await supabase.auth.getUser()
    
    // Get IP and user agent
    const ipAddress = request.headers.get("x-forwarded-for") || 
                      request.headers.get("x-real-ip") || 
                      "unknown"
    const userAgent = request.headers.get("user-agent") || "unknown"

    // Insert tracking record (non-blocking)
    await supabase
      .from("api_usage")
      .insert({
        endpoint: data.endpoint,
        method: data.method,
        query_params: data.queryParams || null,
        user_id: user?.id || null,
        ip_address: ipAddress,
        user_agent: userAgent,
        status_code: data.statusCode || null,
        response_time_ms: data.responseTimeMs || null,
      })
      .select()

  } catch (error) {
    // Log error but don't throw - tracking shouldn't break the API
    console.error("Failed to track API usage:", error)
  }
}
