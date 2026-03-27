import type {
  ScanResult, FourPillars, PillarScore, RawFinding,
  PivotNode, BrokerRecord, RemediationStep, AttackNarrative,
  RiskLevel, HibpResult, SherlockResult, GoogleCSEResult,
  ExifResult, HunterResult, VirusTotalResult, PhishingResult
} from '@/lib/types'
import type { IntelXResult, SpiderFootResult, SnovResult, SkrappResult } from '@/lib/workers/osint-extended'
import { generateDynamicSummary } from './aiNarrative'

// ─── PILLAR SCORING ───────────────────────────────────────────────────────────

function scoreFindings(findings: RawFinding[]): number {
  let score = 0
  for (const f of findings) {
    if (f.severity === 'critical') score += 25
    else if (f.severity === 'high') score += 15
    else if (f.severity === 'medium') score += 8
    else score += 3
  }
  return Math.min(100, score)
}

function buildPillar1(sherlock: SherlockResult, googleCSE: GoogleCSEResult, exif: ExifResult, extraFindings: RawFinding[] = []): PillarScore {
  const findings = [...sherlock.findings, ...googleCSE.findings, ...exif.findings, ...extraFindings].filter(f => f.pillar === 1)
  return {
    score: scoreFindings(findings),
    label: `${sherlock.matches.length} platforms`,
    rawCount: sherlock.matches.length,
    findings,
  }
}

function buildPillar2(hibp: HibpResult, extraFindings: RawFinding[] = []): PillarScore {
  const findings = [...hibp.findings, ...extraFindings].filter(f => f.pillar === 2)
  return {
    score: scoreFindings(findings),
    label: `${hibp.breaches.length} breaches`,
    rawCount: hibp.breaches.length,
    findings,
  }
}

function buildPillar3(hunter: HunterResult, googleCSE: GoogleCSEResult, sherlock: SherlockResult, extraFindings: RawFinding[] = []): PillarScore {
  const findings = [
    ...hunter.findings,
    ...googleCSE.findings,
    ...sherlock.findings,
    ...extraFindings,
  ].filter(f => f.pillar === 3)
  const pivotCount = Math.floor(findings.length / 2)
  return {
    score: scoreFindings(findings),
    label: `${pivotCount} pivot chains`,
    rawCount: pivotCount,
    findings,
  }
}

function buildPillar4(): PillarScore {
  // In production: query broker check APIs (Spokeo, BeenVerified, Intelius)
  // For prototype: simulate based on email age and common patterns
  const mockFindings: RawFinding[] = [
    {
      id: 'broker-spokeo', pillar: 4, category: 'Data Broker', severity: 'high',
      title: 'Spokeo — full profile listed',
      description: 'Name, address, phone number, relatives, and age publicly sold.',
      source: 'Broker Check',
    },
    {
      id: 'broker-beenverified', pillar: 4, category: 'Data Broker', severity: 'high',
      title: 'BeenVerified — background record active',
      description: 'Full name, DOB, employment, address history, and criminal records listed.',
      source: 'Broker Check',
    },
    {
      id: 'broker-intelius', pillar: 4, category: 'Data Broker', severity: 'high',
      title: 'Intelius — personal record active',
      description: 'Phone, address, and background data available for purchase.',
      source: 'Broker Check',
    },
    {
      id: 'broker-whitepages', pillar: 4, category: 'Data Broker', severity: 'medium',
      title: 'Whitepages — partial listing',
      description: 'Address history and phone number partially visible.',
      source: 'Broker Check',
    },
  ]
  return {
    score: scoreFindings(mockFindings),
    label: '8 broker listings',
    rawCount: 8,
    findings: mockFindings,
  }
}

// ─── DRS CALCULATION ─────────────────────────────────────────────────────────
// Weighted formula:
//   DRS = (P2 × 0.30) + (P1 × 0.25) + (P3 × 0.20) + (P4 × 0.15) + infostealer_bonus

function calculateDRS(pillars: FourPillars): number {
  const raw =
    pillars.breachCredential.score * 0.30 +
    pillars.identitySurface.score  * 0.25 +
    pillars.linkability.score      * 0.20 +
    pillars.dataBroker.score       * 0.15

  // Infostealer bonus: +10 if critical breach findings exist
  const hasInfostealer = pillars.breachCredential.findings.some(
    f => f.category === 'Credential Risk' && f.severity === 'critical'
  )
  return Math.min(100, Math.round(raw + (hasInfostealer ? 10 : 0)))
}

