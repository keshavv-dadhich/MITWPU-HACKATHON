'use client'

import { useEffect, useRef } from 'react'
import type { PivotNode } from '@/lib/types'

const PILLAR_COLORS = ['', '#00d4ff', '#ff6b35', '#a855f7', '#10b981']

const NODE_POSITIONS: Record<string, { x: string; y: string }> = {
  email:    { x: '50%', y: '50%' },
  breachdb: { x: '22%', y: '22%' },
  password: { x: '10%', y: '48%' },
  social:   { x: '78%', y: '22%' },
  employer: { x: '88%', y: '48%' },
  code:     { x: '80%', y: '72%' },
  apikeys:  { x: '65%', y: '88%' },
  location: { x: '20%', y: '72%' },
  homeaddr: { x: '10%', y: '88%' },
  brokers:  { x: '50%', y: '10%' },
}

interface LinkMapProps {
  nodes: PivotNode[]
}

export function LinkMap({ nodes }: LinkMapProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const svg = svgRef.current
    const container = containerRef.current
    if (!svg || !container) return

    const W = container.offsetWidth
    const H = container.offsetHeight

    svg.setAttribute('viewBox', `0 0 ${W} ${H}`)

    const posMap: Record<string, { x: number; y: number }> = {}
    nodes.forEach(n => {
      const pos = NODE_POSITIONS[n.id] || { x: '50%', y: '50%' }
      posMap[n.id] = {
        x: (parseFloat(pos.x) / 100) * W,
        y: (parseFloat(pos.y) / 100) * H,
      }
    })

    let edgeSVG = ''
    nodes.forEach(n => {
      n.connects.forEach(targetId => {
        const from = posMap[n.id]
        const to = posMap[targetId]
        if (!from || !to) return
        const color = PILLAR_COLORS[n.pillar] || '#263547'
        edgeSVG += `<line x1="${from.x}" y1="${from.y}" x2="${to.x}" y2="${to.y}"
          stroke="${color}" stroke-width="1" stroke-opacity="0.35" stroke-dasharray="4 3"/>`
      })
    })

    svg.innerHTML = edgeSVG
  }, [nodes])

  return (
    <div ref={containerRef} className="relative w-full h-56">
      <svg ref={svgRef} className="absolute inset-0 w-full h-full overflow-visible" />

      {nodes.map(n => {
        const pos = NODE_POSITIONS[n.id] || { x: '50%', y: '50%' }
        const color = PILLAR_COLORS[n.pillar] || '#263547'
        const isCenter = n.type === 'center'
        const size = isCenter ? 60 : n.type === 'primary' ? 44 : 34

        return (
          <div
            key={n.id}
            title={n.riskNote}
            className="absolute flex items-center justify-center rounded-full cursor-pointer transition-transform hover:scale-110"
            style={{
              left: pos.x, top: pos.y,
              width: size, height: size,
              transform: 'translate(-50%, -50%)',
              background: isCenter ? color : `${color}22`,
              border: `${isCenter ? 2 : 1.5}px solid ${color}${isCenter ? '' : '66'}`,
              color: isCenter ? '#000' : color,
              fontSize: isCenter ? 9 : 8,
              fontFamily: 'Space Mono, monospace',
              fontWeight: 700,
              textAlign: 'center',
              lineHeight: '1.2',
              padding: '2px',
              boxShadow: isCenter ? `0 0 20px ${color}44` : 'none',
              whiteSpace: 'pre-line',
            }}
          >
            {n.label}
          </div>
        )
      })}
    </div>
  )
}
