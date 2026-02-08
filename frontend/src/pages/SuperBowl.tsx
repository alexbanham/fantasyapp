import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import ColorSchemeToggler from '../components/ColorSchemeToggler'
import { getSuperBowlGame, getSuperBowlSquares, putSuperBowlSquares } from '../services/api'

// Default team logos - NFL conference logos (fallback when ESPN data not loaded)
const DEFAULT_TEAM_A_LOGO =
  'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7a/AFC.svg/120px-AFC.svg.png'
const DEFAULT_TEAM_B_LOGO =
  'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8a/NFC.svg/120px-NFC.svg.png'

const CELL = 46

type PeriodKey = 'Q1' | 'Q2' | 'Q3' | 'Q4' | 'FINAL'
type ScoreState = Record<PeriodKey, { teamA: string; teamB: string }>

const PERIODS: { key: PeriodKey; label: string }[] = [
  { key: 'Q1', label: 'End of 1st Quarter' },
  { key: 'Q2', label: 'Halftime (End of 2nd)' },
  { key: 'Q3', label: 'End of 3rd Quarter' },
  { key: 'Q4', label: 'End of 4th Quarter' },
  { key: 'FINAL', label: 'Final Score' },
]

// Default rainbow palette (used elsewhere)
const PLAYER_PALETTE = [
  '#e11d48', '#f97316', '#eab308', '#84cc16', '#10b981',
  '#06b6d4', '#0ea5e9', '#6366f1', '#8b5cf6', '#ec4899',
]

// Super Bowl default: blues, grays, reds, greens – NFL team color vibe
// 10 maximally distinct hues – no two in same family (one red, one orange, etc.)
const SUPERBOWL_TEAM_PALETTE = [
  '#1B4F72', '#00838F', '#2E7D32', '#F9A825', '#E65100',
  '#C62828', '#AD1457', '#4527A0', '#37474F', '#4B92DB',
]

function generateBoard(names: string[]): string[] {
  const board: string[] = Array(100).fill('')
  if (names.length === 0) return board

  const perPerson = Math.floor(100 / names.length)
  if (perPerson <= 0) return board

  const pool: string[] = []
  for (const n of names) for (let j = 0; j < perPerson; j++) pool.push(n)

  for (let i = 0; i < pool.length && i < 100; i++) board[i] = pool[i]
  shuffle(board)
  return board
}

function shuffle(arr: string[]): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]]
  }
}

function hashString(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) {
    h = (h << 5) - h + s.charCodeAt(i)
    h |= 0
  }
  return h
}

function toDatetimeLocal(iso: string): string {
  const d = new Date(iso)
  const pad = (n: number) => n.toString().padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace('#', '')
  const bigint = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h, 16)
  const r = (bigint >> 16) & 255
  const g = (bigint >> 8) & 255
  const b = bigint & 255
  return { r, g, b }
}

function rgbToHex(r: number, g: number, b: number): string {
  const to = (n: number) => n.toString(16).padStart(2, '0')
  return `#${to(r)}${to(g)}${to(b)}`
}

function mixWithBg(hex: string, t: number, isDark: boolean): string {
  const bg = isDark ? { r: 10, g: 10, b: 14 } : { r: 243, g: 239, b: 231 }
  const { r, g, b } = hexToRgb(hex)
  const rr = Math.round(r + (bg.r - r) * t)
  const gg = Math.round(g + (bg.g - g) * t)
  const bb = Math.round(b + (bg.b - b) * t)
  return rgbToHex(rr, gg, bb)
}

function colorForName(
  name: string,
  nameToColorIndex: Map<string, number>,
  isDark: boolean,
  palette: string[]
): string {
  const idx = nameToColorIndex.has(name)
    ? nameToColorIndex.get(name)!
    : Math.abs(hashString(name)) % palette.length
  return mixWithBg(palette[idx], isDark ? 0.5 : 0.4, isDark)
}

/** Best practice: pick text color by background luminance for WCAG contrast */
function textColorForBg(bgHex: string): string {
  const { r, g, b } = hexToRgb(bgHex)
  const [rs, gs, bs] = [r, g, b].map(v => {
    const s = v / 255
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
  })
  const L = 0.2126 * rs + 0.7152 * gs + 0.0722 * bs
  return L < 0.4 ? '#ffffff' : '#1a1a1a'
}

