'use client'

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import type { PlatformMatch } from '@/lib/types'

const CATEGORY_CONFIG: Record<string, { color: string; label: string; icon: string }> = {
  developer: { color: '#00d4ff', label: 'Developer',  icon: '⟨/⟩' },
  social:    { color: '#a855f7', label: 'Social',     icon: '◎' },
  gaming:    { color: '#ffa502', label: 'Gaming',     icon: '⚔' },
  forum:     { color: '#10b981', label: 'Forum',      icon: '◈' },
  finance:   { color: '#ff4757', label: 'Finance',    icon: '$' },
  dating:    { color: '#ff6b81', label: 'Dating',     icon: '♡' },
  other:     { color: '#778ca3', label: 'Other',      icon: '○' },
}

interface PlatformDonutProps {
  matches: PlatformMatch[]
}

interface TooltipPayload {
  name: string
  value: number
  payload: { platforms: string[]; color: string }
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: TooltipPayload[] }) {
  if (!active || !payload?.length) return null
  const d = payload[0]
  return (
    <div
      className="rounded-lg px-3 py-2 font-mono text-[11px]"
      style={{
        background: 'rgba(5,8,12,0.97)',
        border: `1px solid ${d.payload.color}44`,
        boxShadow: `0 4px 20px rgba(0,0,0,0.6), 0 0 12px ${d.payload.color}22`,
      }}
    >
      <div className="font-bold text-xs mb-1" style={{ color: d.payload.color }}>{d.name}</div>
      <div style={{ color: '#e1e8ef' }}>{d.value} platform{d.value !== 1 ? 's' : ''}</div>
      <div className="mt-1 flex flex-col gap-0.5">
        {d.payload.platforms.slice(0, 4).map((p: string) => (
          <div key={p} style={{ color: '#556677' }}>· {p}</div>
        ))}
        {d.payload.platforms.length > 4 && <div style={{ color: '#445566' }}>+{d.payload.platforms.length - 4} more</div>}
      </div>
    </div>
  )
}

function CustomLabel({ cx, cy, total }: { cx: number; cy: number; total: number }) {
  return (
    <g>
      <text x={cx} y={cy - 8} textAnchor="middle" dominantBaseline="middle"
        style={{ fontFamily: 'Space Mono, monospace', fontSize: 22, fontWeight: 800, fill: '#00d4ff' }}>
        {total}
      </text>
      <text x={cx} y={cy + 12} textAnchor="middle" dominantBaseline="middle"
        style={{ fontFamily: 'Space Mono, monospace', fontSize: 9, fill: '#445566', letterSpacing: '0.12em' }}>
        PLATFORMS
      </text>
    </g>
  )
}

export function PlatformDonut({ matches }: PlatformDonutProps) {
  // Aggregate by category
  const catMap: Record<string, { count: number; platforms: string[] }> = {}
  matches.forEach(m => {
    const cat = m.category || 'other'
    if (!catMap[cat]) catMap[cat] = { count: 0, platforms: [] }
    catMap[cat].count++
    catMap[cat].platforms.push(m.platform)
  })

  const data = Object.entries(catMap)
    .sort(([, a], [, b]) => b.count - a.count)
    .map(([cat, v]) => ({
      name: CATEGORY_CONFIG[cat]?.label ?? cat,
      value: v.count,
      color: CATEGORY_CONFIG[cat]?.color ?? '#778ca3',
      icon: CATEGORY_CONFIG[cat]?.icon ?? '○',
      platforms: v.platforms,
    }))

  if (data.length === 0) return null

  const total = matches.length
  const highConf = matches.filter(m => m.confidence === 'high').length

  return (
    <div className="flex flex-col">
      {/* Stats strip */}
      <div className="flex items-center gap-5 px-5 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
        <div>
          <div className="font-mono text-[9px] tracking-widest" style={{ color: 'var(--muted)' }}>TOTAL</div>
          <div className="font-extrabold text-lg" style={{ color: '#00d4ff' }}>{total}</div>
        </div>
        <div>
          <div className="font-mono text-[9px] tracking-widest" style={{ color: 'var(--muted)' }}>HIGH CONF</div>
          <div className="font-extrabold text-lg" style={{ color: '#2ed573' }}>{highConf}</div>
        </div>
        <div>
          <div className="font-mono text-[9px] tracking-widest" style={{ color: 'var(--muted)' }}>CATEGORIES</div>
          <div className="font-extrabold text-lg" style={{ color: '#a855f7' }}>{data.length}</div>
        </div>
      </div>

      {/* Chart + Legend side by side */}
      <div className="flex items-center gap-2 px-4 py-3">
        {/* Donut */}
        <div style={{ width: 160, height: 160, flexShrink: 0 }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={48}
                outerRadius={72}
                paddingAngle={3}
                dataKey="value"
                strokeWidth={0}
                labelLine={false}
                label={({ cx, cy }) => <CustomLabel cx={cx} cy={cy} total={total} />}
                isAnimationActive={true}
                animationBegin={0}
                animationDuration={900}
                animationEasing="ease-out"
              >
                {data.map((entry, i) => (
                  <Cell
                    key={i}
                    fill={entry.color}
                    fillOpacity={0.9}
                    style={{ filter: `drop-shadow(0 0 6px ${entry.color}55)`, cursor: 'pointer' }}
                  />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Legend */}
        <div className="flex-1 flex flex-col gap-2">
          {data.map((d, i) => {
            const pct = Math.round((d.value / total) * 100)
            return (
              <div key={i} className="flex items-center gap-2">
                {/* Category icon + color dot */}
                <div
                  className="w-5 h-5 rounded flex items-center justify-center text-[9px] font-bold flex-shrink-0"
                  style={{ background: `${d.color}1a`, border: `1px solid ${d.color}44`, color: d.color }}
                >
                  {d.icon}
                </div>
                {/* Label + bar */}
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center mb-0.5">
                    <span className="font-mono text-[10px] font-bold" style={{ color: '#c8d8e8' }}>{d.name}</span>
                    <span className="font-mono text-[10px]" style={{ color: d.color }}>{d.value} · {pct}%</span>
                  </div>
                  <div className="h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${pct}%`,
                        background: d.color,
                        boxShadow: `0 0 6px ${d.color}88`,
                        transition: 'width 0.8s ease-out',
                      }}
                    />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
