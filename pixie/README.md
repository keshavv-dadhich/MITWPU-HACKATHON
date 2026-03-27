# PIXIE — Personal Privacy Intelligence Engine

> *See yourself the way an attacker does. Then make yourself smaller.*

## Quick Start

```bash
npm install
npm run dev        # http://localhost:3000
```

## Project Structure

```
pixie/
├── app/
│   ├── page.tsx              # Landing → Loading → Dashboard (full UI)
│   ├── layout.tsx            # Root layout + fonts
│   ├── globals.css           # Design tokens + animations
│   └── api/scan/route.ts     # SSE streaming scan endpoint
│
├── lib/
│   ├── types.ts              # All TypeScript types (ScanResult, Workers, etc.)
│   ├── scoring.ts            # DRS engine: 4 pillars, pivot chains, remediations
│   └── workers/
│       ├── hibp.ts           # Worker A — HIBP breach lookup
│       ├── sherlock.ts       # Worker B — Platform enumeration (Sherlock)
│       └── enrichment.ts     # Workers C/D/E — Google CSE, ExifTool, Hunter.io
│
└── components/
    ├── ui.tsx                # Shared components: Badge, Card, FindingItem, etc.
    ├── DRSRing.tsx           # Animated SVG risk score arc
    └── LinkMap.tsx           # Pivot chain node graph
```

## Four Pillars

| # | Pillar | Weight | Data Sources |
|---|--------|--------|--------------|
| 1 | Identity Surface Area | 25% | Sherlock, Google CSE, ExifTool |
| 2 | Breach & Credentials  | 30% | HIBP API, paste DB |
| 3 | Linkability & Cascade | 20% | Hunter.io, cross-worker analysis |
| 4 | Data Broker Exposure  | 15% | Broker check simulation |

**DRS = (P2 × 0.30) + (P1 × 0.25) + (P3 × 0.20) + (P4 × 0.15) + infostealer_bonus**

## Production API Keys (add to .env.local)

```
HIBP_API_KEY=           # https://haveibeenpwned.com/API/Key
GOOGLE_CSE_KEY=         # https://developers.google.com/custom-search
GOOGLE_CSE_CX=          # Your custom search engine ID
HUNTER_API_KEY=         # https://hunter.io/api-documentation
```

## Connecting Real APIs

Each worker has a clearly marked comment at the top:
- `hibp.ts` — replace mock with `GET https://haveibeenpwned.com/api/v3/breachedaccount/{email}`
- `sherlock.ts` — replace mock with `POST http://localhost:8080/search` (self-hosted Docker)
- `enrichment.ts` — replace mocks with Hunter.io + Google CSE + exiftool-vendored

## Stack

- **Next.js 15** (App Router, TypeScript)
- **Tailwind CSS** — custom design tokens
- **Syne + Space Mono** — typography
- **SSE streaming** — real-time worker updates
- **Recharts** ready — add to scoring charts
