'use client'

import { useEffect, useRef, useState } from 'react'
import type { PivotNode } from '@/lib/types'

const PILLAR_COLORS: Record<number, string> = {
  1: '#00d4ff',
  2: '#ff6b35',
  3: '#a855f7',
  4: '#10b981',
}

interface NodeLayout {
  id: string
  x: number
  y: number
  label: string
  pillar: 1 | 2 | 3 | 4
  type: 'center' | 'primary' | 'secondary'
  connects: string[]
  riskNote: string
}

function computeLayout(nodes: PivotNode[], W: number, H: number): NodeLayout[] {
  const cx = W / 2
  const cy = H / 2

  const center = nodes.find(n => n.type === 'center')
  const primaries = nodes.filter(n => n.type === 'primary')
  const secondaries = nodes.filter(n => n.type === 'secondary')

  const layout: NodeLayout[] = []

  if (center) {
    layout.push({ ...center, x: cx, y: cy })
  }

  const r1 = Math.min(W, H) * 0.28
  primaries.forEach((n, i) => {
    const angle = (2 * Math.PI * i) / primaries.length - Math.PI / 2
    layout.push({ ...n, x: cx + r1 * Math.cos(angle), y: cy + r1 * Math.sin(angle) })
  })

  const r2 = Math.min(W, H) * 0.44
  secondaries.forEach((n, i) => {
    const angle = (2 * Math.PI * i) / secondaries.length - Math.PI / 4
    layout.push({ ...n, x: cx + r2 * Math.cos(angle), y: cy + r2 * Math.sin(angle) })
  })

  return layout
}

interface ThreatGraphProps {
  nodes: PivotNode[]
}

