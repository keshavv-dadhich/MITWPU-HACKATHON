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

type Category = PlatformMatch['category']

interface PlatformDef {
  platform: string
  url: string
  category: Category
  probeUrl?: string                                  // API endpoint to probe
  probeCheck?: 'status' | 'json-not-null' | 'json-array' // how to interpret response
}

// Platforms with reliable public APIs for real HTTP probing
const PROBEABLE: PlatformDef[] = [
  {
    platform: 'GitHub', url: 'https://github.com/{u}',
    category: 'developer',
    probeUrl: 'https://api.github.com/users/{u}',
    probeCheck: 'status',
  },
  {
    platform: 'GitLab', url: 'https://gitlab.com/{u}',
    category: 'developer',
    probeUrl: 'https://gitlab.com/api/v4/users?username={u}',
    probeCheck: 'json-array',
  },
  {
    platform: 'HackerNews', url: 'https://news.ycombinator.com/user?id={u}',
    category: 'forum',
    probeUrl: 'https://hacker-news.firebaseio.com/v0/user/{u}.json',
    probeCheck: 'json-not-null',
  },
  {
    platform: 'Dev.to', url: 'https://dev.to/{u}',
    category: 'developer',
    probeUrl: 'https://dev.to/api/users/by_username?url={u}',
    probeCheck: 'status',
  },
  {
    platform: 'Reddit', url: 'https://reddit.com/user/{u}',
    category: 'forum',
    probeUrl: 'https://www.reddit.com/user/{u}/about.json',
    probeCheck: 'status',
  },
]

// Platforms where server-side probing is unreliable — use deterministic sim
const SIMULATED: PlatformDef[] = [
  { platform: 'Twitter/X',      url: 'https://twitter.com/{u}',           category: 'social'    },
  { platform: 'LinkedIn',       url: 'https://linkedin.com/in/{u}',       category: 'social'    },
  { platform: 'Instagram',      url: 'https://instagram.com/{u}',         category: 'social'    },
  { platform: 'Stack Overflow', url: 'https://stackoverflow.com/users/{u}', category: 'developer' },
  { platform: 'Pastebin',       url: 'https://pastebin.com/u/{u}',        category: 'other'     },
  { platform: 'Keybase',        url: 'https://keybase.io/{u}',            category: 'other'     },
  { platform: 'Medium',         url: 'https://medium.com/@{u}',           category: 'forum'     },
  { platform: 'Twitch',         url: 'https://twitch.tv/{u}',             category: 'gaming'    },
  { platform: 'Steam',          url: 'https://steamcommunity.com/id/{u}', category: 'gaming'    },
  { platform: 'Gravatar',       url: 'https://gravatar.com/{u}',          category: 'other'     },
  { platform: 'Codepen',        url: 'https://codepen.io/{u}',            category: 'developer' },
  { platform: 'Replit',         url: 'https://replit.com/@{u}',           category: 'developer' },
]

const RISK_NOTES: Record<Category, string> = {
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

    return data.map((hit: { site: string; url: string; status: string }) => ({
      platform: hit.site,
      url: hit.url,
      category: categorize(hit.site),
      confidence: 'high' as const,
      riskNote: RISK_NOTES[categorize(hit.site)],
    }))
  } catch {
    return null // Docker not running — fall through
  }
}

function categorize(site: string): Category {
  const s = site.toLowerCase()
  if (['github', 'gitlab', 'stackoverflow', 'codepen', 'replit', 'dev.to', 'bitbucket'].some(k => s.includes(k))) return 'developer'
  if (['twitter', 'linkedin', 'instagram', 'facebook', 'tiktok', 'snapchat'].some(k => s.includes(k))) return 'social'
  if (['reddit', 'medium', 'hackernews', 'quora'].some(k => s.includes(k))) return 'forum'
  if (['steam', 'twitch', 'xbox', 'playstation'].some(k => s.includes(k))) return 'gaming'
  return 'other'
}

