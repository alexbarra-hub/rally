import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import Header from '@/components/Header'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Download } from 'lucide-react'
import type { WaitlistEntry } from '@/integrations/supabase/types'

export default function Admin() {
  const { user, loading } = useAuth()
  const navigate = useNavigate()
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null)

  // Check admin role
  useEffect(() => {
    if (!user) return
    supabase.rpc('has_role', { _role: 'admin', _user_id: user.id }).then(({ data }) => {
      if (!data) navigate('/dashboard', { replace: true })
      else setIsAdmin(true)
    })
  }, [user, navigate])

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ['waitlist'],
    enabled: isAdmin === true,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('waitlist')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as WaitlistEntry[]
    },
  })

  function exportCSV() {
    const header = 'id,email,created_at'
    const rows = entries.map(e => `${e.id},${e.email},${e.created_at}`)
    const csv = [header, ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'waitlist.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  if (loading || isAdmin === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foreground" />
      </div>
    )
  }

  const now = new Date()
  const last7d = entries.filter(e => {
    const d = new Date(e.created_at)
    return (now.getTime() - d.getTime()) < 7 * 24 * 60 * 60 * 1000
  }).length
  const last24h = entries.filter(e => {
    const d = new Date(e.created_at)
    return (now.getTime() - d.getTime()) < 24 * 60 * 60 * 1000
  }).length

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="max-w-3xl mx-auto px-4 py-8 space-y-8">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">Admin — Waitlist</h1>
          <Button size="sm" variant="outline" onClick={exportCSV} disabled={entries.length === 0}>
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="border border-border rounded-xl p-4">
            <p className="text-xs text-muted-foreground mb-1">Total</p>
            <p className="text-2xl font-bold">{entries.length}</p>
          </div>
          <div className="border border-border rounded-xl p-4">
            <p className="text-xs text-muted-foreground mb-1">Last 7 days</p>
            <p className="text-2xl font-bold">{last7d}</p>
          </div>
          <div className="border border-border rounded-xl p-4">
            <p className="text-xs text-muted-foreground mb-1">Last 24h</p>
            <p className="text-2xl font-bold">{last24h}</p>
          </div>
        </div>

        {/* Table */}
        <div className="border border-border rounded-xl overflow-hidden">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground text-sm animate-pulse">
              Loading…
            </div>
          ) : entries.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-sm">
              No waitlist entries yet.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Email</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">Joined</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {entries.map((e, i) => (
                  <tr key={e.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs">{e.email}</td>
                    <td className="px-4 py-3 text-right text-muted-foreground text-xs">
                      <div className="flex items-center justify-end gap-2">
                        {i < 3 && <Badge variant="outline" className="text-[10px]">new</Badge>}
                        {new Date(e.created_at).toLocaleDateString()}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>
    </div>
  )
}
