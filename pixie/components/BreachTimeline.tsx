'use client'

import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, Cell, CartesianGrid,
} from 'recharts'
import type { HibpBreach } from '@/lib/types'

interface BreachTimelineProps {
  breaches: HibpBreach[]
}

interface CustomTooltipProps {
  active?: boolean
  payload?: { value: number; payload: { name: string; records: number; color: string } }[]
  label?: string
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div
      className="rounded-lg px-3 py-2 font-mono text-[11px]"
      style={{
        background: 'rgba(5,8,12,0.95)',
        border: '1px solid rgba(0,212,255,0.2)',
        boxShadow: '0 4px 24px rgba(0,0,0,0.6)',
      }}
    >
      <div className="font-bold text-xs mb-1" style={{ color: '#e1e8ef' }}>{d.name}</div>
      <div style={{ color: d.color }}>{(d.records / 1_000_000).toFixed(1)}M records</div>
      <div style={{ color: '#445566' }}>{label}</div>
    </div>
  )
}

export function BreachTimeline({ breaches }: BreachTimelineProps) {
  if (!breaches || breaches.length === 0) return null

  // Build year → aggregated records mapping
  const yearMap: Record<number, { records: number; names: string[]; maxSev: string }> = {}
  breaches.forEach(b => {
    const year = new Date(b.breachDate).getFullYear()
    if (!yearMap[year]) yearMap[year] = { records: 0, names: [], maxSev: 'low' }
    yearMap[year].records += b.pwnCount
    yearMap[year].names.push(b.name)
    // Track severity (by record count proxy)
    if (b.pwnCount > 50_000_000) yearMap[year].maxSev = 'critical'
    else if (b.pwnCount > 10_000_000 && yearMap[year].maxSev !== 'critical') yearMap[year].maxSev = 'high'
    else if (b.pwnCount > 1_000_000 && !['critical','high'].includes(yearMap[year].maxSev)) yearMap[year].maxSev = 'medium'
  })

  const sevColor = (sev: string) => ({
    critical: '#ff4757',
    high: '#ffa502',
    medium: '#00d4ff',
    low: '#2ed573',
  }[sev] ?? '#2ed573')

  const data = Object.entries(yearMap)
    .sort(([a], [b]) => Number(a) - Number(b))
    .map(([year, v]) => ({
      year,
      name: v.names.join(', '),
      records: v.records,
      recordsM: Math.max(0.1, v.records / 1_000_000),
      color: sevColor(v.maxSev),
    }))

  const totalRecords = breaches.reduce((s, b) => s + b.pwnCount, 0)
  const totalM = (totalRecords / 1_000_000).toFixed(0)

  return (
    <div>
      {/* Stats row */}
      <div className="flex items-center gap-6 px-5 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
        <div>
          <div className="font-mono text-[9px] tracking-widest" style={{ color: 'var(--muted)' }}>TOTAL EXPOSURE</div>
          <div className="font-extrabold text-lg" style={{ color: '#ff4757' }}>{totalM}M <span className="text-xs font-mono" style={{ color: 'var(--muted)' }}>records</span></div>
        </div>
        <div>
          <div className="font-mono text-[9px] tracking-widest" style={{ color: 'var(--muted)' }}>BREACHES</div>
          <div className="font-extrabold text-lg" style={{ color: '#ffa502' }}>{breaches.length}</div>
        </div>
        <div>
          <div className="font-mono text-[9px] tracking-widest" style={{ color: 'var(--muted)' }}>YEAR SPAN</div>
          <div className="font-extrabold text-lg" style={{ color: '#00d4ff' }}>
            {data[0]?.year} – {data[data.length - 1]?.year}
          </div>
        </div>
        <div className="ml-auto flex items-center gap-3">
          {[['#ff4757', 'CRITICAL'],['#ffa502', 'HIGH'],['#00d4ff', 'MEDIUM'],['#2ed573', 'LOW']].map(([c, l]) => (
            <div key={l} className="flex items-center gap-1 font-mono text-[9px]" style={{ color: 'var(--muted2)' }}>
              <div className="w-2 h-2 rounded-sm" style={{ background: c }} />{l}
            </div>
          ))}
        </div>
      </div>

      {/* Chart */}
      <div className="px-5 pt-4 pb-2" style={{ height: 180 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }} barCategoryGap="28%">
            <CartesianGrid
              vertical={false}
              stroke="rgba(255,255,255,0.05)"
              strokeDasharray="3 3"
            />
            <XAxis
              dataKey="year"
              tick={{ fontFamily: 'Space Mono, monospace', fontSize: 10, fill: '#445566' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tickFormatter={v => `${v}M`}
              tick={{ fontFamily: 'Space Mono, monospace', fontSize: 10, fill: '#445566' }}
              axisLine={false}
              tickLine={false}
              width={36}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
            <Bar dataKey="recordsM" radius={[4, 4, 0, 0]} maxBarSize={40}>
              {data.map((entry, i) => (
                <Cell
                  key={i}
                  fill={entry.color}
                  fillOpacity={0.85}
                  style={{ filter: `drop-shadow(0 0 6px ${entry.color}66)` }}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Breach name row */}
      <div className="px-5 pb-3 flex gap-2 flex-wrap">
        {breaches.map((b, i) => {
          const year = new Date(b.breachDate).getFullYear()
          const d = yearMap[year]
          const c = sevColor(d?.maxSev || 'low')
          return (
            <span
              key={i}
              className="font-mono text-[9px] px-2 py-0.5 rounded-full"
              style={{ color: c, background: `${c}15`, border: `1px solid ${c}33` }}
            >
              {b.name} {year}
            </span>
          )
        })}
      </div>
    </div>
  )
}
