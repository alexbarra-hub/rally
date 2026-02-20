import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import Header from '@/components/Header'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'

function formatSeconds(s: number) {
  if (s < 60) return `${s}s`
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  if (h > 0) return sec > 0 ? `${h}h ${m}m` : `${h}h ${m}m`
  return sec > 0 ? `${m}m ${sec}s` : `${m}m`
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function useReviewData(userId: string | undefined, start: Date, end: Date) {
  return useQuery({
    queryKey: ['review', userId, start.toISOString(), end.toISOString()],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tasks')
        .select('duration_seconds, completed_at, task_types(name, icon)')
        .eq('user_id', userId!)
        .gte('completed_at', start.toISOString())
        .lt('completed_at', end.toISOString())
      if (error) throw error
      return data as Array<{
        duration_seconds: number
        completed_at: string
        task_types: { name: string; icon: string } | null
      }>
    },
  })
}

function StatGrid({ count, totalTime }: { count: number; totalTime: number }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="border border-border rounded-xl p-4">
        <p className="text-xs text-muted-foreground mb-1">Tasks</p>
        <p className="text-2xl font-bold">{count}</p>
      </div>
      <div className="border border-border rounded-xl p-4">
        <p className="text-xs text-muted-foreground mb-1">Total time</p>
        <p className="text-2xl font-bold">{totalTime > 0 ? formatSeconds(totalTime) : '—'}</p>
      </div>
    </div>
  )
}

function BreakdownList(
  tasks: Array<{ duration_seconds: number; task_types: { name: string; icon: string } | null }>
) {
  const map = new Map<string, { name: string; icon: string; count: number; total: number }>()
  for (const t of tasks) {
    const key = t.task_types?.name ?? 'Unknown'
    const existing = map.get(key)
    if (existing) {
      existing.count++
      existing.total += t.duration_seconds
    } else {
      map.set(key, {
        name: t.task_types?.name ?? 'Unknown',
        icon: t.task_types?.icon ?? '📋',
        count: 1,
        total: t.duration_seconds,
      })
    }
  }
  const entries = Array.from(map.values()).sort((a, b) => b.count - a.count)

  if (entries.length === 0) return <p className="text-sm text-muted-foreground">No tasks in this period.</p>
  return (
    <div className="space-y-2">
      {entries.map(e => (
        <div key={e.name} className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <span>{e.icon}</span>
            <span>{e.name}</span>
            <Badge variant="outline" className="text-xs">{e.count}×</Badge>
          </div>
          <span className="text-muted-foreground font-mono text-xs">{formatSeconds(e.total)}</span>
        </div>
      ))}
    </div>
  )
}

function MonthlyReview({ userId }: { userId: string }) {
  const now = new Date()
  const months = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    return { label: `${MONTHS[d.getMonth()]} ${d.getFullYear()}`, date: d }
  })
  const [selectedIdx, setSelectedIdx] = useState(0)
  const selected = months[selectedIdx]
  const start = new Date(selected.date.getFullYear(), selected.date.getMonth(), 1)
  const end = new Date(selected.date.getFullYear(), selected.date.getMonth() + 1, 1)

  const { data = [], isLoading } = useReviewData(userId, start, end)
  const count = data.length
  const totalTime = data.reduce((sum, t) => sum + t.duration_seconds, 0)

  return (
    <div className="space-y-5">
      <div className="flex gap-2 flex-wrap">
        {months.map((m, i) => (
          <button
            key={m.label}
            onClick={() => setSelectedIdx(i)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              i === selectedIdx
                ? 'bg-foreground text-background border-foreground'
                : 'border-border text-muted-foreground hover:border-foreground hover:text-foreground'
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>
      {isLoading ? (
        <div className="animate-pulse space-y-3">
          <div className="h-20 bg-muted rounded-xl" />
          <div className="h-20 bg-muted rounded-xl" />
        </div>
      ) : (
        <>
          <StatGrid count={count} totalTime={totalTime} />
          <div className="border border-border rounded-xl p-5 space-y-3">
            <h3 className="text-sm font-semibold">By task type</h3>
            {BreakdownList(data)}
          </div>
        </>
      )}
    </div>
  )
}

function YearlyReview({ userId }: { userId: string }) {
  const now = new Date()
  const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - i)
  const [selectedYear, setSelectedYear] = useState(years[0])
  const start = new Date(selectedYear, 0, 1)
  const end = new Date(selectedYear + 1, 0, 1)

  const { data = [], isLoading } = useReviewData(userId, start, end)
  const count = data.length
  const totalTime = data.reduce((sum, t) => sum + t.duration_seconds, 0)

  return (
    <div className="space-y-5">
      <div className="flex gap-2 flex-wrap">
        {years.map(y => (
          <button
            key={y}
            onClick={() => setSelectedYear(y)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              y === selectedYear
                ? 'bg-foreground text-background border-foreground'
                : 'border-border text-muted-foreground hover:border-foreground hover:text-foreground'
            }`}
          >
            {y}
          </button>
        ))}
      </div>
      {isLoading ? (
        <div className="animate-pulse space-y-3">
          <div className="h-20 bg-muted rounded-xl" />
          <div className="h-20 bg-muted rounded-xl" />
        </div>
      ) : (
        <>
          <StatGrid count={count} totalTime={totalTime} />
          <div className="border border-border rounded-xl p-5 space-y-3">
            <h3 className="text-sm font-semibold">By task type</h3>
            {BreakdownList(data)}
          </div>
        </>
      )}
    </div>
  )
}

export default function Review() {
  const { user } = useAuth()

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        <h1 className="text-xl font-bold">Review</h1>
        <Tabs defaultValue="monthly">
          <TabsList>
            <TabsTrigger value="monthly">Monthly</TabsTrigger>
            <TabsTrigger value="yearly">Yearly</TabsTrigger>
          </TabsList>
          <TabsContent value="monthly" className="mt-6">
            {user && <MonthlyReview userId={user.id} />}
          </TabsContent>
          <TabsContent value="yearly" className="mt-6">
            {user && <YearlyReview userId={user.id} />}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
