'use client'

import { useEffect, useRef, useState } from 'react'
import type { WorkerStatus } from '@/lib/types'

type Workers = Record<'hibp' | 'sherlock' | 'googleCSE' | 'exif' | 'hunter' | 'intelx' | 'spiderfoot' | 'snov' | 'skrapp' | 'virustotal' | 'phishing', { status: WorkerStatus; count: string }>

const WORKER_LOGS: Record<string, string[]> = {
  hibp:        ['Connecting to breach database...', 'Querying HaveIBeenPwned API...', 'Cross-referencing email hash...', 'Decrypting breach record metadata...'],
  sherlock:    ['Initialising platform enumeration...', 'Probing GitHub API... 200 OK', 'Querying Reddit user API...', 'Checking Dev.to, Replit, Codepen...', 'Resolving HackerNews uid...'],
  googleCSE:   ['Invoking Google Custom Search Engine...', 'Parsing indexed result snippets...', 'Extracting PII signals from pages...', 'Flagging location-bearing content...'],
  exif:        ['Scanning public photo metadata...', 'Parsing EXIF GPS coordinates...', 'Correlating device fingerprint...'],
  hunter:      ['Querying Hunter.io domain API...', 'Resolving MX records...', 'Extracting social profile links...'],
  intelx:      ['Connecting to Intelligence X API...', 'Querying dark web index...', 'Scanning leak archives & forums...', 'Decoding base64 credential dumps...'],
  spiderfoot:  ['Spawning SpiderFoot OSINT daemon...', 'Running 200+ passive recon modules...', 'Correlating domain registrant data...', 'Aggregating threat intelligence feeds...'],
  snov:        ['Querying Snov.io email verifier...', 'Resolving deliverability score...', 'Extracting LinkedIn profile links...'],
  skrapp:      ['Probing Skrapp.io API...', 'Scraping professional profile data...'],
  virustotal:  ['Querying VirusTotal domain report...', 'Checking 90 AV vendor signatures...', 'Extracting reputation heuristics...'],
  phishing:    ['Running phishing heuristic scan...', 'Analysing domain age & WHOIS...', 'Checking URL entropy patterns...'],
}

const WORKER_META: { id: keyof Workers; label: string; prefix: string }[] = [
  { id: 'hibp',       label: 'hibp',       prefix: '[HIBP]     ' },
  { id: 'sherlock',   label: 'sherlock',   prefix: '[SHERLOCK] ' },
  { id: 'googleCSE',  label: 'google-cse', prefix: '[GSE]      ' },
  { id: 'exif',       label: 'exiftool',   prefix: '[EXIF]     ' },
  { id: 'hunter',     label: 'hunter',     prefix: '[HUNTER]   ' },
  { id: 'intelx',     label: 'intel-x',    prefix: '[INTELX]   ' },
  { id: 'spiderfoot', label: 'spiderfoot', prefix: '[SF]       ' },
  { id: 'snov',       label: 'snov',       prefix: '[SNOV]     ' },
  { id: 'skrapp',     label: 'skrapp',     prefix: '[SKRAPP]   ' },
  { id: 'virustotal', label: 'virustotal', prefix: '[VT]       ' },
  { id: 'phishing',   label: 'phishing',   prefix: '[PHISH]    ' },
]

interface LogLine {
  text: string
  color: string
  key: number
}

interface CinematicLoaderProps {
  workers: Workers
  progress: number
}