const SuperBowl: React.FC = () => {
  const [names, setNames] = useState<string[]>([])
  const [squareCost, setSquareCost] = useState(1)
  const [kickoffISO, setKickoffISO] = useState('')
  const [board, setBoard] = useState<string[]>(Array(100).fill(''))
  const [newName, setNewName] = useState('')
  const [teamAName, setTeamAName] = useState('AFC')
  const [teamBName, setTeamBName] = useState('NFC')
  const [teamALogo, setTeamALogo] = useState(DEFAULT_TEAM_A_LOGO)
  const [teamBLogo, setTeamBLogo] = useState(DEFAULT_TEAM_B_LOGO)
  const [isDark, setIsDark] = useState(false)
  const [liveGame, setLiveGame] = useState<{
    teamA: { name: string; logo: string; score: number; linescores: Record<string, string>; color?: string; alternateColor?: string }
    teamB: { name: string; logo: string; score: number; linescores: Record<string, string>; color?: string; alternateColor?: string }
    isLive: boolean
    period: number
    clock: string | null
    kickoffISO?: string
    dateDisplay?: string
  } | null>(null)
  const [liveError, setLiveError] = useState<string | null>(null)
  const hasLoadedSquares = useRef(false)

  const [scores, setScores] = useState<ScoreState>({
    Q1: { teamA: '', teamB: '' },
    Q2: { teamA: '', teamB: '' },
    Q3: { teamA: '', teamB: '' },
    Q4: { teamA: '', teamB: '' },
    FINAL: { teamA: '', teamB: '' },
  })

  // Detect dark mode
  useEffect(() => {
    const check = () => setIsDark(document.documentElement.classList.contains('dark'))
    check()
    const observer = new MutationObserver(check)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [])

  // Load shared squares from API and poll for updates (all visitors see same data)
  useEffect(() => {
    const apply = (d: { names?: string[]; squareCost?: number; kickoffISO?: string; board?: string[]; teamAName?: string; teamBName?: string; teamALogo?: string; teamBLogo?: string; scores?: Record<string, { teamA?: string; teamB?: string; sea?: string; ne?: string }> }) => {
      if (Array.isArray(d.names)) setNames(d.names)
      if (d.squareCost != null) setSquareCost(d.squareCost)
      if (d.kickoffISO != null) setKickoffISO(d.kickoffISO)
      if (Array.isArray(d.board) && d.board.length === 100) setBoard(d.board)
      if (d.teamAName != null) setTeamAName(d.teamAName)
      if (d.teamBName != null) setTeamBName(d.teamBName)
      if (d.teamALogo != null) setTeamALogo(d.teamALogo)
      if (d.teamBLogo != null) setTeamBLogo(d.teamBLogo)
      if (d.scores && typeof d.scores === 'object') {
        setScores(
          Object.fromEntries(
            Object.entries(d.scores).map(([k, v]) => {
              const vv = v as { sea?: string; ne?: string; teamA?: string; teamB?: string }
              return [
                k,
                { teamA: vv.teamA ?? vv.sea ?? '', teamB: vv.teamB ?? vv.ne ?? '' },
              ]
            })
          ) as ScoreState
        )
      }
    }

    const fetchSquares = async () => {
      try {
        const res = await getSuperBowlSquares()
        if (res.success && res.squares) {
          apply(res.squares)
          hasLoadedSquares.current = true
        }
      } catch {
        /* ignore */
      }
    }

    fetchSquares()
    const interval = setInterval(fetchSquares, 60000) // 60s - reduce load on cheap deployments
    return () => clearInterval(interval)
  }, [])

  // Save to API when state changes (debounced; skip until we've loaded from API once)
  useEffect(() => {
    if (!hasLoadedSquares.current) return
    const payload = { names, squareCost, kickoffISO, board, scores, teamAName, teamBName, teamALogo, teamBLogo }
    const t = setTimeout(() => {
      putSuperBowlSquares(payload).catch(() => {})
    }, 500)
    return () => clearTimeout(t)
  }, [names, squareCost, kickoffISO, board, scores, teamAName, teamBName, teamALogo, teamBLogo])

  // Fetch Super Bowl from ESPN and poll for live updates
  useEffect(() => {
    const fetchSuperBowl = async () => {
      try {
        setLiveError(null)
        const res = await getSuperBowlGame()
        if (res.success && res.game) {
          const g = res.game
          setLiveGame({
            teamA: {
              name: g.teamA.name,
              logo: g.teamA.logo,
              score: g.teamA.score,
              linescores: g.teamA.linescores || {},
              color: g.teamA.color,
              alternateColor: g.teamA.alternateColor,
            },
            teamB: {
              name: g.teamB.name,
              logo: g.teamB.logo,
              score: g.teamB.score,
              linescores: g.teamB.linescores || {},
              color: g.teamB.color,
              alternateColor: g.teamB.alternateColor,
            },
            isLive: g.isLive,
            period: g.period || 0,
            clock: g.clock || null,
            kickoffISO: g.kickoffISO || undefined,
            dateDisplay: g.dateDisplay || undefined,
          })
          setTeamAName(g.teamA.name)
          setTeamBName(g.teamB.name)
          setTeamALogo(g.teamA.logo)
          setTeamBLogo(g.teamB.logo)
          if (g.kickoffISO) setKickoffISO(g.kickoffISO)

          // Update scores from ESPN linescores
          const lsA = g.teamA.linescores || {}
          const lsB = g.teamB.linescores || {}
          const isFinal = g.status === 'STATUS_FINAL'
          setScores(prev => ({
            Q1: { teamA: lsA['1'] ?? prev.Q1.teamA, teamB: lsB['1'] ?? prev.Q1.teamB },
            Q2: { teamA: lsA['2'] ?? prev.Q2.teamA, teamB: lsB['2'] ?? prev.Q2.teamB },
            Q3: { teamA: lsA['3'] ?? prev.Q3.teamA, teamB: lsB['3'] ?? prev.Q3.teamB },
            Q4: { teamA: lsA['4'] ?? prev.Q4.teamA, teamB: lsB['4'] ?? prev.Q4.teamB },
            FINAL: isFinal
              ? { teamA: String(g.teamA.score), teamB: String(g.teamB.score) }
              : prev.FINAL,
          }))
        }
      } catch (err) {
        setLiveError(err instanceof Error ? err.message : 'Failed to fetch Super Bowl')
      }
    }

    fetchSuperBowl()
    const interval = setInterval(fetchSuperBowl, 15000) // 15s for scores
    return () => clearInterval(interval)
  }, [])

  const locked = kickoffISO && Date.now() >= new Date(kickoffISO).getTime()

  const regenerate = (list = names) => setBoard(generateBoard(list))

  const addName = () => {
    if (!newName.trim() || locked) return
    const updated = [...names, newName.trim()]
    setNames(updated)
    regenerate(updated)
    setNewName('')
  }

  const removeName = (name: string) => {
    if (locked) return
    const updated = names.filter(n => n !== name)
    setNames(updated)
    regenerate(updated)
  }

  const pot = +(squareCost * 100).toFixed(2)
  const digits = Array.from({ length: 10 }, (_, i) => i)

  // Each player gets a unique color (no repeats for up to 10 players)
  const nameToColorIndex = useMemo(() => {
    const map = new Map<string, number>()
    const seen = new Set<string>()
    let idx = 0
    for (const n of names) {
      if (!seen.has(n)) {
        seen.add(n)
        map.set(n, idx % 10)
        idx++
      }
    }
    return map
  }, [names])

  // Super Bowl page: always use distinct palette (10 maximally different hues)
  const playerPalette = SUPERBOWL_TEAM_PALETTE
  const perPerson = names.length > 0 ? Math.floor(100 / names.length) : 0
  const perPersonOwes = +(perPerson * squareCost).toFixed(2)
  const filled = perPerson * names.length
  const blanks = 100 - filled

  const winners = useMemo(() => {
    const out: Record<
      PeriodKey,
      { winner: string | null; idx: number | null; teamADigit: number | null; teamBDigit: number | null }
    > = {
      Q1: { winner: null, idx: null, teamADigit: null, teamBDigit: null },
      Q2: { winner: null, idx: null, teamADigit: null, teamBDigit: null },
      Q3: { winner: null, idx: null, teamADigit: null, teamBDigit: null },
      Q4: { winner: null, idx: null, teamADigit: null, teamBDigit: null },
      FINAL: { winner: null, idx: null, teamADigit: null, teamBDigit: null },
    }

    for (const p of PERIODS) {
      const teamA = parseInt(scores[p.key].teamA, 10)
      const teamB = parseInt(scores[p.key].teamB, 10)
      if (Number.isNaN(teamA) || Number.isNaN(teamB)) continue

      const teamADigit = Math.abs(teamA) % 10
      const teamBDigit = Math.abs(teamB) % 10

      const idx = teamBDigit * 10 + teamADigit
      const name = board[idx] || null

      out[p.key] = { winner: name, idx, teamADigit, teamBDigit }
    }
    return out
  }, [scores, board])

  const updateScore = (period: PeriodKey, team: 'teamA' | 'teamB', val: string) => {
    if (val !== '' && !/^\d+$/.test(val)) return
    setScores(prev => ({
      ...prev,
      [period]: { ...prev[period], [team]: val },
    }))
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <style>{`
        @media (max-width: 640px) {
          .sb-board { --cell: 26px; --axis-w: 44px; --axis-h: 28px; }
        }
        @media (min-width: 641px) {
          .sb-board { --cell: 46px; --axis-w: 64px; --axis-h: 34px; }
        }
      `}</style>
      <div className="container mx-auto max-w-[1100px] px-3 sm:px-4 py-4 sm:py-6">
        {/* Header - stacks on mobile */}
        <div className="mb-4 sm:mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex flex-col gap-1 order-2 sm:order-1">
            {(liveGame?.dateDisplay || kickoffISO) && (
              <div className="text-sm sm:text-base font-semibold text-muted-foreground truncate max-w-[calc(100vw-2rem)]">
                {liveGame?.dateDisplay ?? (kickoffISO ? new Date(kickoffISO).toLocaleString(undefined, { dateStyle: 'full', timeStyle: 'short' }) : '')}
              </div>
            )}
            <Link to="/">
              <Button variant="ghost" size="sm" className="w-fit">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Fantasy
              </Button>
            </Link>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 order-1 sm:order-2 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-bold">Super Bowl Squares</h1>
            <ColorSchemeToggler />
            {liveGame?.isLive && (
              <span className="flex items-center gap-2 px-2 sm:px-3 py-1 rounded-full bg-green-500/20 text-green-600 dark:text-green-400 text-xs sm:text-sm font-semibold">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                Live
              </span>
            )}
            {liveError && (
              <span className="text-xs sm:text-sm text-destructive">{liveError}</span>
            )}
          </div>
        </div>

        {/* Setup Card */}
        <Card className="mb-4 sm:mb-6">
          <CardHeader>
            <CardTitle>Setup</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground block mb-2">
                  Kickoff Time {liveGame?.kickoffISO && <span className="text-xs">(from ESPN)</span>}
                </label>
                <Input
                  type="datetime-local"
                  value={kickoffISO ? toDatetimeLocal(kickoffISO) : ''}
                  onChange={e => setKickoffISO(e.target.value ? new Date(e.target.value).toISOString() : '')}
                  disabled={!!locked || !!liveGame?.kickoffISO}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground block mb-2">
                  Cost per Square ($)
                </label>
                <Input
                  type="number"
                  min={0.25}
                  step={0.25}
                  value={squareCost}
                  onChange={e => setSquareCost(+e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground block mb-2">
                  Team A (horizontal axis)
                </label>
                <Input
                  value={teamAName}
                  onChange={e => setTeamAName(e.target.value)}
                  placeholder="e.g. AFC Champion"
                  disabled={!!locked}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground block mb-2">
                  Team B (vertical axis)
                </label>
                <Input
                  value={teamBName}
                  onChange={e => setTeamBName(e.target.value)}
                  placeholder="e.g. NFC Champion"
                  disabled={!!locked}
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-1.5 sm:gap-2">
              <span className="px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-full bg-muted border border-border text-xs sm:text-sm font-semibold">
                <strong>Pot:</strong> ${pot}
              </span>
              <span className="px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-full bg-muted border border-border text-xs sm:text-sm font-semibold">
                Q1: ${(pot * 0.2).toFixed(2)}
              </span>
              <span className="px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-full bg-muted border border-border text-xs sm:text-sm font-semibold">
                Q2: ${(pot * 0.2).toFixed(2)}
              </span>
              <span className="px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-full bg-muted border border-border text-xs sm:text-sm font-semibold">
                Q3: ${(pot * 0.2).toFixed(2)}
              </span>
              <span className="px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-full bg-muted border border-border text-xs sm:text-sm font-semibold">
                <strong>Q4+Final:</strong> ${(pot * 0.4).toFixed(2)}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Scores & Winners Card */}
        <Card className="mb-4 sm:mb-6">
          <CardHeader>
            <CardTitle>Scores & Winners</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Mobile: compact cards per period */}
            <div className="block sm:hidden space-y-3">
              {PERIODS.map(p => {
                const w = winners[p.key]
                const winnerLabel =
                  w.teamADigit === null || w.teamBDigit === null
                    ? '—'
                    : w.winner
                      ? `${w.winner} (${teamAName} ${w.teamADigit}/${teamBName} ${w.teamBDigit})`
                      : `Open (${teamAName} ${w.teamADigit}/${teamBName} ${w.teamBDigit})`
                return (
                  <div key={p.key} className="flex flex-col gap-2 p-3 rounded-lg border border-border">
                    <div className="text-xs font-semibold text-muted-foreground uppercase">{p.label}</div>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1.5 flex-1 min-w-0">
                        <img src={teamALogo} alt="" className="h-5 w-5 shrink-0" />
                        <Input
                          inputMode="numeric"
                          pattern="[0-9]*"
                          placeholder="0"
                          value={scores[p.key].teamA}
                          onChange={e => updateScore(p.key, 'teamA', e.target.value)}
                          className="h-9 flex-1 min-w-0"
                        />
                      </div>
                      <span className="text-muted-foreground">–</span>
                      <div className="flex items-center gap-1.5 flex-1 min-w-0">
                        <img src={teamBLogo} alt="" className="h-5 w-5 shrink-0" />
                        <Input
                          inputMode="numeric"
                          pattern="[0-9]*"
                          placeholder="0"
                          value={scores[p.key].teamB}
                          onChange={e => updateScore(p.key, 'teamB', e.target.value)}
                          className="h-9 flex-1 min-w-0"
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-extrabold text-sm truncate">{winnerLabel}</span>
                      {w.idx !== null && w.winner && (
                        <span
                          className="w-3 h-3 rounded-full shrink-0 border border-black/10"
                          style={{ background: colorForName(w.winner, nameToColorIndex, isDark, playerPalette) }}
                          title="Winner color"
                        />
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
            {/* Desktop: table layout */}
            <div className="hidden sm:block overflow-x-auto">
              <div className="min-w-[560px]">
                <div className="grid grid-cols-[2.2fr_1fr_1fr_2.2fr] gap-2 items-center">
                  <div className="text-xs text-muted-foreground font-extrabold uppercase tracking-wider py-2">
                    Period
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground font-extrabold uppercase tracking-wider py-2">
                    <img src={teamALogo} alt={teamAName} className="h-5 w-5 object-contain" />
                    {teamAName}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground font-extrabold uppercase tracking-wider py-2">
                    <img src={teamBLogo} alt={teamBName} className="h-5 w-5 object-contain" />
                    {teamBName}
                  </div>
                  <div className="text-xs text-muted-foreground font-extrabold uppercase tracking-wider py-2">
                    Winner (square)
                  </div>
                  {PERIODS.map(p => {
                    const w = winners[p.key]
                    const winnerLabel =
                      w.teamADigit === null || w.teamBDigit === null
                        ? '—'
                        : w.winner
                          ? `${w.winner} (${teamAName} ${w.teamADigit} / ${teamBName} ${w.teamBDigit})`
                          : `Open (${teamAName} ${w.teamADigit} / ${teamBName} ${w.teamBDigit})`
                    return (
                      <React.Fragment key={p.key}>
                        <div className="py-2 border-t border-border">{p.label}</div>
                        <div className="py-2 border-t border-border">
                          <Input
                            inputMode="numeric"
                            pattern="[0-9]*"
                            placeholder="e.g. 14"
                            value={scores[p.key].teamA}
                            onChange={e => updateScore(p.key, 'teamA', e.target.value)}
                            className="h-10"
                          />
                        </div>
                        <div className="py-2 border-t border-border">
                          <Input
                            inputMode="numeric"
                            pattern="[0-9]*"
                            placeholder="e.g. 17"
                            value={scores[p.key].teamB}
                            onChange={e => updateScore(p.key, 'teamB', e.target.value)}
                            className="h-10"
                          />
                        </div>
                        <div className="py-2 border-t border-border flex items-center gap-2">
                          <span className="font-extrabold">{winnerLabel}</span>
                          {w.idx !== null && w.winner && (
                            <span
                              className="w-3 h-3 rounded-full border border-black/10"
                              style={{ background: colorForName(w.winner, nameToColorIndex, isDark, playerPalette) }}
                              title="Winner color"
                            />
                          )}
                        </div>
                      </React.Fragment>
                    )
                  })}
                </div>
              </div>
            </div>
            <p className="mt-3 text-sm text-muted-foreground">
              Enter end-of-period scores; winners are chosen by last digit.
            </p>
          </CardContent>
        </Card>

        {/* Players Card */}
        <Card className="mb-4 sm:mb-6">
          <CardHeader>
            <CardTitle>Players</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2 sm:gap-3 items-center p-2.5 sm:p-3 rounded-xl bg-muted/80 border border-border font-extrabold text-sm sm:text-base">
              <span className="text-muted-foreground">Allocation:</span>
              <span><strong>{perPerson}</strong> sq/player</span>
              <span>Owes: <strong>${perPersonOwes.toFixed(2)}</strong></span>
              <span className="text-muted-foreground">({filled} filled • {blanks} open)</span>
            </div>

            {!locked && (
              <div className="flex gap-2 flex-wrap">
                <Input
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addName()}
                  placeholder="Add name"
                  className="flex-1 min-w-[120px] sm:min-w-[150px]"
                />
                <Button onClick={addName}>Add</Button>
                <Button variant="secondary" onClick={() => regenerate()}>
                  Shuffle
                </Button>
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              {names.map(n => {
                const bg = colorForName(n, nameToColorIndex, isDark, playerPalette)
                return (
                <span
                  key={n}
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-extrabold border border-black/10"
                  style={{ background: bg, color: textColorForBg(bg) }}
                >
                  {n}
                  {!locked && (
                    <span
                      onClick={() => removeName(n)}
                      className="cursor-pointer opacity-85 pl-0.5"
                      title="Remove"
                    >
                      ×
                    </span>
                  )}
                </span>
              )})}
            </div>

            {locked && (
              <p className="text-muted-foreground text-sm">Board locked at kickoff</p>
            )}
          </CardContent>
        </Card>

        {/* Board Card */}
        <Card>
          <CardHeader>
            <CardTitle>Board</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Live score at top of Board */}
            {(liveGame || teamAName || teamBName) && (
              <div className="flex items-center justify-center gap-2 sm:gap-4 py-3 sm:py-4 mb-2 px-3 sm:px-4 rounded-xl bg-muted/80 border border-border">
                <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-1 sm:flex-initial sm:min-w-[100px] justify-end">
                  <img src={teamALogo} alt={teamAName} className="h-6 w-6 sm:h-8 sm:w-8 object-contain shrink-0" />
                  <span className="font-semibold text-right text-sm sm:text-base truncate">{teamAName}</span>
                </div>
                <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 justify-center">
                  <span className="text-xl sm:text-2xl font-bold tabular-nums">
                    {(liveGame?.teamA.score ?? scores.FINAL.teamA) || '0'}
                  </span>
                  <span className="text-muted-foreground">–</span>
                  <span className="text-xl sm:text-2xl font-bold tabular-nums">
                    {(liveGame?.teamB.score ?? scores.FINAL.teamB) || '0'}
                  </span>
                  {liveGame?.isLive && (
                    <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-green-500/20 text-green-600 dark:text-green-400 text-xs font-semibold">
                      <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                      Q{liveGame.period} {liveGame.clock || ''}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-1 sm:flex-initial sm:min-w-[100px] justify-start">
                  <span className="font-semibold text-left text-sm sm:text-base truncate">{teamBName}</span>
                  <img src={teamBLogo} alt={teamBName} className="h-6 w-6 sm:h-8 sm:w-8 object-contain shrink-0" />
                </div>
              </div>
            )}
            <div className="overflow-x-auto overflow-y-hidden pt-4 -mx-3 sm:mx-0 px-3 sm:px-0 touch-pan-x">
              <div
                className="sb-board grid gap-1 sm:gap-2 min-w-[280px] sm:min-w-[520px] max-w-full"
                style={{
                  gridTemplateColumns: 'var(--axis-w, 64px) var(--axis-h, 48px) auto',
                  columnGap: 8,
                  rowGap: 8,
                }}
              >
                {/* Team A header */}
                <div />
                <div />
                <div className="flex justify-center">
                  <div className="inline-flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 rounded-xl bg-muted border-2 border-primary font-extrabold text-xs sm:text-base">
                    <img src={teamALogo} alt={teamAName} className="h-5 w-5 sm:h-7 sm:w-7 object-contain" />
                    {teamAName}
                  </div>
                </div>

                {/* X axis digits */}
                <div />
                <div />
                <div className="grid gap-1" style={{ gridTemplateColumns: 'repeat(10, 1fr)' }}>
                  {digits.map(d => (
                    <div
                      key={d}
                      className="rounded-xl bg-muted border-2 border-primary font-extrabold flex items-center justify-center text-xs sm:text-sm select-none"
                      style={{ height: 'var(--axis-h, 34px)' }}
                    >
                      {d}
                    </div>
                  ))}
                </div>

                {/* Team B header (vertical) */}
                <div
                  className="flex justify-center items-center rounded-xl bg-muted border-2 border-destructive"
                  style={{ height: 'calc(var(--cell, 46px) * 10 + 4 * 9)' }}
                >
                  <div
                    className="flex items-center justify-center gap-1.5 sm:gap-2 font-extrabold text-xs sm:text-base"
                    style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
                  >
                    <img src={teamBLogo} alt={teamBName} className="h-5 w-5 sm:h-6 sm:w-6 object-contain" style={{ transform: 'rotate(180deg)' }} />
                    {teamBName}
                  </div>
                </div>

                {/* Y axis digits */}
                <div className="grid gap-1" style={{ gridTemplateRows: 'repeat(10, var(--cell, 46px))' }}>
                  {digits.map(d => (
                    <div
                      key={d}
                      className="rounded-xl bg-muted border-2 border-destructive font-extrabold flex items-center justify-center text-xs sm:text-sm select-none"
                    >
                      {d}
                    </div>
                  ))}
                </div>

                {/* Board grid */}
                <div
                  className="grid gap-1"
                  style={{
                    gridTemplateColumns: 'repeat(10, 1fr)',
                    gridTemplateRows: 'repeat(10, var(--cell, 46px))',
                  }}
                >
                  {board.map((name, idx) => {
                    const bg = name ? colorForName(name, nameToColorIndex, isDark, playerPalette) : 'hsl(var(--muted))'
                    const textColor = name ? textColorForBg(bg) : 'hsl(var(--muted-foreground))'
                    return (
                    <div
                      key={idx}
                      className="rounded-xl flex items-center justify-center text-center px-1 sm:px-1.5 border border-black/10 text-[10px] sm:text-xs font-extrabold leading-tight overflow-hidden"
                      style={{ background: bg, color: textColor }}
                      title={name || 'Open'}
                    >
                      {name || '—'}
                    </div>
                  )})}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default SuperBowl
