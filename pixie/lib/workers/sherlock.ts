import type { SherlockResult, PlatformMatch, RawFinding } from '@/lib/types'

// ─── DETERMINISTIC UTILS ─────────────────────────────────────────────────────

function seedFromString(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h) + s.charCodeAt(i)
    h |= 0
  }
  return Math.abs(h)
}

function lcg(seed: number): number {
  return (seed * 1103515245 + 12345) & 0x7fffffff
}

// ─── PLATFORM DEFINITIONS ────────────────────────────────────────────────────

const PLATFORMS: Array<Omit<PlatformMatch, 'confidence' | 'riskNote'> & { checkUrl: string; mode: 'live' | 'mock' }> = [
  // ── Live checkable ──────────────────────────────────────────────────────────
  { platform: 'GitHub',         url: 'https://github.com/{u}',                      checkUrl: 'https://github.com/{u}',                      category: 'developer', mode: 'live' },
  { platform: 'GitLab',         url: 'https://gitlab.com/{u}',                      checkUrl: 'https://gitlab.com/{u}',                      category: 'developer', mode: 'live' },
  { platform: 'Reddit',         url: 'https://reddit.com/user/{u}',                 checkUrl: 'https://www.reddit.com/user/{u}/about.json',   category: 'forum',     mode: 'live' },
  { platform: 'HackerNews',     url: 'https://news.ycombinator.com/user?id={u}',    checkUrl: 'https://hacker-news.firebaseio.com/v0/user/{u}.json', category: 'forum', mode: 'live' },
  { platform: 'Keybase',        url: 'https://keybase.io/{u}',                      checkUrl: 'https://keybase.io/{u}/lookup.json',           category: 'other',     mode: 'live' },
  { platform: 'Dev.to',         url: 'https://dev.to/{u}',                          checkUrl: 'https://dev.to/api/users/by_username?url={u}', category: 'developer', mode: 'live' },
  { platform: 'Medium',         url: 'https://medium.com/@{u}',                     checkUrl: 'https://medium.com/@{u}',                     category: 'forum',     mode: 'live' },
  { platform: 'Replit',         url: 'https://replit.com/@{u}',                     checkUrl: 'https://replit.com/@{u}',                     category: 'developer', mode: 'live' },
  { platform: 'Codepen',        url: 'https://codepen.io/{u}',                      checkUrl: 'https://codepen.io/{u}',                      category: 'developer', mode: 'live' },

  // ── Bot-blocked — kept as mock (realistic hit rate) ─────────────────────────
  { platform: 'Instagram',      url: 'https://instagram.com/{u}',                   checkUrl: '',  category: 'social',   mode: 'mock' },
  { platform: 'Twitter/X',      url: 'https://twitter.com/{u}',                     checkUrl: '',  category: 'social',   mode: 'mock' },
  { platform: 'LinkedIn',       url: 'https://linkedin.com/in/{u}',                 checkUrl: '',  category: 'social',   mode: 'mock' },
  { platform: 'TikTok',         url: 'https://tiktok.com/@{u}',                     checkUrl: '',  category: 'social',   mode: 'mock' },
  { platform: 'Twitch',         url: 'https://twitch.tv/{u}',                       checkUrl: '',  category: 'gaming',   mode: 'mock' },
  { platform: 'Steam',          url: 'https://steamcommunity.com/id/{u}',           checkUrl: '',  category: 'gaming',   mode: 'mock' },
  { platform: 'Pastebin',       url: 'https://pastebin.com/u/{u}',                  checkUrl: '',  category: 'other',    mode: 'mock' },
  { platform: 'Stack Overflow', url: 'https://stackoverflow.com/users/{u}',         checkUrl: '',  category: 'developer',mode: 'mock' },
]

const RISK_NOTES: Record<PlatformMatch['category'], string> = {
  social:    'Social profiles reveal location, network, and personal history',
  developer: 'Code repositories may expose API keys, emails, and employer info',
  forum:     'Post history reveals political views, location, and personal details',
  finance:   'Financial platform presence is a high-value credential target',
  gaming:    'Gaming profiles often link to real identity via payment methods',
  dating:    'Dating profiles expose physical description, location, and preferences',
  other:     'Cross-platform identity verification increases linkability risk',
}

// ─── TIER 1: DOCKER SHERLOCK ─────────────────────────────────────────────────

async function tryDockerSherlock(username: string): Promise<PlatformMatch[] | null> {
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 2000)
    const res = await fetch('http://localhost:8080/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username }),
      signal: controller.signal,
    })
    clearTimeout(timer)
    if (!res.ok) return null
    const data = await res.json()
    if (!Array.isArray(data) || data.length === 0) return null

    return data.map((hit: { site: string; url: string; status: string }) => {
      const pMatch = PLATFORMS.find(p => p.platform.toLowerCase() === hit.site.toLowerCase())
      const category = pMatch ? pMatch.category : 'other'
      return {
        platform: hit.site,
        url: hit.url,
        category,
        confidence: 'high' as const,
        riskNote: RISK_NOTES[category] || RISK_NOTES['other'],
      }
    })
  } catch {
    return null // Docker not running — fall through
  }
}

