// Admin configuration
// Users in this list have special permissions across the app

export const ADMIN_EMAILS = [
  "tzipi.walles@gmail.com",
  "IQton", // GitHub username - will match against user_metadata.user_name
  "dev@assetbridge.app", // Dev user for local testing
]

export function isAdmin(user: { email?: string | null; user_metadata?: { user_name?: string } } | null): boolean {
  if (!user) return false
  
  // Check email
  if (user.email && ADMIN_EMAILS.includes(user.email)) {
    return true
  }
  
  // Check GitHub username (for OAuth users)
  if (user.user_metadata?.user_name && ADMIN_EMAILS.includes(user.user_metadata.user_name)) {
    return true
  }
  
  return false
}
