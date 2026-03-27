'use client'

import { useState, useCallback } from 'react'
import type { ScanResult, WorkerStatus, WorkerEvent } from '@/lib/types'
import { DRSRing } from '@/components/DRSRing'
import { ThreatGraph } from '@/components/ThreatGraph'
import { CinematicLoader } from '@/components/CinematicLoader'
import { BreachTimeline } from '@/components/BreachTimeline'
import { PlatformDonut } from '@/components/PlatformDonut'
import {
  Badge, Card, CardHeader, SectionHead,
  PillarCard, FindingItem, RemedItem, WorkerCard
} from '@/components/ui'

type Workers = Record<'hibp' | 'sherlock' | 'googleCSE' | 'exif' | 'hunter' | 'intelx' | 'spiderfoot' | 'snov' | 'skrapp' | 'virustotal' | 'phishing', { status: WorkerStatus; count: string }>

// ─── LANDING ─────────────────────────────────────────────────────────────────

function LandingPage({ onScan }: { onScan: (id: string) => void }) {
  const [value, setValue] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (value.trim()) { setLoading(true); onScan(value.trim()) }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 relative" style={{ background: 'var(--bg)' }}>
      <div className="absolute inset-0 opacity-[0.035]" style={{
        backgroundImage: 'linear-gradient(var(--bor2) 1px,transparent 1px),linear-gradient(90deg,var(--bor2) 1px,transparent 1px)',
        backgroundSize: '48px 48px'
      }} />
      <div className="relative z-10 flex flex-col items-center max-w-lg w-full">
        <div className="flex items-center gap-3 mb-12">
          <div className="w-10 h-10 rounded-xl grid place-items-center font-bold text-lg text-black flex-shrink-0" style={{ background: 'var(--cyan)' }}>P</div>
          <div>
            <div className="text-xl font-extrabold tracking-[.08em]">PIXIE</div>
            <div className="font-mono text-[10px] tracking-[.14em]" style={{ color: 'var(--muted)' }}>PERSONAL PRIVACY INTELLIGENCE ENGINE</div>
          </div>
        </div>

        <h1 className="text-4xl font-extrabold text-center leading-tight mb-3">
          See yourself the way<br />
          <span style={{ color: 'var(--cyan)' }}>an attacker does.</span>
        </h1>
        <p className="text-center text-sm leading-relaxed mb-10" style={{ color: 'var(--muted)' }}>
          Enter your email or username. PIXIE maps your digital footprint across 5 OSINT sources,
          scores your exposure across 4 risk pillars, and gives you a clear plan to shrink your attack surface.
        </p>

        <form onSubmit={handleSubmit} className="w-full flex flex-col gap-3">
          <div className="flex gap-2">
            <input
              type="text" value={value} onChange={e => setValue(e.target.value)}
              placeholder="email@example.com  or  username"
              className="flex-1 font-mono text-sm px-4 py-3 rounded-lg outline-none transition-all"
              style={{ background: 'var(--surface)', border: '1px solid var(--bor2)', color: 'var(--text)' }}
              onFocus={e => (e.target.style.borderColor = 'var(--cyan)')}
              onBlur={e => (e.target.style.borderColor = 'var(--bor2)')}
            />
            <button type="submit" disabled={!value.trim() || loading}
              className="font-bold tracking-wider px-5 py-3 rounded-lg transition-opacity disabled:opacity-40"
              style={{ background: 'var(--cyan)', color: '#000', fontSize: 13 }}>
              {loading ? '...' : 'SCAN →'}
            </button>
          </div>
          <p className="font-mono text-[10px] text-center" style={{ color: 'var(--muted2)' }}>
            Only scan identifiers you own. All data stays in your browser session.
          </p>
        </form>

        <div className="flex gap-2 px-8 mt-10 flex-wrap justify-center">
          {[['#00d4ff', 'P1 Identity Surface'], ['#ff6b35', 'P2 Breach & Credentials'], ['#a855f7', 'P3 Linkability'], ['#10b981', 'P4 Data Brokers']].map(([color, label]) => (
            <span key={label} className="font-mono text-[10px] px-2.5 py-1 rounded-full border"
              style={{ color, borderColor: `${color}44`, background: `${color}0f` }}>{label}</span>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── LOADING — replaced by CinematicLoader component ─────────────────────────

// ─── DASHBOARD ────────────────────────────────────────────────────────────────

function Dashboard({ result, onRescan }: { result: ScanResult; onRescan: () => void }) {
  const [remeds, setRemeds] = useState(result.remediations)
  const doneCount = remeds.filter(r => r.done).length
  const toggleRemed = (id: string) => setRemeds(prev => prev.map(r => r.id === id ? { ...r, done: !r.done } : r))

  const riskColor =
    result.riskLevel === 'CRITICAL' ? 'var(--danger)' :
      result.riskLevel === 'HIGH' ? 'var(--warn)' :
        result.riskLevel === 'MODERATE' ? 'var(--cyan)' : 'var(--ok)'

  const exportToPDF = async () => {
    const { default: html2canvas } = await import('html2canvas')
    const { default: jsPDF } = await import('jspdf')

    const el = document.getElementById('dashboard-content')
    if (!el) return

    // Capture the FULL element — not just the visible viewport
    const canvas = await html2canvas(el, {
      backgroundColor: '#080c10',
      scale: 1.5,
      useCORS: true,
      logging: false,
      width: el.scrollWidth,
      height: el.scrollHeight,
      windowWidth: el.scrollWidth,
      windowHeight: el.scrollHeight,
    })

    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
    const pageW = pdf.internal.pageSize.getWidth()   // 210 mm
    const pageH = pdf.internal.pageSize.getHeight()  // 297 mm
    const HEADER_H = 22  // mm reserved for branding header on each page
    const contentPageH = pageH - HEADER_H

    // How many PDF mm per canvas pixel (width axis)
    const mmPerPx = pageW / canvas.width
    // How many canvas pixels fit in one content page height
    const contentPagePx = Math.floor(contentPageH / mmPerPx)

    const totalPages = Math.ceil(canvas.height / contentPagePx)

    for (let page = 0; page < totalPages; page++) {
      if (page > 0) pdf.addPage()

      // ── Header bar ────────────────────────────────────────────
      pdf.setFillColor(13, 18, 25)
      pdf.rect(0, 0, pageW, HEADER_H, 'F')
      pdf.setFont('helvetica', 'bold')
      pdf.setFontSize(10)
      pdf.setTextColor(0, 212, 255)
      pdf.text('PIXIE — PERSONAL PRIVACY INTELLIGENCE ENGINE', 8, 10)
      pdf.setFontSize(7)
      pdf.setTextColor(90, 122, 150)
      pdf.text(
        `Target: ${result.identifier}  |  Risk: ${result.riskLevel}  |  DRS: ${result.drs}/100  |  Page ${page + 1}/${totalPages}`,
        8, 17,
      )

      // ── Slice the master canvas for this page ─────────────────
      const srcY = page * contentPagePx
      const srcH = Math.min(contentPagePx, canvas.height - srcY)

      const sliceCanvas = document.createElement('canvas')
      sliceCanvas.width = canvas.width
      sliceCanvas.height = srcH
      const ctx = sliceCanvas.getContext('2d')!
      ctx.drawImage(canvas, 0, srcY, canvas.width, srcH, 0, 0, canvas.width, srcH)

      const sliceImg = sliceCanvas.toDataURL('image/jpeg', 0.92)
      const sliceRenderedH = (srcH / canvas.width) * pageW
      pdf.addImage(sliceImg, 'JPEG', 0, HEADER_H, pageW, sliceRenderedH, '', 'FAST')
    }

    pdf.save(`PIXIE-Report-${result.identifier.replace(/[@.]/g, '_')}-${new Date().toISOString().slice(0, 10)}.pdf`)
  }

  return (
    <div className="flex min-h-screen" style={{ background: 'var(--bg)' }}>

      {/* SIDEBAR */}
      <aside className="w-56 flex-shrink-0 flex flex-col border-r sticky top-0 h-screen overflow-y-auto"
        style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}>
        <div className="flex items-center gap-2.5 px-5 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
          <div className="w-7 h-7 rounded-lg grid place-items-center font-bold text-sm text-black flex-shrink-0" style={{ background: 'var(--cyan)' }}>P</div>
          <div>
            <div className="font-bold tracking-wider text-sm">PIXIE</div>
            <div className="font-mono text-[8px] tracking-widest" style={{ color: 'var(--muted)' }}>INTELLIGENCE ENGINE</div>
          </div>
        </div>

        <nav className="flex-1 py-4">
          {[
            { label: 'Overview', color: 'var(--cyan)', id: 'sec-overview' },
            { label: 'Breach & Creds', color: 'var(--orange)', id: 'sec-breach' },
            { label: 'Identity Surface', color: 'var(--cyan)', id: 'sec-identity' },
            { label: 'Linkability', color: 'var(--purple)', id: 'sec-link' },
            { label: 'Data Brokers', color: 'var(--green)', id: 'sec-broker' },
            { label: 'Remediation', color: 'var(--warn)', id: 'sec-remed' },
          ].map(item => (
            <button key={item.id}
              onClick={() => document.getElementById(item.id)?.scrollIntoView({ behavior: 'smooth' })}
              className="w-full flex items-center gap-2.5 px-5 py-2.5 text-left text-xs font-semibold tracking-wider hover:bg-white/[.03] transition-colors"
              style={{ color: 'var(--muted)' }}>
              <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: item.color }} />
              {item.label}
            </button>
          ))}

          <div className="px-5 pt-5 pb-1 font-mono text-[9px] tracking-[.14em]" style={{ color: 'var(--muted2)' }}>WORKERS</div>
          {[
            { label: 'HIBP', color: 'var(--orange)', count: `${result.hibp.breaches.length} breaches` },
            { label: 'Sherlock', color: 'var(--cyan)', count: `${result.sherlock.matches.length} platforms` },
            { label: 'Google CSE', color: 'var(--green)', count: `${result.googleCSE.pages.length} pages` },
            { label: 'ExifTool', color: 'var(--warn)', count: `${result.exif.exposures.filter(e => e.hasGPS).length} GPS` },
            { label: 'Hunter.io', color: 'var(--purple)', count: `${result.hunter.profiles.length} profiles` },
            { label: 'Intel X', color: 'var(--danger)', count: `${result.intelx.items.length} items` },
            { label: 'SpiderFoot', color: 'var(--cyan)', count: `${result.spiderfoot.modules.length} modules` },
            { label: 'Snov.io', color: 'var(--green)', count: `${result.snov.profiles.length} profiles` },
            { label: 'Skrapp.io', color: 'var(--purple)', count: result.skrapp.linkedin ? '1 profile' : '0' },
            { label: 'VirusTotal', color: 'var(--danger)', count: `${result.virustotal.malicious} malicious` },
            { label: 'Phishing', color: 'var(--orange)', count: result.phishing.isPhishing ? 'Flagged' : 'Clean' },
          ].map(w => (
            <div key={w.label} className="flex items-center gap-2.5 px-5 py-2 font-mono text-[10px]">
              <div className="w-1.5 h-1.5 rounded-full" style={{ background: w.color }} />
              <span style={{ color: 'var(--muted)', flex: 1 }}>{w.label}</span>
              <span style={{ color: 'var(--ok)' }}>✓ {w.count}</span>
            </div>
          ))}
        </nav>

        <div className="p-4 border-t" style={{ borderColor: 'var(--border)' }}>
          <button onClick={onRescan}
            className="w-full font-bold tracking-wider text-xs py-2.5 rounded-lg hover:opacity-80 transition-opacity"
            style={{ background: 'var(--surface)', border: '1px solid var(--bor2)', color: 'var(--muted)' }}>
            ← NEW SCAN
          </button>
        </div>
      </aside>

      {/* MAIN */}
      <main className="flex-1 overflow-y-auto px-8 py-7">

        {/* Sticky topbar */}
        <div className="flex items-center justify-between mb-6 sticky top-0 z-10 -mx-8 px-8 py-3 backdrop-blur-sm"
          style={{ background: 'rgba(8,12,16,.88)', borderBottom: '1px solid var(--border)' }}>
          <div>
            <div className="font-mono text-[10px]" style={{ color: 'var(--muted)' }}>TARGET</div>
            <div className="font-mono text-sm font-bold">{result.identifier}</div>
          </div>
          <div className="flex items-center gap-3">
            <span className="font-mono text-[11px]" style={{ color: 'var(--muted)' }}>{result.scanId}</span>
            <Badge color={riskColor}>{result.riskLevel} RISK</Badge>
            <Badge color="var(--muted)">{result.allFindings.length} FINDINGS</Badge>
            <button
              onClick={exportToPDF}
              className="flex items-center gap-1.5 font-mono text-[10px] font-bold px-3 py-1.5 rounded-md border transition-all hover:opacity-80 active:scale-95"
              style={{ color: 'var(--cyan)', borderColor: 'var(--cyan)44', background: 'var(--cyan)0f' }}
            >
              ↓ PDF
            </button>
          </div>
        </div>

        <div id="dashboard-content">

        {/* ── OVERVIEW ─────────────────────────────────────────── */}
        <div id="sec-overview">
          <SectionHead title="Digital Risk Overview" tag="ALL PILLARS" />

          <div className="grid gap-5 mb-6" style={{ gridTemplateColumns: '240px 1fr' }}>
            <Card className="flex flex-col items-center justify-center p-6 relative overflow-hidden">
              <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at 50% 110%,rgba(0,212,255,.06) 0%,transparent 65%)' }} />
              <DRSRing score={result.drs} riskLevel={result.riskLevel} animate />
            </Card>
            <div className="grid grid-cols-2 gap-3">
              <PillarCard name="Identity Surface" pillarNum={1} color="var(--cyan)" rawCount={result.pillars.identitySurface.rawCount} sublabel={result.pillars.identitySurface.label} score={result.pillars.identitySurface.score} />
              <PillarCard name="Breach & Creds" pillarNum={2} color="var(--orange)" rawCount={result.pillars.breachCredential.rawCount} sublabel={result.pillars.breachCredential.label} score={result.pillars.breachCredential.score} />
              <PillarCard name="Linkability" pillarNum={3} color="var(--purple)" rawCount={result.pillars.linkability.rawCount} sublabel={result.pillars.linkability.label} score={result.pillars.linkability.score} />
              <PillarCard name="Data Brokers" pillarNum={4} color="var(--green)" rawCount={result.pillars.dataBroker.rawCount} sublabel={result.pillars.dataBroker.label} score={result.pillars.dataBroker.score} />
            </div>
          </div>

          {/* Workers row */}
          <Card className="mb-6 p-4">
            <div className="font-mono text-[10px] tracking-[.12em] mb-4" style={{ color: 'var(--muted)' }}>OSINT WORKERS — PIPELINE COMPLETE</div>
            <div className="grid grid-cols-3 gap-3">
              <WorkerCard icon="🔓" name="HIBP" status="done" count={`${result.hibp.breaches.length} breaches`} />
              <WorkerCard icon="🔍" name="Sherlock" status="done" count={`${result.sherlock.matches.length} platforms`} />
              <WorkerCard icon="🌐" name="Google CSE" status="done" count={`${result.googleCSE.pages.length} pages`} />
              <WorkerCard icon="📷" name="ExifTool" status="done" count={`${result.exif.exposures.filter(e => e.hasGPS).length} GPS leaks`} />
              <WorkerCard icon="🧬" name="Hunter.io" status="done" count={`${result.hunter.profiles.length} profiles`} />
              <WorkerCard icon="🕸️" name="Intel X" status="done" count={`${result.intelx.items.length} dark web`} />
              <WorkerCard icon="🕷️" name="SpiderFoot" status="done" count={`${result.spiderfoot.modules.length} modules`} />
              <WorkerCard icon="📧" name="Snov.io" status="done" count={`${result.snov.profiles.length} profiles`} />
              <WorkerCard icon="💼" name="Skrapp.io" status="done" count={result.skrapp.linkedin ? '1 LinkedIn' : '0'} />
              <WorkerCard icon="🦠" name="VirusTotal" status="done" count={`${result.virustotal.malicious} hits`} />
              <WorkerCard icon="🎣" name="Phishing" status="done" count={result.phishing.isPhishing ? 'Flagged' : 'Clean'} />
            </div>
          </Card>

          {/* Attack Narrative */}
          <div className="rounded-[10px] border-l-[3px] border mb-6 overflow-hidden"
            style={{ background: 'var(--bg2)', borderColor: 'var(--bor2)', borderLeftColor: 'var(--danger)' }}>
            <div className="flex items-center justify-between px-5 py-3.5 border-b" style={{ borderColor: 'var(--border)' }}>
              <div className="flex items-center gap-2">
                <span>⚠</span>
                <h3 className="text-sm font-bold tracking-wider">ATTACK NARRATIVE</h3>
              </div>
              <Badge color="var(--danger)">AI GENERATED</Badge>
            </div>
            <div className="p-5">
              <p className="font-mono text-xs leading-loose whitespace-pre-line" style={{ color: 'var(--text)' }}>{result.narrative.summary}</p>
              <div className="mt-4 flex flex-col gap-2">
                {result.narrative.topThreats.map((t, i) => (
                  <div key={i} className="flex items-start gap-2 font-mono text-[11px]">
                    <span className="flex-shrink-0" style={{ color: 'var(--danger)' }}>▸</span>
                    <span style={{ color: 'var(--muted)' }}>{t}</span>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-2 mt-5 flex-wrap">
                {result.narrative.attackChain.map((node, i) => {
                  const isLast = i === result.narrative.attackChain.length - 1
                  return (
                    <span key={i} className="flex items-center gap-2">
                      <span className="font-mono text-[10px] px-2 py-1 rounded" style={{
                        color: isLast ? 'var(--danger)' : 'var(--text)',
                        background: isLast ? 'rgba(255,71,87,.12)' : 'var(--surface)',
                        border: `1px solid ${isLast ? 'rgba(255,71,87,.4)' : 'var(--bor2)'}`,
                      }}>{node}</span>
                      {i < result.narrative.attackChain.length - 1 && <span style={{ color: 'var(--muted2)' }}>→</span>}
                    </span>
                  )
                })}
              </div>
            </div>
          </div>
        </div>

        {/* ── BREACH ───────────────────────────────────────────── */}
        <div id="sec-breach">
          <SectionHead title="Breach & Credential Exposure" tag="PILLAR 2" color="var(--orange)" />
          <div className="grid grid-cols-2 gap-4 mb-6">
            <Card>
              <CardHeader>
                <h3 className="text-xs font-bold tracking-wider" style={{ color: 'var(--orange)' }}>DATA BREACHES</h3>
                <Badge color="var(--orange)">{result.hibp.breaches.length} found</Badge>
              </CardHeader>
              <BreachTimeline breaches={result.hibp.breaches} />
              <div className="max-h-64 overflow-y-auto">
                {result.pillars.breachCredential.findings.filter(f => f.category === 'Data Breach').map(f => (
                  <FindingItem key={f.id} title={f.title} description={f.description} severity={f.severity} tag={f.category} source={f.source} />
                ))}
              </div>
            </Card>
            <Card>
              <CardHeader>
                <h3 className="text-xs font-bold tracking-wider" style={{ color: 'var(--orange)' }}>CREDENTIAL PATTERNS</h3>
                <Badge color="var(--danger)">ANALYSIS</Badge>
              </CardHeader>
              <div className="max-h-80 overflow-y-auto">
                {result.pillars.breachCredential.findings.filter(f => f.category !== 'Data Breach').map(f => (
                  <FindingItem key={f.id} title={f.title} description={f.description} severity={f.severity} tag={f.category} source={f.source} />
                ))}
              </div>
            </Card>
          </div>
        </div>

        {/* ── IDENTITY ─────────────────────────────────────────── */}
        <div id="sec-identity">
          <SectionHead title="Identity Surface Area" tag="PILLAR 1" color="var(--cyan)" />

          {/* Donut chart full-width card above the 2-col grid */}
          <Card className="mb-4">
            <CardHeader>
              <h3 className="text-xs font-bold tracking-wider" style={{ color: 'var(--cyan)' }}>PLATFORM DISTRIBUTION</h3>
              <Badge color="var(--cyan)">{result.sherlock.matches.length} platforms across {[...new Set(result.sherlock.matches.map(m => m.category))].length} categories</Badge>
            </CardHeader>
            <PlatformDonut matches={result.sherlock.matches} />
          </Card>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <Card>
              <CardHeader>
                <h3 className="text-xs font-bold tracking-wider" style={{ color: 'var(--cyan)' }}>PLATFORM PRESENCE</h3>
                <Badge color="var(--cyan)">{result.sherlock.matches.length} platforms</Badge>
              </CardHeader>
              <div className="max-h-80 overflow-y-auto">
                {result.sherlock.matches.map((m, i) => (
                  <FindingItem key={i}
                    title={`${m.platform} — ${m.url.length > 42 ? m.url.substring(0, 42) + '…' : m.url}`}
                    description={`${m.riskNote} · Confidence: ${m.confidence.toUpperCase()}`}
                    severity={m.confidence === 'high' ? 'high' : 'medium'}
                    tag={m.category.toUpperCase()} source="Sherlock" />
                ))}
              </div>
            </Card>
            <Card>
              <CardHeader>
                <h3 className="text-xs font-bold tracking-wider" style={{ color: 'var(--cyan)' }}>WEB PRESENCE & EXIF</h3>
                <Badge color="var(--cyan)">{result.googleCSE.pages.length + result.exif.exposures.length} items</Badge>
              </CardHeader>
              <div className="max-h-80 overflow-y-auto">
                {[...result.exif.findings, ...result.googleCSE.findings].map(f => (
                  <FindingItem key={f.id} title={f.title} description={f.description} severity={f.severity} tag={f.category} source={f.source} />
                ))}
              </div>
            </Card>
          </div>
        </div>

        {/* ── LINKABILITY ──────────────────────────────────────── */}
        <div id="sec-link">
          <SectionHead title="Linkability & Cascade Risk" tag="PILLAR 3" color="var(--purple)" />
          <Card className="mb-6">
            <CardHeader>
              <h3 className="text-sm font-bold tracking-wider">PIVOT CHAIN MAP</h3>
              <Badge color="var(--purple)">{result.pivotNodes.length - 1} pivot nodes</Badge>
            </CardHeader>
            <div className="p-5">
              <p className="font-mono text-[11px] mb-4" style={{ color: 'var(--muted)' }}>
                Hover each node to see how a threat actor chains exposed fragments into a full attack.
              </p>
              <ThreatGraph nodes={result.pivotNodes} />
              <div className="mt-4 grid grid-cols-1 gap-2">
                {result.pillars.linkability.findings.map(f => (
                  <FindingItem key={f.id} title={f.title} description={f.description} severity={f.severity} tag={f.category} source={f.source} />
                ))}
              </div>
            </div>
          </Card>
        </div>

        {/* ── BROKERS ──────────────────────────────────────────── */}
        <div id="sec-broker">
          <SectionHead title="Data Broker & Passive Exposure" tag="PILLAR 4" color="var(--green)" />
          <Card className="mb-6">
            <CardHeader>
              <h3 className="text-xs font-bold tracking-wider" style={{ color: 'var(--green)' }}>BROKER LISTINGS</h3>
              <Badge color="var(--green)">{result.brokers.filter(b => b.status === 'active').length} active</Badge>
            </CardHeader>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b" style={{ borderColor: 'var(--border)' }}>
                    {['BROKER', 'DATA FOUND', 'RISK', 'STATUS', 'ACTION'].map(h => (
                      <th key={h} className="font-mono text-[10px] tracking-[.1em] px-4 py-2.5 text-left" style={{ color: 'var(--muted)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {result.brokers.map((b, i) => {
                    const c = b.riskLevel === 'critical' ? 'var(--danger)' : b.riskLevel === 'high' ? 'var(--warn)' : b.riskLevel === 'medium' ? 'var(--cyan)' : 'var(--ok)'
                    return (
                      <tr key={i} className="border-b hover:bg-white/[.015] transition-colors" style={{ borderColor: 'var(--border)' }}>
                        <td className="px-4 py-3 font-bold text-xs">{b.broker}</td>
                        <td className="px-4 py-3 font-mono text-[11px]" style={{ color: 'var(--muted)' }}>{b.dataFound.join(', ')}</td>
                        <td className="px-4 py-3"><span className="font-mono text-xs font-bold" style={{ color: c }}>{b.riskLevel.toUpperCase()}</span></td>
                        <td className="px-4 py-3">
                          <span className="flex items-center gap-1.5 font-mono text-[11px]">
                            <span className="w-1.5 h-1.5 rounded-full" style={{ background: c }} />
                            {b.status.toUpperCase()}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <a href={b.optOutUrl} target="_blank" rel="noopener noreferrer"
                            className="font-mono text-[11px] font-bold hover:opacity-70 transition-opacity" style={{ color: 'var(--cyan)' }}>
                            OPT OUT →
                          </a>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        {/* ── REMEDIATION ──────────────────────────────────────── */}
        <div id="sec-remed">
          <SectionHead title="Remediation Plan" tag="ACTION REQUIRED" />
          <Card className="mb-6">
            <CardHeader>
              <h3 className="text-sm font-bold tracking-wider">PRIORITY ACTIONS</h3>
              <div className="flex items-center gap-3">
                <span className="font-mono text-xs" style={{ color: 'var(--muted)' }}>{doneCount} / {remeds.length} completed</span>
                <div className="w-24 h-1 rounded-full overflow-hidden" style={{ background: 'var(--bg3)' }}>
                  <div className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${(doneCount / remeds.length) * 100}%`, background: 'var(--ok)' }} />
                </div>
              </div>
            </CardHeader>
            {remeds.map(r => (
              <RemedItem key={r.id} title={r.title} description={r.description}
                pillar={r.pillar} severity={r.severity} effort={r.effort} done={r.done}
                onToggle={() => toggleRemed(r.id)} />
            ))}
          </Card>
        </div>

        </div> {/* end #dashboard-content */}

      </main>
    </div>
  )
}

// ─── ROOT ─────────────────────────────────────────────────────────────────────

export default function Page() {
  const [phase, setPhase] = useState<'landing' | 'loading' | 'result'>('landing')
  const [result, setResult] = useState<ScanResult | null>(null)
  const [workers, setWorkers] = useState<Workers>({
    hibp: { status: 'idle', count: '' }, sherlock: { status: 'idle', count: '' },
    googleCSE: { status: 'idle', count: '' }, exif: { status: 'idle', count: '' },
    hunter: { status: 'idle', count: '' }, intelx: { status: 'idle', count: '' },
    spiderfoot: { status: 'idle', count: '' }, snov: { status: 'idle', count: '' },
    skrapp: { status: 'idle', count: '' }, virustotal: { status: 'idle', count: '' },
    phishing: { status: 'idle', count: '' },
  })
  const [progress, setProgress] = useState(0)
  const [currentStep, setCurrentStep] = useState('Initialising...')

  const setWorker = useCallback((id: keyof Workers, status: WorkerStatus, count = '') => {
    setWorkers(prev => ({ ...prev, [id]: { status, count } }))
  }, [])

  const runScan = useCallback(async (identifier: string) => {
    setPhase('loading')
    setProgress(5)
    setCurrentStep('Starting OSINT workers...')
    setWorkers({ hibp: { status: 'idle', count: '' }, sherlock: { status: 'idle', count: '' }, googleCSE: { status: 'idle', count: '' }, exif: { status: 'idle', count: '' }, hunter: { status: 'idle', count: '' }, intelx: { status: 'idle', count: '' }, spiderfoot: { status: 'idle', count: '' }, snov: { status: 'idle', count: '' }, skrapp: { status: 'idle', count: '' }, virustotal: { status: 'idle', count: '' }, phishing: { status: 'idle', count: '' } })

    try {
      const res = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier }),
      })

      const reader = res.body!.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let latestResult: Partial<ScanResult> = {}

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const event: WorkerEvent = JSON.parse(line.slice(6))

          if (event.worker === 'hibp') setWorker('hibp', event.status, (event.data as any)?.hibp?.breaches ? `${(event.data as any).hibp.breaches.length} breaches` : '')
          if (event.worker === 'sherlock') setWorker('sherlock', event.status, (event.data as any)?.sherlock?.matches ? `${(event.data as any).sherlock.matches.length} platforms` : '')
          if (event.worker === 'googleCSE') setWorker('googleCSE', event.status, (event.data as any)?.googleCSE?.pages ? `${(event.data as any).googleCSE.pages.length} pages` : '')
          if (event.worker === 'exif') setWorker('exif', event.status, (event.data as any)?.exif?.exposures ? `${(event.data as any).exif.exposures.filter((e: any) => e.hasGPS).length} GPS` : '')
          if (event.worker === 'hunter') setWorker('hunter', event.status, (event.data as any)?.hunter?.profiles ? `${(event.data as any).hunter.profiles.length} profiles` : '')
          if (event.worker === 'intelx') setWorker('intelx', event.status, (event.data as any)?.intelx?.items ? `${(event.data as any).intelx.items.length} items` : '')
          if (event.worker === 'spiderfoot') setWorker('spiderfoot', event.status, (event.data as any)?.spiderfoot?.modules ? `${(event.data as any).spiderfoot.modules.length} modules` : '')
          if (event.worker === 'snov') setWorker('snov', event.status, (event.data as any)?.snov?.profiles ? `${(event.data as any).snov.profiles.length} profiles` : '')
          if (event.worker === 'skrapp') setWorker('skrapp', event.status, (event.data as any)?.skrapp?.linkedin ? '1 profile' : '')
          if (event.worker === 'virustotal') setWorker('virustotal', event.status, (event.data as any)?.virustotal ? `${(event.data as any).virustotal.malicious} hits` : '')
          if (event.worker === 'phishing') setWorker('phishing', event.status, (event.data as any)?.phishing ? ((event.data as any).phishing.isPhishing ? 'Flagged' : 'Clean') : '')

          if (event.data) latestResult = { ...latestResult, ...event.data }

          const pmap: Record<string, number> = { hibp: 8, sherlock: 16, googleCSE: 24, exif: 32, hunter: 40, intelx: 48, spiderfoot: 56, snov: 64, skrapp: 72, virustotal: 80, phishing: 88, scoring: 95, narrative: 100 }
          if (event.status === 'done' && pmap[event.worker]) {
            setProgress(pmap[event.worker])
            setCurrentStep(event.worker === 'narrative' ? 'Scan complete' : `${event.worker} complete`)
          }
        }
      }

      if (latestResult?.drs !== undefined) {
        setResult(latestResult as ScanResult)
        setPhase('result')
      }
    } catch (err) {
      console.error(err)
      setPhase('landing')
    }
  }, [setWorker])

  if (phase === 'landing') return <LandingPage onScan={runScan} />
  if (phase === 'loading') return <CinematicLoader workers={workers} progress={progress} />
  if (phase === 'result' && result) return <Dashboard result={result} onRescan={() => setPhase('landing')} />
  return null
}
