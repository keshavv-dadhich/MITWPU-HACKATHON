'use client'

import { type ReactNode } from 'react'
import type { Severity, WorkerStatus } from '@/lib/types'

// ─── SEVERITY HELPERS ────────────────────────────────────────────────────────

export function sevColor(s: Severity | string): string {
  if (s === 'critical') return '#ff4757'
  if (s === 'high')     return '#ffa502'
  if (s === 'medium')   return '#00d4ff'
  return '#2ed573'
}

export function sevLabel(s: Severity): string {
  return s.toUpperCase()
}

// ─── BADGE ───────────────────────────────────────────────────────────────────

interface BadgeProps {
  color?: string
  children: ReactNode
  className?: string
}
export function Badge({ color = '#00d4ff', children, className = '' }: BadgeProps) {
  return (
    <span
      className={`inline-block font-mono text-[10px] font-bold tracking-widest px-2 py-0.5 rounded ${className}`}
      style={{ color, background: `${color}18`, border: `1px solid ${color}44` }}
    >
      {children}
    </span>
  )
}

// ─── CARD ────────────────────────────────────────────────────────────────────

export function Card({ children, className = '', accentColor }: {
  children: ReactNode; className?: string; accentColor?: string
}) {
  return (
    <div
      className={`rounded-[10px] border overflow-hidden ${className}`}
      style={{
        background: 'var(--surface)',
        borderColor: accentColor ? `${accentColor}44` : 'var(--bor2)',
      }}
    >
      {children}
    </div>
  )
}

export function CardHeader({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`flex items-center justify-between px-5 py-3.5 border-b ${className}`}
      style={{ borderColor: 'var(--border)' }}>
      {children}
    </div>
  )
}

// ─── SECTION HEADING ────────────────────────────────────────────────────────

export function SectionHead({ title, tag, color }: { title: string; tag: string; color?: string }) {
  return (
    <div className="flex items-baseline gap-3 mb-5">
      <h2 className="text-[15px] font-bold tracking-wider">{title}</h2>
      <span
        className="font-mono text-[10px] tracking-widest px-2 py-0.5 rounded border"
        style={{ color: color || 'var(--muted)', background: 'var(--surface)', borderColor: 'var(--bor2)' }}
      >
        {tag}
      </span>
    </div>
  )
}

// ─── WORKER CARD ────────────────────────────────────────────────────────────

interface WorkerCardProps {
  icon: string
  name: string
  status: WorkerStatus
  count?: string
}

const workerStatusColor: Record<WorkerStatus, string> = {
  idle:    'var(--muted2)',
  running: 'var(--cyan)',
  done:    'var(--ok)',
  error:   'var(--danger)',
}

export function WorkerCard({ icon, name, status, count }: WorkerCardProps) {
  return (
    <div
      className={`relative flex flex-col items-center gap-1.5 rounded-lg p-3 border overflow-hidden ${status === 'running' ? 'worker-sweep' : ''}`}
      style={{
        background: 'var(--bg3)',
        borderColor: status === 'done' ? 'rgba(46,213,115,.25)' : status === 'error' ? 'rgba(255,71,87,.25)' : 'var(--border)',
      }}
    >
      <span className="text-xl leading-none">{icon}</span>
      <span className="font-mono text-[10px] text-center" style={{ color: 'var(--muted)' }}>{name}</span>
      <span className="font-mono text-base font-bold" style={{ color: workerStatusColor[status] }}>
        {count || '—'}
      </span>
      <span
        className="font-mono text-[9px] font-bold tracking-widest"
        style={{ color: workerStatusColor[status] }}
      >
        {status.toUpperCase()}
      </span>
    </div>
  )
}

// ─── FINDING ITEM ────────────────────────────────────────────────────────────

interface FindingItemProps {
  title: string
  description: string
  severity: Severity
  tag: string
  source?: string
}

export function FindingItem({ title, description, severity, tag, source }: FindingItemProps) {
  const color = sevColor(severity)
  return (
    <div className="flex items-start gap-3 px-5 py-3.5 border-b last:border-b-0 hover:bg-white/[.02] transition-colors"
      style={{ borderColor: 'var(--border)' }}>
      <div className="w-1 self-stretch rounded-full flex-shrink-0 mt-0.5" style={{ background: color }} />
      <div className="flex-1 min-w-0">
        <div className="text-xs font-semibold leading-snug">{title}</div>
        <div className="text-[11px] mt-1 leading-relaxed font-mono" style={{ color: 'var(--muted)' }}>{description}</div>
        {source && (
          <div className="text-[10px] mt-1 font-mono" style={{ color: 'var(--muted2)' }}>via {source}</div>
        )}
      </div>
      <span
        className="flex-shrink-0 font-mono text-[9px] font-bold tracking-wider px-1.5 py-0.5 rounded mt-0.5"
        style={{ color, background: `${color}18`, border: `1px solid ${color}33` }}
      >
        {tag}
      </span>
    </div>
  )
}