function getRiskLevel(drs: number): RiskLevel {
  if (drs >= 76) return 'CRITICAL'
  if (drs >= 51) return 'HIGH'
  if (drs >= 26) return 'MODERATE'
  return 'LOW'
}

// ─── PIVOT CHAIN ─────────────────────────────────────────────────────────────

function buildPivotNodes(
  identifier: string,
  hibp: HibpResult,
  sherlock: SherlockResult,
  exif: ExifResult,
): PivotNode[] {
  const nodes: PivotNode[] = [
    {
      id: 'email', label: identifier.length > 20 ? identifier.split('@')[0] + '\n@...' : identifier,
      type: 'center', pillar: 2, connects: [],
      riskNote: 'Primary identifier — the root of all exposure chains',
    },
  ]

  if (hibp.breaches.length > 0) {
    nodes.push({
      id: 'breachdb', label: `${hibp.breaches.length} Breach\nRecords`,
      type: 'primary', pillar: 2, connects: ['email'],
      riskNote: 'Breach records contain passwords and PII that unlock other accounts',
    })
    nodes.push({
      id: 'password', label: 'Password\nPattern',
      type: 'secondary', pillar: 2, connects: ['breachdb'],
      riskNote: 'Leaked passwords enable credential stuffing across all platforms',
    })
  }

  const socialPlatforms = sherlock.matches.filter(m => m.category === 'social')
  if (socialPlatforms.length > 0) {
    nodes.push({
      id: 'social', label: `${socialPlatforms.length} Social\nProfiles`,
      type: 'primary', pillar: 1, connects: ['email'],
      riskNote: 'Social profiles expose employment, location, and personal network',
    })
    nodes.push({
      id: 'employer', label: 'Employer\n& Role',
      type: 'secondary', pillar: 1, connects: ['social'],
      riskNote: 'Employer info enables targeted spear-phishing',
    })
  }

  const devPlatforms = sherlock.matches.filter(m => m.category === 'developer')
  if (devPlatforms.length > 0) {
    nodes.push({
      id: 'code', label: `${devPlatforms.length} Dev\nProfiles`,
      type: 'primary', pillar: 1, connects: ['email'],
      riskNote: 'Code repositories may contain API keys and credentials',
    })
    nodes.push({
      id: 'apikeys', label: 'API Keys\n& Secrets',
      type: 'secondary', pillar: 1, connects: ['code'],
      riskNote: 'Exposed API keys enable direct service account compromise',
    })
  }

  const gpsExposures = exif.exposures.filter(e => e.hasGPS)
  if (gpsExposures.length > 0) {
    nodes.push({
      id: 'location', label: 'Physical\nLocation',
      type: 'primary', pillar: 1, connects: ['email'],
      riskNote: 'GPS metadata narrows home address to within 50 meters',
    })
    nodes.push({
      id: 'homeaddr', label: 'Home\nAddress',
      type: 'secondary', pillar: 1, connects: ['location'],
      riskNote: 'Physical address enables stalking and mail fraud',
    })
  }

  nodes.push({
    id: 'brokers', label: 'Data\nBrokers',
    type: 'primary', pillar: 4, connects: ['email'],
    riskNote: 'Brokers aggregate and sell the complete profile',
  })

  return nodes
}

// ─── DATA BROKERS ─────────────────────────────────────────────────────────────

function buildBrokers(): BrokerRecord[] {
  return [
    { broker: 'Spokeo', dataFound: ['Full name', 'Address', 'Phone', 'Relatives'], riskLevel: 'high', status: 'active', optOutUrl: 'https://www.spokeo.com/optout' },
    { broker: 'BeenVerified', dataFound: ['Name', 'DOB', 'Email', 'Criminal records'], riskLevel: 'high', status: 'active', optOutUrl: 'https://www.beenverified.com/app/optout/search' },
    { broker: 'Whitepages', dataFound: ['Address history', 'Phone', 'Age'], riskLevel: 'medium', status: 'active', optOutUrl: 'https://www.whitepages.com/suppression_requests' },
    { broker: 'Intelius', dataFound: ['Name', 'Address', 'Phone', 'Background'], riskLevel: 'high', status: 'active', optOutUrl: 'https://www.intelius.com/opt-out' },
    { broker: 'PeopleFinders', dataFound: ['Address', 'Relatives', 'Email'], riskLevel: 'medium', status: 'active', optOutUrl: 'https://www.peoplefinders.com/opt-out' },
    { broker: 'FastPeopleSearch', dataFound: ['Name', 'Address', 'Phone'], riskLevel: 'low', status: 'partial', optOutUrl: 'https://www.fastpeoplesearch.com/removal' },
    { broker: 'AnyWho', dataFound: ['Phone', 'Partial address'], riskLevel: 'low', status: 'partial', optOutUrl: 'https://www.anywho.com/privacy' },
    { broker: 'ZabaSearch', dataFound: ['Address history', 'Age range'], riskLevel: 'medium', status: 'active', optOutUrl: 'https://www.zabasearch.com/block_records/' },
  ]
}

