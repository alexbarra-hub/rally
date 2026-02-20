import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import Header from '@/components/Header'
import { Trophy, Clock, Zap, Flame } from 'lucide-react'

function formatSeconds(s: number) {
  if (s < 3600) {
    const m = Math.floor(s / 60)
    const sec = s % 60
    return sec > 0 ? `${m}m ${sec}s` : `${m}m`
  }
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: React.ElementType
  label: string
  value: string
  sub?: string
}) {
  return (
    <div className="border border-border rounded-xl p-5 space-y-3">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="w-4 h-4" />
        <span className="text-xs font-medium uppercase tracking-wide">{label}</span>
      </div>
      <p className="text-3xl font-bold">{value}</p>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
    </div>
  )
}

export default function Stats() {
  const { user } = useAuth()

  const { data, isLoading } = useQuery({
    queryKey: ['stats', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data: tasks, error } = await supabase
        .from('tasks')
        .select('duration_seconds, completed_at, task_types(name)')
        .eq('user_id', user!.id)
        .order('completed_at', { ascending: true })
      if (error) throw error

      const total = tasks.length
      const totalTime = tasks.reduce((sum, t) => sum + t.duration_seconds, 0)
      const best = tasks.length > 0 ? Math.min(...tasks.map(t => t.duration_seconds)) : 0

      // Streak: count consecutive days up to today with at least one task
      let streak = 0
      if (tasks.length > 0) {
        const days = new Set(tasks.map(t => t.completed_at.slice(0, 10)))
        const today = new Date()
        let cursor = new Date(today.getFullYear(), today.getMonth(), today.getDate())
        while (days.has(cursor.toISOString().slice(0, 10))) {
          streak++
          cursor.setDate(cursor.getDate() - 1)
        }
      }

      const bestTask = tasks.length > 0
        ? tasks.reduce((a, b) => a.duration_seconds < b.duration_seconds ? a : b)
        : null

      return { total, totalTime, best, streak, bestTaskName: bestTask?.task_types?.name ?? null }
    },
  })

  const loading = isLoading || !data

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        <h1 className="text-xl font-bold">Stats</h1>
        {loading ? (
          <div className="grid grid-cols-2 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="border border-border rounded-xl p-5 h-28 animate-pulse bg-muted" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            <StatCard
              icon={Zap}
              label="Total tasks"
              value={String(data.total)}
            />
            <StatCard
              icon={Clock}
              label="Total time"
              value={data.totalTime > 0 ? formatSeconds(data.totalTime) : '—'}
            />
            <StatCard
              icon={Trophy}
              label="Personal best"
              value={data.best > 0 ? formatSeconds(data.best) : '—'}
              sub={data.bestTaskName ?? undefined}
            />
            <StatCard
              icon={Flame}
              label="Current streak"
              value={data.streak > 0 ? `${data.streak}d` : '—'}
              sub={data.streak > 0 ? 'days in a row' : 'No active streak'}
            />
          </div>
        )}
      </main>
    </div>
  )
}
