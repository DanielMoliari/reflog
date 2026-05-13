const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:17642'

export async function logout(): Promise<void> {
  await fetch(`${API_URL}/api/v1/auth/logout`, { method: 'GET', credentials: 'include' })
}

export function isAuthenticated(): boolean {
  // With httpOnly cookies we can't read the token from JS.
  // The cookie presence is checked by the API on every request.
  // We use a lightweight session flag in sessionStorage so the client
  // knows whether to show authenticated UI without exposing the JWT.
  if (typeof window === 'undefined') return false
  return sessionStorage.getItem('authed') === '1'
}

export function markAuthenticated(): void {
  if (typeof window !== 'undefined') sessionStorage.setItem('authed', '1')
}

export function clearAuthenticated(): void {
  if (typeof window !== 'undefined') sessionStorage.removeItem('authed')
}