export function CinematicLoader({ workers, progress }: CinematicLoaderProps) {
  const [lines, setLines] = useState<LogLine[]>([
    { text: '$ pixie --target <email> --workers 11 --mode full', color: '#00d4ff', key: 0 },
    { text: 'PIXIE v1.0 — Personal Privacy Intelligence Engine', color: '#2ed573', key: 1 },
    { text: 'Initialising OSINT pipeline...', color: '#8899aa', key: 2 },
  ])
  const [cursor, setCursor] = useState(true)
  const [scanLine, setScanLine] = useState(0)
  const terminalRef = useRef<HTMLDivElement>(null)
  const counterRef = useRef(3)
  const addedWorkers = useRef<Set<string>>(new Set())

  // Blinking cursor
  useEffect(() => {
    const t = setInterval(() => setCursor(v => !v), 530)
    return () => clearInterval(t)
  }, [])

  // Scan line animation
  useEffect(() => {
    const t = setInterval(() => setScanLine(v => (v + 1) % 100), 30)
    return () => clearInterval(t)
  }, [])

  // Feed terminal lines from worker status
  useEffect(() => {
    WORKER_META.forEach(({ id, prefix }) => {
      const ws = workers[id]
      if (ws.status === 'running' && !addedWorkers.current.has(`${id}-run`)) {
        addedWorkers.current.add(`${id}-run`)
        const logs = WORKER_LOGS[id] || []
        logs.forEach((log, i) => {
          setTimeout(() => {
            setLines(prev => [...prev.slice(-60), {
              text: `${prefix}${log}`,
              color: i === 0 ? '#00d4ff' : '#8899aa',
              key: counterRef.current++,
            }])
          }, i * 280)
        })
      }
      if (ws.status === 'done' && !addedWorkers.current.has(`${id}-done`)) {
        addedWorkers.current.add(`${id}-done`)
        setLines(prev => [...prev.slice(-60), {
          text: `${prefix}✓ COMPLETE${ws.count ? ` — ${ws.count}` : ''}`,
          color: '#2ed573',
          key: counterRef.current++,
        }])
      }
    })
  }, [workers])

  // Auto-scroll to bottom
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight
    }
  }, [lines])

  const doneCount = WORKER_META.filter(w => workers[w.id].status === 'done').length
  const runningWorker = WORKER_META.find(w => workers[w.id].status === 'running')

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden"
      style={{ background: '#05080c' }}
    >
      {/* Animated grid background */}
      <div className="absolute inset-0" style={{
        backgroundImage: 'linear-gradient(rgba(0,212,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(0,212,255,0.04) 1px, transparent 1px)',
        backgroundSize: '32px 32px',
      }} />

      {/* Scanline sweep effect */}
      <div
        className="absolute inset-x-0 pointer-events-none"
        style={{
          top: `${scanLine}%`,
          height: '2px',
          background: 'linear-gradient(90deg, transparent, rgba(0,212,255,0.08), transparent)',
          transition: 'none',
        }}
      />

      {/* Radial glow behind terminal */}
      <div className="absolute inset-0 pointer-events-none" style={{
        background: 'radial-gradient(ellipse 60% 50% at 50% 50%, rgba(0,212,255,0.05) 0%, transparent 70%)',
      }} />

      <div className="relative z-10 w-full max-w-3xl px-6 flex flex-col gap-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl grid place-items-center font-extrabold text-black text-base flex-shrink-0"
              style={{ background: '#00d4ff', boxShadow: '0 0 20px #00d4ff55' }}>P</div>
            <div>
              <div className="font-extrabold tracking-[.12em] text-lg" style={{ color: '#00d4ff' }}>PIXIE</div>
              <div className="font-mono text-[9px] tracking-[.18em]" style={{ color: '#445566' }}>INTELLIGENCE ENGINE</div>
            </div>
          </div>
          <div className="font-mono text-[11px]" style={{ color: '#445566' }}>
            {doneCount}/{WORKER_META.length} COMPLETE
          </div>
        </div>

        {/* Terminal */}
        <div
          className="rounded-xl border overflow-hidden"
          style={{
            background: 'rgba(0,0,0,0.7)',
            borderColor: 'rgba(0,212,255,0.15)',
            boxShadow: '0 0 40px rgba(0,212,255,0.08), inset 0 0 40px rgba(0,0,0,0.5)',
            backdropFilter: 'blur(12px)',
          }}
        >
          {/* Title bar */}
          <div className="flex items-center gap-2 px-4 py-3 border-b" style={{ borderColor: 'rgba(0,212,255,0.1)', background: 'rgba(0,212,255,0.04)' }}>
            <div className="w-3 h-3 rounded-full" style={{ background: '#ff5f57' }} />
            <div className="w-3 h-3 rounded-full" style={{ background: '#febc2e' }} />
            <div className="w-3 h-3 rounded-full" style={{ background: '#28c840' }} />
            <span className="ml-2 font-mono text-[11px]" style={{ color: '#445566' }}>pixie-osint — bash — 120×36</span>
          </div>

          {/* Log output */}
          <div
            ref={terminalRef}
            className="p-4 font-mono text-[11px] leading-relaxed overflow-y-auto"
            style={{ height: 320, scrollBehavior: 'smooth' }}
          >
            {lines.map(line => (
              <div key={line.key} style={{ color: line.color }}>
                {line.text}
              </div>
            ))}
            <span className="inline-block font-mono text-[11px]" style={{ color: '#00d4ff' }}>
              ▸ {cursor ? '█' : ' '}
            </span>
          </div>
        </div>

        {/* Worker status grid */}
        <div className="grid grid-cols-6 gap-2">
          {WORKER_META.map(({ id, label }) => {
            const ws = workers[id]
            const color = ws.status === 'done' ? '#2ed573' : ws.status === 'running' ? '#00d4ff' : '#1a2530'
            const textColor = ws.status === 'done' ? '#2ed573' : ws.status === 'running' ? '#00d4ff' : '#334455'
            return (
              <div
                key={id}
                className="rounded-lg px-2 py-1.5 text-center border transition-all duration-500"
                style={{
                  background: ws.status === 'running' ? 'rgba(0,212,255,0.08)' : ws.status === 'done' ? 'rgba(46,213,115,0.06)' : 'rgba(0,0,0,0.4)',
                  borderColor: color,
                  boxShadow: ws.status === 'running' ? `0 0 12px ${color}44` : 'none',
                }}
              >
                <div className="font-mono text-[8px] font-bold tracking-wider" style={{ color: textColor }}>{label}</div>
                <div className="font-mono text-[8px] mt-0.5" style={{ color: textColor }}>
                  {ws.status === 'done' ? '✓' : ws.status === 'running' ? '…' : '—'}
                </div>
              </div>
            )
          })}
        </div>

        {/* Progress bar */}
        <div>
          <div className="flex justify-between items-center mb-1.5">
            <span className="font-mono text-[10px]" style={{ color: '#445566' }}>
              {runningWorker ? `scanning ${runningWorker.label}...` : progress >= 95 ? 'finalising risk score...' : 'initialising...'}
            </span>
            <span className="font-mono text-[10px] font-bold" style={{ color: '#00d4ff' }}>{progress}%</span>
          </div>
          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(0,212,255,0.1)' }}>
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${progress}%`,
                background: 'linear-gradient(90deg, #0099bb, #00d4ff)',
                boxShadow: '0 0 12px rgba(0,212,255,0.6)',
              }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
