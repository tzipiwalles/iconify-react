import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

// This endpoint only works in development mode
// It sets the dev user's password to a known value and returns credentials
export async function POST() {
  // Only allow in development
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json(
      { success: false, error: "Not available in production" },
      { status: 403 }
    )
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json(
      { success: false, error: "Missing Supabase configuration" },
      { status: 500 }
    )
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  })

  const devEmail = "dev@assetbridge.local"
  const devPassword = "devpass123!" // Known password for dev login

  try {
    // First, check if the dev user exists
    const { data: users, error: listError } = await supabaseAdmin.auth.admin.listUsers()
    
    if (listError) {
      console.error("Error listing users:", listError)
      return NextResponse.json(
        { success: false, error: "Failed to check for dev user" },
        { status: 500 }
      )
    }

    let devUser = users.users.find(u => u.email === devEmail)

    if (!devUser) {
      // Create the dev user with the known password
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: devEmail,
        email_confirm: true,
        password: devPassword,
        user_metadata: { is_admin: true }
      })

      if (createError) {
        console.error("Error creating dev user:", createError)
        return NextResponse.json(
          { success: false, error: "Failed to create dev user" },
          { status: 500 }
        )
      }

      devUser = newUser.user
      console.log("[Dev Auth] Created dev user:", devEmail)
    } else {
      // Update the existing user's password to the known value
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
        devUser.id,
        { password: devPassword }
      )

      if (updateError) {
        console.error("Error updating dev user password:", updateError)
        return NextResponse.json(
          { success: false, error: "Failed to update dev user" },
          { status: 500 }
        )
      }

      console.log("[Dev Auth] Updated dev user password:", devEmail)
    }

    // Return the credentials so the client can sign in
    return NextResponse.json({
      success: true,
      email: devEmail,
      password: devPassword,
    })
  } catch (error) {
    console.error("Dev auth error:", error)
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    )
  }
}