// ─── PILLAR CARD ────────────────────────────────────────────────────────────

interface PillarCardProps {
  name: string
  pillarNum: number
  color: string
  rawCount: number
  sublabel: string
  score: number
}

export function PillarCard({ name, pillarNum, color, rawCount, sublabel, score }: PillarCardProps) {
  return (
    <div
      className="relative rounded-[10px] border p-4 overflow-hidden cursor-default"
      style={{ background: 'var(--surface)', borderColor: 'var(--bor2)' }}
    >
      {/* Left accent stripe */}
      <div className="absolute left-0 top-0 bottom-0 w-[3px] rounded-l-[10px]" style={{ background: color }} />

      <div className="pl-1">
        <div className="text-[10px] font-bold tracking-[.06em] mb-1.5" style={{ color }}>
          P{pillarNum} — {name}
        </div>
        <div className="text-3xl font-extrabold leading-none" style={{ color }}>
          {rawCount}
        </div>
        <div className="text-[10px] font-mono mt-1" style={{ color: 'var(--muted)' }}>{sublabel}</div>
        <div className="mt-3 h-1 rounded-full overflow-hidden" style={{ background: 'var(--bg3)' }}>
          <div
            className="h-full rounded-full transition-all duration-1000"
            style={{ width: `${score}%`, background: color }}
          />
        </div>
        <div className="text-[10px] font-mono mt-1 text-right" style={{ color: 'var(--muted2)' }}>
          {score}/100
        </div>
      </div>
    </div>
  )
}

// ─── REMEDIATION ITEM ────────────────────────────────────────────────────────

interface RemedItemProps {
  title: string
  description: string
  pillar: 1 | 2 | 3 | 4
  severity: Severity
  effort: 'quick' | 'moderate' | 'involved'
  done: boolean
  onToggle: () => void
}

const PILLAR_COLORS = ['', 'var(--cyan)', 'var(--orange)', 'var(--purple)', 'var(--green)']
const PILLAR_NAMES  = ['', 'IDENTITY', 'BREACH', 'LINKABILITY', 'BROKER']
const EFFORT_LABELS = { quick: '⚡ QUICK', moderate: '⏱ MODERATE', involved: '🔧 INVOLVED' }

export function RemedItem({ title, description, pillar, severity, effort, done, onToggle }: RemedItemProps) {
  const pillarColor = PILLAR_COLORS[pillar]
  const sevC = sevColor(severity)

  return (
    <div
      className={`flex items-start gap-4 px-5 py-4 border-b last:border-b-0 cursor-pointer transition-colors ${done ? 'opacity-50' : 'hover:bg-white/[.02]'}`}
      style={{ borderColor: 'var(--border)' }}
      onClick={onToggle}
    >
      <button
        className="w-5 h-5 rounded-[5px] flex-shrink-0 mt-0.5 grid place-items-center transition-all border-[1.5px]"
        style={{
          background:   done ? 'var(--ok)' : 'transparent',
          borderColor:  done ? 'var(--ok)' : 'var(--bor2)',
        }}
      >
        {done && <span className="text-black text-[10px] font-bold">✓</span>}
      </button>
      <div className="flex-1 min-w-0">
        <div className={`text-xs font-bold ${done ? 'line-through' : ''}`}>{title}</div>
        <div className="text-[11px] mt-1 leading-relaxed font-mono" style={{ color: 'var(--muted)' }}>{description}</div>
        <div className="flex gap-2 mt-2 flex-wrap">
          <span className="font-mono text-[9px] font-bold px-1.5 py-0.5 rounded"
            style={{ color: pillarColor, background: `${pillarColor}18`, border: `1px solid ${pillarColor}33` }}>
            P{pillar} {PILLAR_NAMES[pillar]}
          </span>
          <span className="font-mono text-[9px] font-bold px-1.5 py-0.5 rounded"
            style={{ color: sevC, background: `${sevC}18`, border: `1px solid ${sevC}33` }}>
            {sevColor(severity) && sevLabel(severity)}
          </span>
          <span className="font-mono text-[9px] px-1.5 py-0.5 rounded"
            style={{ color: 'var(--muted)', background: 'var(--bg3)', border: '1px solid var(--border)' }}>
            {EFFORT_LABELS[effort]}
          </span>
        </div>
      </div>
    </div>
  )
}
