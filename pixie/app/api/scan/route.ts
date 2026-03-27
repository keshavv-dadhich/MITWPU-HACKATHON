import { NextRequest } from 'next/server'
import { runHibpWorker } from '@/lib/workers/hibp'
import { runSherlockWorker } from '@/lib/workers/sherlock'
import { runGoogleCSEWorker, runExifWorker, runHunterWorker } from '@/lib/workers/enrichment'
import { runIntelXWorker, runSpiderFootWorker, runSnovWorker, runSkrappWorker } from '@/lib/workers/osint-extended'
import { runVirusTotalWorker, runPhishingWorker } from '@/lib/workers/threat-intel'
import { aggregateResults } from '@/lib/scoring'
import type {
  WorkerEvent, HibpResult, SherlockResult, GoogleCSEResult, ExifResult, HunterResult,
  VirusTotalResult, PhishingResult
} from '@/lib/types'
import type { IntelXResult, SpiderFootResult, SnovResult, SkrappResult } from '@/lib/workers/osint-extended'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function encodeEvent(event: WorkerEvent): string {
  return `data: ${JSON.stringify(event)}\n\n`
}

// Default empty results for graceful degradation
const EMPTY_HIBP: HibpResult = { status: 'done', breaches: [], pasteCount: 0, findings: [] }
const EMPTY_SHERLOCK: SherlockResult = { status: 'done', matches: [], findings: [] }
const EMPTY_GOOGLE: GoogleCSEResult = { status: 'done', pages: [], findings: [] }
const EMPTY_EXIF: ExifResult = { status: 'done', exposures: [], findings: [] }
const EMPTY_HUNTER: HunterResult = { status: 'done', profiles: [], findings: [] }
const EMPTY_INTELX: IntelXResult = { status: 'done', items: [], findings: [] }
const EMPTY_SPIDERFOOT: SpiderFootResult = { status: 'done', modules: [], findings: [] }
const EMPTY_SNOV: SnovResult = { status: 'done', emailValid: false, score: 0, profiles: [], findings: [] }
const EMPTY_SKRAPP: SkrappResult = { status: 'done', linkedin: null, findings: [] }
const EMPTY_VIRUSTOTAL: VirusTotalResult = { status: 'done', malicious: 0, suspicious: 0, harmless: 0, findings: [] }
const EMPTY_PHISHING: PhishingResult = { status: 'done', isPhishing: false, confidence: 0, findings: [] }