export function ThreatGraph({ nodes }: ThreatGraphProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [layout, setLayout] = useState<NodeLayout[]>([])
  const [dims, setDims] = useState({ W: 600, H: 320 })
  const [tooltip, setTooltip] = useState<{ text: string; x: number; y: number } | null>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!containerRef.current) return
    const W = containerRef.current.offsetWidth || 600
    const H = 320
    setDims({ W, H })
    setLayout(computeLayout(nodes, W, H))
    const t = setTimeout(() => setVisible(true), 80)
    return () => clearTimeout(t)
  }, [nodes])

  const posMap = Object.fromEntries(layout.map(n => [n.id, { x: n.x, y: n.y }]))

  const edges: { x1: number; y1: number; x2: number; y2: number; color: string; key: string }[] = []
  layout.forEach(n => {
    n.connects.forEach(tid => {
      const from = posMap[n.id]
      const to = posMap[tid]
      if (!from || !to) return
      edges.push({ x1: from.x, y1: from.y, x2: to.x, y2: to.y, color: PILLAR_COLORS[n.pillar], key: `${n.id}-${tid}` })
    })
  })

  return (
    <div ref={containerRef} className="relative w-full" style={{ height: 320 }}>
      <style>{`
        @keyframes nodeIn {
          from { opacity: 0; transform: scale(0.3); }
          to   { opacity: 1; transform: scale(1); }
        }
        @keyframes edgeIn {
          from { stroke-dashoffset: 200; opacity: 0; }
          to   { stroke-dashoffset: 0;   opacity: 0.4; }
        }
        @keyframes pulse-ring {
          0%, 100% { opacity: 0.6; transform: scale(1); }
          50%       { opacity: 0.15; transform: scale(1.6); }
        }
        .threat-node { animation: nodeIn 0.5s cubic-bezier(.34,1.56,.64,1) both; }
        .threat-edge { animation: edgeIn 0.6s ease-out both; }
        .pulse-ring   { animation: pulse-ring 2s ease-in-out infinite; }
      `}</style>

      <svg
        width={dims.W}
        height={dims.H}
        className="absolute inset-0"
        style={{ overflow: 'visible' }}
      >
        <defs>
          {Object.entries(PILLAR_COLORS).map(([p, c]) => (
            <filter key={p} id={`glow-p${p}`} x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          ))}
        </defs>

        {/* Edges */}
        {visible && edges.map((e, i) => (
          <line
            key={e.key}
            className="threat-edge"
            x1={e.x1} y1={e.y1} x2={e.x2} y2={e.y2}
            stroke={e.color}
            strokeWidth={1.5}
            strokeDasharray="5 4"
            style={{ animationDelay: `${i * 60}ms` }}
          />
        ))}

        {/* Pulse rings for high-risk nodes */}
        {visible && layout.filter(n => n.pillar === 2 || n.type === 'center').map(n => (
          <circle
            key={`ring-${n.id}`}
            className="pulse-ring"
            cx={n.x} cy={n.y}
            r={n.type === 'center' ? 32 : 22}
            fill="none"
            stroke={PILLAR_COLORS[n.pillar]}
            strokeWidth={1}
            style={{ transformOrigin: `${n.x}px ${n.y}px` }}
          />
        ))}
      </svg>

      {/* Nodes as DOM elements for crisp text */}
      {visible && layout.map((n, i) => {
        const color = PILLAR_COLORS[n.pillar]
        const isCenter = n.type === 'center'
        const size = isCenter ? 64 : n.type === 'primary' ? 48 : 36

        return (
          <div
            key={n.id}
            className="threat-node absolute flex items-center justify-center rounded-full cursor-pointer select-none"
            style={{
              left: n.x,
              top: n.y,
              width: size,
              height: size,
              transform: 'translate(-50%, -50%)',
              background: isCenter ? color : `${color}1a`,
              border: `${isCenter ? 2.5 : 1.5}px solid ${color}${isCenter ? '' : '80'}`,
              color: isCenter ? '#000' : color,
              fontSize: isCenter ? 9 : 8,
              fontFamily: 'Space Mono, monospace',
              fontWeight: 700,
              textAlign: 'center',
              lineHeight: 1.25,
              padding: 4,
              whiteSpace: 'pre-line',
              boxShadow: isCenter ? `0 0 24px ${color}55, 0 0 8px ${color}33` : `0 0 8px ${color}22`,
              filter: `url(#glow-p${n.pillar})`,
              animationDelay: `${i * 80}ms`,
              zIndex: isCenter ? 10 : 5,
              transition: 'box-shadow 0.2s, transform 0.2s',
            }}
            onMouseEnter={e => {
              const rect = (e.target as HTMLElement).getBoundingClientRect()
              const containerRect = containerRef.current!.getBoundingClientRect()
              setTooltip({
                text: n.riskNote,
                x: n.x,
                y: n.y - size / 2 - 12,
              })
            }}
            onMouseLeave={() => setTooltip(null)}
          >
            {n.label}
          </div>
        )
      })}

      {/* Tooltip */}
      {tooltip && (
        <div
          className="absolute pointer-events-none z-50 px-3 py-2 rounded-lg text-[10px] font-mono max-w-[220px] text-center"
          style={{
            left: tooltip.x,
            top: tooltip.y,
            transform: 'translate(-50%, -100%)',
            background: 'rgba(13,18,25,0.96)',
            border: '1px solid var(--bor2)',
            color: 'var(--text)',
            boxShadow: '0 4px 24px rgba(0,0,0,0.5)',
            backdropFilter: 'blur(8px)',
          }}
        >
          {tooltip.text}
        </div>
      )}

      {/* Legend */}
      <div className="absolute bottom-0 right-0 flex gap-3 pb-1 pr-1">
        {([['#00d4ff','P1 Identity'],['#ff6b35','P2 Breach'],['#a855f7','P3 Link'],['#10b981','P4 Broker']] as const).map(([c, l]) => (
          <div key={l} className="flex items-center gap-1 font-mono text-[9px]" style={{ color: 'var(--muted2)' }}>
            <div className="w-1.5 h-1.5 rounded-full" style={{ background: c }} />
            {l}
          </div>
        ))}
      </div>
    </div>
  )
}
