// ─── SCAN TYPES ──────────────────────────────────────────────────────────────

export type IdentifierType = 'email' | 'username'

export type ScanStatus = 'pending' | 'running' | 'complete' | 'error'

export type WorkerStatus = 'idle' | 'running' | 'done' | 'error'

export type Severity = 'critical' | 'high' | 'medium' | 'low'

export type RiskLevel = 'CRITICAL' | 'HIGH' | 'MODERATE' | 'LOW'

// ─── RAW FINDING ─────────────────────────────────────────────────────────────

export interface RawFinding {
  id: string
  pillar: 1 | 2 | 3 | 4
  category: string
  title: string
  description: string
  severity: Severity
  source: string
  metadata?: Record<string, unknown>
}

// ─── WORKER RESULTS ──────────────────────────────────────────────────────────

export interface HibpBreach {
  name: string
  domain: string
  breachDate: string
  addedDate: string
  pwnCount: number
  dataClasses: string[]
  isVerified: boolean
  isSensitive: boolean
}

export interface HibpResult {
  status: WorkerStatus
  breaches: HibpBreach[]
  pasteCount: number
  findings: RawFinding[]
}

export interface PlatformMatch {
  platform: string
  url: string
  category: 'social' | 'developer' | 'finance' | 'gaming' | 'dating' | 'forum' | 'other'
  confidence: 'high' | 'medium' | 'low'
  riskNote: string
}

export interface SherlockResult {
  status: WorkerStatus
  matches: PlatformMatch[]
  findings: RawFinding[]
}

export interface WebPage {
  title: string
  url: string
  snippet: string
  hasPII: boolean
  hasLocation: boolean
}

export interface GoogleCSEResult {
  status: WorkerStatus
  pages: WebPage[]
  findings: RawFinding[]
}

export interface ExifData {
  file: string
  hasGPS: boolean
  lat?: number
  lng?: number
  deviceModel?: string
  software?: string
  timestamp?: string
}

export interface ExifResult {
  status: WorkerStatus
  exposures: ExifData[]
  findings: RawFinding[]
}

export interface SocialProfile {
  platform: string
  profileUrl: string
  displayName: string
  linkedEmails: string[]
}

export interface HunterResult {
  status: WorkerStatus
  profiles: SocialProfile[]
  findings: RawFinding[]
}

// ─── EXTENDED OSINT WORKERS ──────────────────────────────────────────────────
// Re-export types from osint-extended workers

export type { IntelXResult, IntelXItem } from '@/lib/workers/osint-extended'
export type { SpiderFootResult, SpiderFootModule } from '@/lib/workers/osint-extended'
export type { SnovResult, SnovProfile } from '@/lib/workers/osint-extended'
export type { SkrappResult, LinkedInProfile } from '@/lib/workers/osint-extended'

// ─── THREAT INTEL WORKERS ────────────────────────────────────────────────────
// Types for Domain/URL/Threat intelligence workers

export interface VirusTotalResult {
  status: WorkerStatus
  malicious: number
  suspicious: number
  harmless: number
  findings: RawFinding[]
}

export interface PhishingResult {
  status: WorkerStatus
  isPhishing: boolean
  confidence: number
  findings: RawFinding[]
}

// ─── PILLAR SCORES ────────────────────────────────────────────────────────────

export interface PillarScore {
  score: number          // 0–100
  label: string
  rawCount: number
  findings: RawFinding[]
}

export interface FourPillars {
  identitySurface: PillarScore    // Pillar 1
  breachCredential: PillarScore   // Pillar 2
  linkability: PillarScore        // Pillar 3
  dataBroker: PillarScore         // Pillar 4
}

// ─── PIVOT CHAIN ─────────────────────────────────────────────────────────────

export interface PivotNode {
  id: string
  label: string
  type: 'center' | 'primary' | 'secondary'
  pillar: 1 | 2 | 3 | 4
  connects: string[]
  riskNote: string
}

// ─── DATA BROKER ─────────────────────────────────────────────────────────────

export interface BrokerRecord {
  broker: string
  dataFound: string[]
  riskLevel: Severity
  status: 'active' | 'partial' | 'opted-out'
  optOutUrl: string
}

// ─── REMEDIATION ─────────────────────────────────────────────────────────────

export interface RemediationStep {
  id: string
  title: string
  description: string
  pillar: 1 | 2 | 3 | 4
  severity: Severity
  effort: 'quick' | 'moderate' | 'involved'
  done: boolean
}

// ─── NARRATIVE ───────────────────────────────────────────────────────────────

export interface AttackNarrative {
  summary: string
  attackChain: string[]
  topThreats: string[]
}

// ─── FULL SCAN RESULT ────────────────────────────────────────────────────────

export interface ScanResult {
  scanId: string
  identifier: string
  identifierType: IdentifierType
  status: ScanStatus
  startedAt: string
  completedAt?: string

  // Worker results — Core
  hibp: HibpResult
  sherlock: SherlockResult
  googleCSE: GoogleCSEResult
  exif: ExifResult
  hunter: HunterResult

  // Worker results — Extended OSINT
  intelx: import('@/lib/workers/osint-extended').IntelXResult
  spiderfoot: import('@/lib/workers/osint-extended').SpiderFootResult
  snov: import('@/lib/workers/osint-extended').SnovResult
  skrapp: import('@/lib/workers/osint-extended').SkrappResult

  // Worker results — Threat Intel
  virustotal: VirusTotalResult
  phishing: PhishingResult

  // Aggregated
  pillars: FourPillars
  drs: number
  riskLevel: RiskLevel
  pivotNodes: PivotNode[]
  brokers: BrokerRecord[]
  remediations: RemediationStep[]
  narrative: AttackNarrative

  allFindings: RawFinding[]
}

// ─── WORKER STREAM EVENT ─────────────────────────────────────────────────────

export interface WorkerEvent {
  worker: 'hibp' | 'sherlock' | 'googleCSE' | 'exif' | 'hunter' | 'intelx' | 'spiderfoot' | 'snov' | 'skrapp' | 'virustotal' | 'phishing' | 'scoring' | 'narrative'
  status: WorkerStatus
  data?: Partial<ScanResult>
  message?: string
}
