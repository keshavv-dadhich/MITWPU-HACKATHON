'use client'

import { useEffect, useRef } from 'react'
import type { RiskLevel } from '@/lib/types'

const RISK_COLORS: Record<RiskLevel, string> = {
  CRITICAL: '#ff4757',
  HIGH:     '#ffa502',
  MODERATE: '#00d4ff',
  LOW:      '#2ed573',
}

interface DRSRingProps {
  score: number
  riskLevel: RiskLevel
  animate?: boolean
}

export function DRSRing({ score, riskLevel, animate = true }: DRSRingProps) {
  const arcRef = useRef<SVGCircleElement>(null)
  const numRef = useRef<HTMLDivElement>(null)
  const color = RISK_COLORS[riskLevel]
  const circumference = 2 * Math.PI * 68 // r=68
  const offset = circumference - (score / 100) * circumference

  useEffect(() => {
    if (!animate) return

    // Animate arc
    if (arcRef.current) {
      arcRef.current.style.strokeDashoffset = String(circumference)
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (arcRef.current) {
            arcRef.current.style.transition = 'stroke-dashoffset 1.8s cubic-bezier(.22,1,.36,1)'
            arcRef.current.style.strokeDashoffset = String(offset)
          }
        })
      })
    }

    // Count up number
    if (numRef.current) {
      const el = numRef.current
      const start = Date.now()
      const duration = 1600
      const tick = () => {
        const p = Math.min(1, (Date.now() - start) / duration)
        el.textContent = String(Math.round(p * score))
        if (p < 1) requestAnimationFrame(tick)
      }
      requestAnimationFrame(tick)
    }
  }, [score, animate, offset, circumference])

  return (
    <div className="flex flex-col items-center">
      <div className="font-mono text-[10px] tracking-[.12em] mb-4" style={{ color: 'var(--muted)' }}>
        DIGITAL RISK SCORE
      </div>

      <div className="relative w-44 h-44">
        <svg width="176" height="176" viewBox="0 0 176 176" style={{ transform: 'rotate(-90deg)' }}>
          {/* Track */}
          <circle cx="88" cy="88" r="68" fill="none" stroke="#1c2533" strokeWidth="11" />
          {/* Score arc */}
          <circle
            ref={arcRef}
            cx="88" cy="88" r="68"
            fill="none"
            stroke={color}
            strokeWidth="11"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={animate ? circumference : offset}
          />
        </svg>

        {/* Center content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div
            ref={numRef}
            className="text-5xl font-extrabold leading-none"
            style={{ color }}
          >
            {animate ? 0 : score}
          </div>
          <div className="font-mono text-sm mt-0.5" style={{ color: 'var(--muted)' }}>/100</div>
        </div>
      </div>

      <div className="mt-4 text-sm font-bold tracking-[.1em]" style={{ color }}>
        {riskLevel} RISK
      </div>
      <div className="font-mono text-[10px] mt-1 text-center" style={{ color: 'var(--muted)' }}>
        Weighted 4-pillar analysis
      </div>
    </div>
  )
}
