// ─── SUMMARY BUILDER (GROQ SAFE JSON) ──────────────────────────────────────

import { generateText } from 'ai'
import { createGroq } from '@ai-sdk/groq'
import type { FourPillars, RiskLevel } from '@/lib/types'

const groq = createGroq({
  apiKey: process.env.GROQ_API_KEY!,
})

export async function generateDynamicSummary(
  identifier: string,
  pillars: FourPillars,
  drs: number,
  riskLevel: RiskLevel
): Promise<string> {

  // ─── DERIVED SIGNALS ─────────────────────────────────────────────────────
  const hasPwdReuse = pillars.breachCredential.findings.some(
    f => f.category === 'Credential Risk'
  )

  const hasGPS = pillars.identitySurface.findings.some(
    f => f.category === 'EXIF GPS Leak'
  )

  const hasCritical = pillars.breachCredential.findings.some(
    f => f.severity === 'critical'
  )

  // ─── PROMPT (STRICT JSON MODE) ───────────────────────────────────────────
  const prompt = `
Return ONLY valid JSON. No explanation. No markdown.

{
  "summary": string
}

Write a cybersecurity attacker-style summary.

Target: ${identifier}
Risk Score: ${drs}/100 (${riskLevel})

Exposure:
- Breaches: ${pillars.breachCredential.rawCount}
- Platforms: ${pillars.identitySurface.rawCount}
- Pivot Chains: ${pillars.linkability.rawCount}
- Data Brokers: ${pillars.dataBroker.rawCount}

Signals:
- Password Reuse: ${hasPwdReuse}
- GPS Exposure: ${hasGPS}
- Critical Breach: ${hasCritical}

Requirements:
- 4–6 sentences
- No fluff
- No generic wording
- Must explain HOW attacker exploits this
- Must explicitly use signals if true
`

  try {
    const res = await generateText({
      model: groq('llama-3.3-70b-versatile'),
      prompt,
      temperature: 0.3,
    })

    // ─── SAFE PARSE ────────────────────────────────────────────────────────
    const text = res.text.trim()

    // Extract JSON safely (handles accidental text wrapping)
    const jsonMatch = text.match(/\{[\s\S]*\}/)

    if (!jsonMatch) throw new Error('No JSON found')

    const parsed = JSON.parse(jsonMatch[0])

    if (!parsed.summary) throw new Error('Invalid shape')

    return parsed.summary

  } catch {
    // ─── FALLBACK ─────────────────────────────────────────────────────────
    return `Based on ${pillars.breachCredential.rawCount} breaches and ${pillars.identitySurface.rawCount} platform exposures, this target can be exploited using credential stuffing and OSINT-driven phishing. ${
      hasPwdReuse ? 'Password reuse allows immediate account takeover once a single credential is recovered. ' : ''
    }${
      hasGPS ? 'GPS metadata exposure can reveal precise physical location. ' : ''
    }Attackers require no advanced techniques—only aggregation of publicly available data.`
  }
}