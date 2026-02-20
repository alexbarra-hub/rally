import { useState, useEffect, useRef, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import Header from '@/components/Header'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Play, Pause, RotateCcw, CheckCircle } from 'lucide-react'
import { toast } from 'sonner'
import type { TaskType } from '@/integrations/supabase/types'

function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function formatSeconds(s: number) {
  if (s < 60) return `${s}s`
  const m = Math.floor(s / 60)
  const sec = s % 60
  return sec > 0 ? `${m}m ${sec}s` : `${m}m`
}

// ── TaskSelector ─────────────────────────────────────────────────────────────
function TaskSelector({
  selected,
  onSelect,
}: {
  selected: TaskType | null
  onSelect: (t: TaskType) => void
}) {
  const { data: taskTypes = [] } = useQuery({
    queryKey: ['task_types'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('task_types')
        .select('*')
        .order('name')
      if (error) throw error
      return data as TaskType[]
    },
  })

  return (
    <div>
      <h2 className="text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wide">
        Choose a task
      </h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
        {taskTypes.map(t => (
          <button
            key={t.id}
            onClick={() => onSelect(t)}
            className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border text-sm font-medium transition-colors ${
              selected?.id === t.id
                ? 'bg-foreground text-background border-foreground'
                : 'border-border hover:border-foreground hover:bg-accent'
            }`}
          >
            <span className="text-2xl">{t.icon}</span>
            <span className="text-xs leading-tight text-center">{t.name}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

// ── TaskTimer ─────────────────────────────────────────────────────────────────
function TaskTimer({
  taskType,
  onComplete,
}: {
  taskType: TaskType | null
  onComplete: () => void
}) {
  const { user } = useAuth()
  const [elapsed, setElapsed] = useState(0)
  const [running, setRunning] = useState(false)
  const [saving, setSaving] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    setElapsed(0)
    setRunning(false)
    if (intervalRef.current) clearInterval(intervalRef.current)
  }, [taskType?.id])

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => setElapsed(s => s + 1), 1000)
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [running])

  const handleReset = useCallback(() => {
    setRunning(false)
    setElapsed(0)
  }, [])

  async function handleComplete() {
    if (!user || !taskType || elapsed === 0) return
    setSaving(true)
    const { error } = await supabase.from('tasks').insert({
      user_id: user.id,
      task_type_id: taskType.id,
      duration_seconds: elapsed,
    })
    setSaving(false)
    if (error) {
      toast.error('Failed to save task')
    } else {
      toast.success(`${taskType.name} done in ${formatSeconds(elapsed)}! 🎉`)
      handleReset()
      onComplete()
    }
  }

  if (!taskType) {
    return (
      <div className="border border-border rounded-xl p-8 text-center text-muted-foreground text-sm">
        Select a task above to start the timer
      </div>
    )
  }

  return (
    <div className="border border-border rounded-xl p-6 space-y-5">
      <div className="flex items-center gap-2">
        <span className="text-xl">{taskType.icon}</span>
        <h3 className="font-semibold">{taskType.name}</h3>
      </div>

      <div className="text-center py-4">
        <span className="text-6xl font-mono font-bold tabular-nums">
          {formatDuration(elapsed)}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="icon"
          onClick={() => setRunning(r => !r)}
          className="flex-shrink-0"
        >
          {running ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={handleReset}
          className="flex-shrink-0"
        >
          <RotateCcw className="w-4 h-4" />
        </Button>
        <Button
          className="flex-1"
          onClick={handleComplete}
          disabled={elapsed === 0 || saving}
        >
          <CheckCircle className="w-4 h-4 mr-2" />
          {saving ? 'Saving…' : 'Complete'}
        </Button>
      </div>
    </div>
  )
}

// ── Leaderboard ───────────────────────────────────────────────────────────────
function Leaderboard({
  taskTypes,
  refreshKey,
}: {
  taskTypes: TaskType[]
  refreshKey: number
}) {
  const [activeTab, setActiveTab] = useState<string>('')

  useEffect(() => {
    if (taskTypes.length && !activeTab) setActiveTab(taskTypes[0]?.id ?? '')
  }, [taskTypes, activeTab])

  const { data: rows = [] } = useQuery({
    queryKey: ['leaderboard', activeTab, refreshKey],
    enabled: !!activeTab,
    queryFn: async () => {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const { data, error } = await supabase
        .from('tasks')
        .select('user_id, duration_seconds, profiles(username, avatar_url)')
        .eq('task_type_id', activeTab)
        .gte('completed_at', today.toISOString())
      if (error) throw error
      // aggregate by user
      const map = new Map<string, { username: string; avatar_url: string | null; total: number }>()
      for (const row of data as Array<{ user_id: string; duration_seconds: number; profiles: { username: string; avatar_url: string | null } | null }>) {
        const existing = map.get(row.user_id)
        const username = row.profiles?.username ?? 'Unknown'
        const avatar_url = row.profiles?.avatar_url ?? null
        if (existing) {
          existing.total += row.duration_seconds
        } else {
          map.set(row.user_id, { username, avatar_url, total: row.duration_seconds })
        }
      }
      return Array.from(map.entries())
        .map(([id, v]) => ({ id, ...v }))
        .sort((a, b) => a.total - b.total)
        .slice(0, 10)
    },
  })

  if (!taskTypes.length) return null

  return (
    <div className="border border-border rounded-xl p-5 space-y-4">
      <h2 className="font-semibold">Today's Leaderboard</h2>
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex w-full overflow-x-auto h-auto gap-1 justify-start">
          {taskTypes.map(t => (
            <TabsTrigger key={t.id} value={t.id} className="text-xs flex-shrink-0">
              {t.icon} {t.name}
            </TabsTrigger>
          ))}
        </TabsList>
        {taskTypes.map(t => (
          <TabsContent key={t.id} value={t.id}>
            {rows.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">No completions today yet.</p>
            ) : (
              <ol className="space-y-2 mt-2">
                {rows.map((row, i) => (
                  <li key={row.id} className="flex items-center gap-3">
                    <span className="text-sm font-mono text-muted-foreground w-5 text-right">
                      {i + 1}
                    </span>
                    <Avatar className="w-6 h-6">
                      <AvatarImage src={row.avatar_url ?? undefined} />
                      <AvatarFallback className="text-[10px]">
                        {row.username.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm flex-1 truncate">{row.username}</span>
                    <Badge variant="outline" className="font-mono text-xs">
                      {formatSeconds(row.total)}
                    </Badge>
                  </li>
                ))}
              </ol>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  )
}

// ── PersonalTimes ─────────────────────────────────────────────────────────────
function PersonalTimes({
  taskType,
  refreshKey,
}: {
  taskType: TaskType | null
  refreshKey: number
}) {
  const { user } = useAuth()

  const { data: times = [] } = useQuery({
    queryKey: ['personal_times', taskType?.id, user?.id, refreshKey],
    enabled: !!taskType && !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tasks')
        .select('id, duration_seconds, completed_at')
        .eq('user_id', user!.id)
        .eq('task_type_id', taskType!.id)
        .order('completed_at', { ascending: false })
        .limit(20)
      if (error) throw error
      return data
    },
  })

  if (!taskType) return null

  return (
    <div className="border border-border rounded-xl p-5 space-y-3">
      <h2 className="font-semibold">Your Recent Times</h2>
      {times.length === 0 ? (
        <p className="text-sm text-muted-foreground">No completions yet for {taskType.name}.</p>
      ) : (
        <ol className="space-y-1.5">
          {times.map((t, i) => (
            <li key={t.id} className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {new Date(t.completed_at).toLocaleDateString()}
              </span>
              <Badge variant={i === 0 ? 'default' : 'outline'} className="font-mono text-xs">
                {formatSeconds(t.duration_seconds)}
              </Badge>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}

// ── Dashboard Page ─────────────────────────────────────────────────────────────
export default function Dashboard() {
  const [selectedTask, setSelectedTask] = useState<TaskType | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  const { data: taskTypes = [] } = useQuery({
    queryKey: ['task_types'],
    queryFn: async () => {
      const { data, error } = await supabase.from('task_types').select('*').order('name')
      if (error) throw error
      return data as TaskType[]
    },
  })

  function handleComplete() {
    setRefreshKey(k => k + 1)
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        <TaskSelector selected={selectedTask} onSelect={setSelectedTask} />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-6">
            <TaskTimer taskType={selectedTask} onComplete={handleComplete} />
            <PersonalTimes taskType={selectedTask} refreshKey={refreshKey} />
          </div>
          <Leaderboard taskTypes={taskTypes} refreshKey={refreshKey} />
        </div>
      </main>
    </div>
  )
}