export async function POST(req: NextRequest) {
  const { identifier } = await req.json()

  if (!identifier || typeof identifier !== 'string') {
    return new Response(JSON.stringify({ error: 'identifier required' }), { status: 400 })
  }

  const clean = identifier.trim().toLowerCase()

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: WorkerEvent) => {
        try {
          controller.enqueue(encoder.encode(encodeEvent(event)))
        } catch { /* stream closed */ }
      }

      // Results accumulator
      let hibp: HibpResult = EMPTY_HIBP
      let sherlock: SherlockResult = EMPTY_SHERLOCK
      let googleCSE: GoogleCSEResult = EMPTY_GOOGLE
      let exif: ExifResult = EMPTY_EXIF
      let hunter: HunterResult = EMPTY_HUNTER
      let intelx: IntelXResult = EMPTY_INTELX
      let spiderfoot: SpiderFootResult = EMPTY_SPIDERFOOT
      let snov: SnovResult = EMPTY_SNOV
      let skrapp: SkrappResult = EMPTY_SKRAPP
      let virustotal: VirusTotalResult = EMPTY_VIRUSTOTAL
      let phishing: PhishingResult = EMPTY_PHISHING

      // ── Fan out ALL 11 workers in parallel ─────────────────────────────────
      send({ worker: 'hibp',        status: 'running', message: 'Checking breach databases...' })
      send({ worker: 'sherlock',    status: 'running', message: 'Enumerating platforms...' })
      send({ worker: 'googleCSE',   status: 'running', message: 'Scanning web presence...' })
      send({ worker: 'exif',        status: 'running', message: 'Checking photo metadata...' })
      send({ worker: 'hunter',      status: 'running', message: 'Enriching identity...' })
      send({ worker: 'intelx',      status: 'running', message: 'Searching dark web & leaks...' })
      send({ worker: 'spiderfoot',  status: 'running', message: 'Running OSINT aggregation...' })
      send({ worker: 'snov',        status: 'running', message: 'Verifying email & profiling...' })
      send({ worker: 'skrapp',      status: 'running', message: 'Extracting LinkedIn data...' })
      send({ worker: 'virustotal',  status: 'running', message: 'Checking threat infrastructure...' })
      send({ worker: 'phishing',    status: 'running', message: 'Analyzing domain reputation...' })

      // Each worker streams result independently as it completes
      const workerPromises = [
        (async () => {
          try {
            hibp = await runHibpWorker(clean)
            send({ worker: 'hibp', status: 'done', data: { hibp } })
          } catch (err) {
            console.error('HIBP worker failed:', err)
            send({ worker: 'hibp', status: 'error', message: String(err) })
          }
        })(),

        (async () => {
          try {
            sherlock = await runSherlockWorker(clean)
            send({ worker: 'sherlock', status: 'done', data: { sherlock } })
          } catch (err) {
            console.error('Sherlock worker failed:', err)
            send({ worker: 'sherlock', status: 'error', message: String(err) })
          }
        })(),

        (async () => {
          try {
            googleCSE = await runGoogleCSEWorker(clean)
            send({ worker: 'googleCSE', status: 'done', data: { googleCSE } })
          } catch (err) {
            console.error('Google CSE worker failed:', err)
            send({ worker: 'googleCSE', status: 'error', message: String(err) })
          }
        })(),

        (async () => {
          try {
            exif = await runExifWorker(clean)
            send({ worker: 'exif', status: 'done', data: { exif } })
          } catch (err) {
            console.error('ExifTool worker failed:', err)
            send({ worker: 'exif', status: 'error', message: String(err) })
          }
        })(),

        (async () => {
          try {
            hunter = await runHunterWorker(clean)
            send({ worker: 'hunter', status: 'done', data: { hunter } })
          } catch (err) {
            console.error('Hunter worker failed:', err)
            send({ worker: 'hunter', status: 'error', message: String(err) })
          }
        })(),

        (async () => {
          try {
            intelx = await runIntelXWorker(clean)
            send({ worker: 'intelx', status: 'done', data: { intelx } })
          } catch (err) {
            console.error('IntelX worker failed:', err)
            send({ worker: 'intelx', status: 'error', message: String(err) })
          }
        })(),

        (async () => {
          try {
            spiderfoot = await runSpiderFootWorker(clean)
            send({ worker: 'spiderfoot', status: 'done', data: { spiderfoot } })
          } catch (err) {
            console.error('SpiderFoot worker failed:', err)
            send({ worker: 'spiderfoot', status: 'error', message: String(err) })
          }
        })(),

        (async () => {
          try {
            snov = await runSnovWorker(clean)
            send({ worker: 'snov', status: 'done', data: { snov } })
          } catch (err) {
            console.error('Snov worker failed:', err)
            send({ worker: 'snov', status: 'error', message: String(err) })
          }
        })(),

        (async () => {
          try {
            skrapp = await runSkrappWorker(clean)
            send({ worker: 'skrapp', status: 'done', data: { skrapp } })
          } catch (err) {
            console.error('Skrapp worker failed:', err)
            send({ worker: 'skrapp', status: 'error', message: String(err) })
          }
        })(),

        (async () => {
          try {
            virustotal = await runVirusTotalWorker(clean)
            send({ worker: 'virustotal', status: 'done', data: { virustotal } })
          } catch (err) {
            console.error('VT worker failed:', err)
            send({ worker: 'virustotal', status: 'error', message: String(err) })
          }
        })(),

        (async () => {
          try {
            phishing = await runPhishingWorker(clean)
            send({ worker: 'phishing', status: 'done', data: { phishing } })
          } catch (err) {
            console.error('Phishing worker failed:', err)
            send({ worker: 'phishing', status: 'error', message: String(err) })
          }
        })(),
      ]

      // Wait for ALL workers to complete
      await Promise.all(workerPromises)

      // ── Scoring engine ────────────────────────────────────────────────────
      send({ worker: 'scoring', status: 'running', message: 'Calculating Digital Risk Score...' })

      const aggregated = aggregateResults(
        clean, hibp, sherlock, googleCSE, exif, hunter,
        intelx, spiderfoot, snov, skrapp, virustotal, phishing
      )
      send({ worker: 'scoring', status: 'done', data: aggregated })

      // ── Narrative ─────────────────────────────────────────────────────────
      send({ worker: 'narrative', status: 'running', message: 'Building attack narrative...' })

      // ── Final complete event ──────────────────────────────────────────────
      const finalResult = {
        ...aggregated,
        scanId: 'PIX-' + Math.random().toString(36).substring(2, 8).toUpperCase(),
        identifierType: (clean.includes('@') ? 'email' : 'username') as 'email' | 'username',
        status: 'complete' as const,
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
      }

      send({ worker: 'narrative', status: 'done', data: finalResult })

      controller.close()
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}