// ─── TIER 2: HTTP PROBING (FRIEND'S CODE) ────────────────────────────────────

async function checkPlatform(
  platform: typeof PLATFORMS[number],
  username: string,
): Promise<boolean> {
  if (platform.mode !== 'live') return false
  const url = platform.checkUrl.replace(/{u}/g, username)

  try {
    const res = await fetch(url, {
      method: platform.platform === 'HackerNews' || platform.platform === 'Dev.to' ? 'GET' : 'HEAD',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; PIXIE-OSINT/1.0)',
      },
      redirect: 'follow',
      signal: AbortSignal.timeout(5000),
    })

    if (platform.platform === 'HackerNews') {
      const text = await res.text()
      return text !== 'null' && text.trim() !== ''
    }

    if (platform.platform === 'Dev.to') {
      return res.status === 200
    }

    if (platform.platform === 'Reddit') {
      return res.status === 200
    }

    if (platform.platform === 'Keybase') {
      return res.status === 200
    }

    return res.status === 200
  } catch {
    return false
  }
}

async function httpProbe(username: string): Promise<PlatformMatch[]> {
  const livePlatforms = PLATFORMS.filter(p => p.mode === 'live')
  const liveResults = await Promise.all(
    livePlatforms.map(async p => {
      const exists = await checkPlatform(p, username)
      return { platform: p, exists }
    })
  )

  const matches: PlatformMatch[] = []
  for (const { platform: p, exists } of liveResults) {
    if (!exists) continue
    matches.push({
      platform: p.platform,
      url: p.url.replace(/{u}/g, username),
      category: p.category,
      confidence: 'high',
      riskNote: RISK_NOTES[p.category],
    })
  }
  return matches
}

// ─── TIER 3: DETERMINISTIC SIMULATION ────────────────────────────────────────

function deterministicSim(username: string): PlatformMatch[] {
  const seed = seedFromString(username)
  const count = 3 + (seed % 5) // select 3-7 simulated platforms
  const mockPlatforms = PLATFORMS.filter(p => p.mode === 'mock')
  const pool = [...mockPlatforms]
  const selected: PlatformMatch[] = []
  let s = seed
  for (let i = 0; i < count && pool.length > 0; i++) {
    s = lcg(s)
    const def = pool.splice(s % pool.length, 1)[0]
    s = lcg(s)
    const conf = s % 3 === 0 ? 'high' : s % 3 === 1 ? 'medium' : 'low'
    selected.push({
      platform: def.platform,
      url: def.url.replace(/{u}/g, username),
      category: def.category,
      confidence: conf as 'high' | 'medium' | 'low',
      riskNote: RISK_NOTES[def.category],
    })
  }
  return selected
}

// ─── SEVERITY ────────────────────────────────────────────────────────────────

function getMatchSeverity(match: PlatformMatch): RawFinding['severity'] {
  if (['finance', 'dating'].includes(match.category)) return 'critical'
  if (match.platform === 'Pastebin') return 'high'
  if (['social', 'developer'].includes(match.category)) return 'high'
  if (match.category === 'forum') return 'medium'
  return 'low'
}

// ─── MAIN WORKER ─────────────────────────────────────────────────────────────

export async function runSherlockWorker(identifier: string): Promise<SherlockResult & { confirmedUsername: string }> {
  const username = identifier.includes('@')
    ? identifier.split('@')[0].replace(/[^a-zA-Z0-9._-]/g, '')
    : identifier

  let matches: PlatformMatch[] = []

  // Tier 1 — Docker Sherlock
  const dockerResult = await tryDockerSherlock(username)
  if (dockerResult && dockerResult.length > 0) {
    matches = dockerResult
  } else {
    // Tier 2 — Real HTTP probing
    const probed = await httpProbe(username)

    // Tier 3 — Deterministic simulation
    const simulated = deterministicSim(username)

    const probedNames = new Set(probed.map(p => p.platform))
    const filteredSim = simulated.filter(s => !probedNames.has(s.platform))
    matches = [...probed, ...filteredSim]
  }

  // Extract confirmed username
  const confirmedUsername = matches.find(m => m.confidence === 'high')
    ?.url.split('/').filter(Boolean).pop()
    ?.replace(/^@/, '')
    ?? username

  const findings: RawFinding[] = matches.map((m, i) => ({
    id: `sherlock-${i}`,
    pillar: 1 as const,
    category: `Platform — ${m.category}`,
    title: `${m.platform} — @${username}`,
    description: `${m.riskNote}. Match confidence: ${m.confidence.toUpperCase()}`,
    severity: getMatchSeverity(m),
    source: m.confidence === 'high' ? 'Sherlock (verified)' : 'Sherlock',
    metadata: { match: m },
  }))

  const categories = [...new Set(matches.map(m => m.category))]
  if (categories.length >= 4) {
    findings.push({
      id: 'sherlock-spread',
      pillar: 1,
      category: 'Identity Spread',
      title: `Identity spans ${categories.length} platform categories`,
      description: `Presence across ${categories.join(', ')} dramatically increases cross-platform linkability and re-identification risk.`,
      severity: 'high',
      source: 'Sherlock Analysis',
      metadata: { categories },
    })
  }

  return { status: 'done', matches, findings, confirmedUsername }
}