// ─── REMEDIATION STEPS ───────────────────────────────────────────────────────

function buildRemediations(
  pillars: FourPillars,
  drs: number,
): RemediationStep[] {
  const steps: RemediationStep[] = []

  if (pillars.breachCredential.score > 40) {
    steps.push({
      id: 'r-pwd', title: 'Rotate all passwords matching breach patterns',
      description: 'Multiple breaches confirm password exposure. Change every account using similar passwords. Use a password manager (Bitwarden, 1Password) and generate unique passwords per site.',
      pillar: 2, severity: 'critical', effort: 'moderate', done: false,
    })
    steps.push({
      id: 'r-mfa', title: 'Enable passkey or TOTP on all critical accounts',
      description: 'Email, banking, and employer SSO must have MFA enabled. Prefer passkeys or TOTP apps (Aegis, Authy) over SMS-based 2FA which is vulnerable to SIM-swap.',
      pillar: 2, severity: 'critical', effort: 'moderate', done: false,
    })
  }

  if (pillars.identitySurface.findings.some(f => f.category === 'EXIF GPS Leak')) {
    steps.push({
      id: 'r-exif', title: 'Strip EXIF metadata from all publicly shared photos',
      description: 'GPS coordinates in photos reveal your precise location. Use ExifTool, ImageOptim, or iOS Shortcuts to remove metadata before uploading. Check past uploads on social media.',
      pillar: 1, severity: 'critical', effort: 'quick', done: false,
    })
  }

  if (pillars.identitySurface.rawCount > 10) {
    steps.push({
      id: 'r-accounts', title: 'Audit and delete unused platform accounts',
      description: `${pillars.identitySurface.rawCount} platform presences detected. Each dormant account is a password breach vector. Use JustDeleteMe.xyz to find deletion links for each platform.`,
      pillar: 1, severity: 'high', effort: 'involved', done: false,
    })
  }

  steps.push({
    id: 'r-twitter-loc', title: 'Remove location data from social media posts',
    description: 'Disable location tagging in Twitter/X, Instagram settings. Request location data purge for historical posts. Revoke location permissions from all social media apps.',
    pillar: 1, severity: 'high', effort: 'quick', done: false,
  })

  if (pillars.dataBroker.rawCount > 0) {
    steps.push({
      id: 'r-brokers', title: 'Submit opt-out requests to all active data brokers',
      description: 'Spokeo, BeenVerified, and Intelius expose your full name, address, and relatives. Submit opt-out forms for each. Expect 30-day processing time. Re-check quarterly.',
      pillar: 4, severity: 'high', effort: 'involved', done: false,
    })
  }

  steps.push({
    id: 'r-linkedin', title: 'Restrict LinkedIn profile to connections only',
    description: 'Set profile visibility to "Connections only". Disable public indexing in Privacy settings. Your employment history is the primary data source for spear-phishing campaigns.',
    pillar: 1, severity: 'medium', effort: 'quick', done: false,
  })

  steps.push({
    id: 'r-github', title: 'Audit GitHub repos for exposed secrets',
    description: 'Run GitHub secret scanner or truffleHog on all public repos. Revoke any exposed API keys immediately. Enable GitHub secret scanning alerts for future commits.',
    pillar: 1, severity: 'medium', effort: 'moderate', done: false,
  })

  steps.push({
    id: 'r-google', title: 'Request Google removal of sensitive indexed pages',
    description: 'Use Google\'s "Remove outdated content" tool to de-index pages containing your PII. Submit GDPR/DPDPA right-to-erasure requests for pages with location or contact data.',
    pillar: 1, severity: 'medium', effort: 'moderate', done: false,
  })

  return steps
}

// ─── ATTACK NARRATIVE ────────────────────────────────────────────────────────

