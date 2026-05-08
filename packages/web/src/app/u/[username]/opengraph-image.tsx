import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const revalidate = 300 // 5 minutes

export const size = { width: 1200, height: 627 }
export const contentType = 'image/png'

const PROFILE_QUERY = `
  query PublicProfile($username: String!) {
    publicProfile(username: $username) {
      username displayName avatarUrl totalCommits currentStreak longestStreak
      activeDays topLanguages { name percent }
    }
  }
`

const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:17642'

const LANG_COLORS: Record<string, string> = {
  TypeScript: '#3178c6', JavaScript: '#f1e05a', Python: '#3572A5',
  Go: '#00ADD8', Rust: '#dea584', Java: '#b07219', 'C++': '#f34b7d',
  C: '#555555', Ruby: '#701516', Swift: '#F05138', Kotlin: '#A97BFF',
  PHP: '#4F5D95', CSS: '#563d7c', HTML: '#e34c26', Shell: '#89e051', Dart: '#00B4AB',
}

function fmtNum(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`
  return String(n)
}

interface ProfileData {
  username: string
  displayName: string
  avatarUrl: string | null
  totalCommits: number
  currentStreak: number | null
  longestStreak: number | null
  activeDays: number
  topLanguages: { name: string; percent: number }[]
}

async function fetchProfile(username: string): Promise<ProfileData | null> {
  try {
    const res = await fetch(`${API_URL}/api/graphql`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: PROFILE_QUERY, variables: { username } }),
    })
    if (!res.ok) return null
    const json = await res.json() as { data?: { publicProfile: ProfileData | null } }
    return json.data?.publicProfile ?? null
  } catch {
    return null
  }
}

export default async function OgImage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params
  const profile = await fetchProfile(username)

  const name = profile?.displayName ?? username
  const handle = `@${username}`
  const commits = profile ? fmtNum(profile.totalCommits) : '—'
  const streak = profile?.currentStreak ?? 0
  const activeDays = profile?.activeDays ?? 0
  const langs = (profile?.topLanguages ?? []).slice(0, 4)

  const wavePath = 'M8,20 L16,20 L20,8 L28,32 L34,4 L40,20 L48,20'

  return new ImageResponse(
    (
      <div
        style={{
          width: 1200,
          height: 627,
          display: 'flex',
          flexDirection: 'column',
          background: 'linear-gradient(135deg, #0d1117 0%, #0a0f1a 60%, #080d14 100%)',
          position: 'relative',
          overflow: 'hidden',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        }}
      >
        {/* Glow top-right */}
        <div style={{
          display: 'flex',
          position: 'absolute', top: -120, right: -120,
          width: 500, height: 500,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(6,182,212,0.12) 0%, transparent 70%)',
        }} />
        {/* Glow bottom-left */}
        <div style={{
          display: 'flex',
          position: 'absolute', bottom: -100, left: '30%',
          width: 400, height: 400,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(124,58,237,0.08) 0%, transparent 70%)',
        }} />

        {/* Top accent line */}
        <div style={{
          display: 'flex',
          position: 'absolute', top: 0, left: 0, right: 0, height: 3,
          background: 'linear-gradient(90deg, #06b6d4 0%, #7c3aed 100%)',
        }} />

        {/* Main content */}
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, padding: '52px 64px 48px', justifyContent: 'space-between' }}>

          {/* Header row: name + logo */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ display: 'flex', fontSize: 48, fontWeight: 800, color: '#f1f5f9', lineHeight: 1.1, letterSpacing: '-0.02em' }}>
                {name}
              </div>
              <div style={{ display: 'flex', fontSize: 20, color: '#475569', fontFamily: 'monospace' }}>
                {handle} · reflog.app
              </div>
            </div>

            {/* reflog brand mark */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 44, height: 44,
                background: '#060a0d',
                border: '1px solid #06b6d4',
                borderRadius: 9,
              }}>
                <svg width="32" height="24" viewBox="0 0 56 40">
                  <path d={wavePath} stroke="#06b6d4" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                </svg>
              </div>
              <div style={{ display: 'flex', fontSize: 22, fontWeight: 800, color: '#f1f5f9' }}>
                ref<span style={{ color: '#06b6d4' }}>log</span>
              </div>
            </div>
          </div>

          {/* Divider */}
          <div style={{ display: 'flex', height: 1, background: 'rgba(255,255,255,0.06)' }} />

          {/* Stats row */}
          <div style={{ display: 'flex', gap: 48, alignItems: 'flex-end' }}>

            {/* Commits */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div style={{ display: 'flex', fontSize: 56, fontWeight: 900, color: '#06b6d4', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
                {commits}
              </div>
              <div style={{ display: 'flex', fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#475569', fontWeight: 600 }}>
                commits
              </div>
            </div>

            {/* Active days */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div style={{ display: 'flex', fontSize: 56, fontWeight: 900, color: '#22d3ee', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
                {activeDays}
              </div>
              <div style={{ display: 'flex', fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#475569', fontWeight: 600 }}>
                active days
              </div>
            </div>

            {/* Streak */}
            {streak > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div style={{ display: 'flex', fontSize: 56, fontWeight: 900, color: '#f59e0b', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
                  {streak}
                </div>
                <div style={{ display: 'flex', fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#78716c', fontWeight: 600 }}>
                  day streak
                </div>
              </div>
            )}

            {/* Languages — right side */}
            {langs.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginLeft: 'auto' }}>
                {langs.map((l) => (
                  <div key={l.name} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                      display: 'flex',
                      width: 10, height: 10, borderRadius: '50%',
                      background: LANG_COLORS[l.name] ?? '#6b7280',
                      flexShrink: 0,
                    }} />
                    <div style={{ display: 'flex', fontSize: 15, color: '#94a3b8', fontWeight: 500, width: 100 }}>{l.name}</div>
                    <div style={{ display: 'flex', fontSize: 15, color: '#475569', fontVariantNumeric: 'tabular-nums' }}>
                      {l.percent.toFixed(0)}%
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', fontSize: 14, color: '#334155' }}>
              Track your developer pulse · reflog.app/u/{username}
            </div>
            <div style={{ display: 'flex', fontSize: 13, color: '#1e293b', fontWeight: 500 }}>
              Strava for developers
            </div>
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 627 },
  )
}