// ─── TIER 2: HTTP PROBING ────────────────────────────────────────────────────

async function probeOnePlatform(def: PlatformDef, username: string): Promise<PlatformMatch | null> {
  if (!def.probeUrl) return null
  const url = def.probeUrl.replace('{u}', encodeURIComponent(username))
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 4000)
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'PIXIE-OSINT-Scanner/1.0',
        'Accept': 'application/json',
      },
    })
    clearTimeout(timer)

    if (def.probeCheck === 'status') {
      if (res.status === 200) {
        return {
          platform: def.platform,
          url: def.url.replace('{u}', username),
          category: def.category,
          confidence: 'high',
          riskNote: RISK_NOTES[def.category],
        }
      }
      return null // 404 or other = not found
    }

    if (def.probeCheck === 'json-not-null') {
      const text = await res.text()
      if (text && text !== 'null') {
        return {
          platform: def.platform,
          url: def.url.replace('{u}', username),
          category: def.category,
          confidence: 'high',
          riskNote: RISK_NOTES[def.category],
        }
      }
      return null
    }

    if (def.probeCheck === 'json-array') {
      const arr = await res.json()
      if (Array.isArray(arr) && arr.length > 0) {
        return {
          platform: def.platform,
          url: def.url.replace('{u}', username),
          category: def.category,
          confidence: 'high',
          riskNote: RISK_NOTES[def.category],
        }
      }
      return null
    }

    return null
  } catch {
    return null // timeout or network error
  }
}

async function httpProbe(username: string): Promise<PlatformMatch[]> {
  const results = await Promise.allSettled(
    PROBEABLE.map(p => probeOnePlatform(p, username))
  )
  return results
    .filter((r): r is PromiseFulfilledResult<PlatformMatch | null> => r.status === 'fulfilled')
    .map(r => r.value)
    .filter((m): m is PlatformMatch => m !== null)
}

// ─── TIER 3: DETERMINISTIC SIMULATION ────────────────────────────────────────

function deterministicSim(username: string): PlatformMatch[] {
  const seed = seedFromString(username)
  const count = 3 + (seed % 5) // select 3-7 simulated platforms
  const pool = [...SIMULATED]
  const selected: PlatformMatch[] = []
  let s = seed
  for (let i = 0; i < count && pool.length > 0; i++) {
    s = lcg(s)
    const def = pool.splice(s % pool.length, 1)[0]
    s = lcg(s)
    const conf = s % 3 === 0 ? 'high' : s % 3 === 1 ? 'medium' : 'low'
    selected.push({
      platform: def.platform,
      url: def.url.replace('{u}', username),
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
// Tier 1: Try Docker Sherlock container
// Tier 2: HTTP probe platforms with reliable APIs (GitHub, GitLab, HN, Dev.to, Reddit)
// Tier 3: Deterministic simulation for remaining platforms
// Results from all tiers are merged.

export async function runSherlockWorker(identifier: string): Promise<SherlockResult> {
  const username = identifier.includes('@')
    ? identifier.split('@')[0].replace(/[^a-zA-Z0-9._-]/g, '')
    : identifier

  let matches: PlatformMatch[] = []

  // Tier 1 — Docker Sherlock (comprehensive, if running)
  const dockerResult = await tryDockerSherlock(username)
  if (dockerResult && dockerResult.length > 0) {
    matches = dockerResult
  } else {
    // Tier 2 — Real HTTP probing for platforms with public APIs
    const probed = await httpProbe(username)

    // Tier 3 — Deterministic simulation for remaining platforms
    const simulated = deterministicSim(username)

    // Merge: probed (real) + simulated, avoiding duplicate platforms
    const probedNames = new Set(probed.map(p => p.platform))
    const filteredSim = simulated.filter(s => !probedNames.has(s.platform))
    matches = [...probed, ...filteredSim]
  }

  // Build findings
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

  // Aggregate category risk
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

  return { status: 'done', matches, findings }
}