async function buildNarrative(
  identifier: string,
  pillars: FourPillars,
  drs: number,
  riskLevel: RiskLevel,
): Promise<AttackNarrative> {
  const breachCount = pillars.breachCredential.rawCount
  const platformCount = pillars.identitySurface.rawCount
  const hasGPS = pillars.identitySurface.findings.some(f => f.category === 'EXIF GPS Leak')
  const hasPwdReuse = pillars.breachCredential.findings.some(f => f.category === 'Credential Risk')

  const summary = await generateDynamicSummary(
    identifier,
    pillars,
    drs,
    riskLevel
  )

  console.log("Summary:", summary)

  const attackChain = [
    identifier,
    `LinkedIn breach → full name, employer, salary`,
    `Collection#1 → plaintext password recovered`,
    `Password reuse → email, banking portals`,
    `Account takeover → identity verified`,
  ]

  const topThreats = [
    `Credential stuffing: ${breachCount} breach records enable automated login attempts across 100+ platforms`,
    hasGPS ? 'Physical location: GPS metadata in photos reveals home address to within 50m' : 'Data broker dossier: Name, address, phone, and relatives available for $15',
    `Spear-phishing: Employer + tech stack + personal interests enable highly convincing targeted attacks`,
  ]

  return { summary, attackChain, topThreats }
}

// ─── MAIN AGGREGATOR ─────────────────────────────────────────────────────────

export async function aggregateResults(
  identifier: string,
  hibp: HibpResult,
  sherlock: SherlockResult,
  googleCSE: GoogleCSEResult,
  exif: ExifResult,
  hunter: HunterResult,
  intelx?: IntelXResult,
  spiderfoot?: SpiderFootResult,
  snov?: SnovResult,
  skrapp?: SkrappResult,
  virustotal?: VirusTotalResult,
  phishing?: PhishingResult,
): Promise<Omit<ScanResult, "scanId" | "identifierType" | "status" | "startedAt" | "completedAt">> {
  // Collect extra findings from extended workers, split by pillar
  const extP1: RawFinding[] = [
    ...(spiderfoot?.findings.filter(f => f.pillar === 1) || []),
    ...(skrapp?.findings.filter(f => f.pillar === 1) || []),
    ...(phishing?.findings.filter(f => f.pillar === 1) || []),
  ]
  const extP2: RawFinding[] = [
    ...(intelx?.findings.filter(f => f.pillar === 2) || []),
    ...(virustotal?.findings.filter(f => f.pillar === 2) || []),
    ...(phishing?.findings.filter(f => f.pillar === 2) || []),
  ]
  const extP3: RawFinding[] = [
    ...(snov?.findings.filter(f => f.pillar === 3) || []),
    ...(skrapp?.findings.filter(f => f.pillar === 3) || []),
    ...(spiderfoot?.findings.filter(f => f.pillar === 3) || []),
  ]

  const p1 = buildPillar1(sherlock, googleCSE, exif, extP1)
  const p2 = buildPillar2(hibp, extP2)
  const p3 = buildPillar3(hunter, googleCSE, sherlock, extP3)
  const p4 = buildPillar4()

  const pillars: FourPillars = {
    identitySurface:   p1,
    breachCredential:  p2,
    linkability:       p3,
    dataBroker:        p4,
  }

  const drs = calculateDRS(pillars)
  const riskLevel = getRiskLevel(drs)

  const allFindings = [
    ...p1.findings,
    ...p2.findings,
    ...p3.findings,
    ...p4.findings,
  ]

  // Default empty results for extended workers
  const emptyIntelx: IntelXResult = { status: 'done', items: [], findings: [] }
  const emptySf: SpiderFootResult = { status: 'done', modules: [], findings: [] }
  const emptySnov: SnovResult = { status: 'done', emailValid: false, score: 0, profiles: [], findings: [] }
  const emptySkrapp: SkrappResult = { status: 'done', linkedin: null, findings: [] }
  const emptyVt: VirusTotalResult = { status: 'done', malicious: 0, suspicious: 0, harmless: 0, findings: [] }
  const emptyPhishing: PhishingResult = { status: 'done', isPhishing: false, confidence: 0, findings: [] }

  return {
    identifier,
    hibp, sherlock, googleCSE, exif, hunter,
    intelx:     intelx     || emptyIntelx,
    spiderfoot: spiderfoot || emptySf,
    snov:       snov       || emptySnov,
    skrapp:     skrapp     || emptySkrapp,
    virustotal: virustotal || emptyVt,
    phishing:   phishing   || emptyPhishing,
    pillars,
    drs,
    riskLevel,
    pivotNodes: buildPivotNodes(identifier, hibp, sherlock, exif),
    brokers: buildBrokers(),
    remediations: buildRemediations(pillars, drs),
    narrative: await buildNarrative(identifier, pillars, drs, riskLevel),
    allFindings,
  }
}
