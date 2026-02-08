import React, { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Plus, LayoutGrid, ExternalLink } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import ColorSchemeToggler from '../components/ColorSchemeToggler'
import { listSuperBowlSquares, createSuperBowlSquares } from '../services/api'

const SuperBowlLanding: React.FC = () => {
  const navigate = useNavigate()
  const [boards, setBoards] = useState<{ id: string; name: string; teamAName: string; teamBName: string; lastUpdated?: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')

  const fetchBoards = async () => {
    try {
      const res = await listSuperBowlSquares(50)
      if (res.success && Array.isArray(res.boards)) {
        setBoards(res.boards.map((b: { id: string; name?: string; teamAName?: string; teamBName?: string; lastUpdated?: string }) => ({
          id: b.id,
          name: b.name || 'Untitled',
          teamAName: b.teamAName || 'AFC',
          teamBName: b.teamBName || 'NFC',
          lastUpdated: b.lastUpdated
        })))
      }
    } catch {
      setBoards([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchBoards()
  }, [])

  const handleCreate = async () => {
    if (creating) return
    setCreating(true)
    try {
      const res = await createSuperBowlSquares({ name: newName.trim() || undefined })
      if (res.success && res.id) {
        navigate(`/superbowl/${res.id}`)
        return
      }
    } catch {
      setCreating(false)
    }
    setCreating(false)
  }

  const formatDate = (iso?: string) => {
    if (!iso) return ''
    try {
      return new Date(iso).toLocaleDateString(undefined, { dateStyle: 'short', timeStyle: 'short' })
    } catch {
      return ''
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="container mx-auto max-w-[800px] px-3 sm:px-4 py-4 sm:py-6 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <div className="mb-6 flex flex-wrap items-center gap-2 sm:gap-3">
          <h1 className="text-xl sm:text-2xl font-bold">Super Bowl Squares</h1>
          <ColorSchemeToggler />
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Create New Board
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <Input
                placeholder="Board name (optional, e.g. Work pool)"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleCreate()}
                className="flex-1 min-w-[180px]"
              />
              <Button onClick={handleCreate} disabled={creating}>
                {creating ? 'Creating…' : 'Create'}
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              Each board gets a unique shareable link. Share it with participants to view or edit.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LayoutGrid className="h-5 w-5" />
              Your Boards
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-muted-foreground">Loading…</p>
            ) : boards.length === 0 ? (
              <p className="text-muted-foreground">No boards yet. Create one above.</p>
            ) : (
              <ul className="space-y-2">
                {boards.map(b => (
                  <li key={b.id}>
                    <Link
                      to={`/superbowl/${b.id}`}
                      className="flex items-center justify-between gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                    >
                      <div className="min-w-0 flex-1">
                        <span className="font-semibold">{b.name || 'Untitled'}</span>
                        <span className="text-muted-foreground text-sm ml-2">
                          {b.teamAName} vs {b.teamBName}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {b.lastUpdated && (
                          <span className="text-xs text-muted-foreground hidden sm:inline">
                            {formatDate(b.lastUpdated)}
                          </span>
                        )}
                        <ExternalLink className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default SuperBowlLanding
