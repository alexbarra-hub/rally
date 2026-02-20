import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { formatDistanceToNow } from 'date-fns'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import Header from '@/components/Header'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Heart } from 'lucide-react'
import { toast } from 'sonner'

function formatSeconds(s: number) {
  if (s < 60) return `${s}s`
  const m = Math.floor(s / 60)
  const sec = s % 60
  return sec > 0 ? `${m}m ${sec}s` : `${m}m`
}

type FeedItem = {
  id: string
  user_id: string
  duration_seconds: number
  completed_at: string
  profiles: { username: string; avatar_url: string | null } | null
  task_types: { name: string; icon: string } | null
  likes: string[] // array of user_ids who liked
}

export default function Feed() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [likeLoading, setLikeLoading] = useState<Set<string>>(new Set())

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['feed'],
    queryFn: async () => {
      const { data: tasks, error } = await supabase
        .from('tasks')
        .select(`
          id,
          user_id,
          duration_seconds,
          completed_at,
          profiles(username, avatar_url),
          task_types(name, icon),
          task_likes(user_id)
        `)
        .order('completed_at', { ascending: false })
        .limit(50)
      if (error) throw error
      return (tasks as Array<{
        id: string
        user_id: string
        duration_seconds: number
        completed_at: string
        profiles: { username: string; avatar_url: string | null } | null
        task_types: { name: string; icon: string } | null
        task_likes: Array<{ user_id: string }>
      }>).map(t => ({
        ...t,
        likes: t.task_likes.map(l => l.user_id),
      })) as FeedItem[]
    },
  })

  async function toggleLike(item: FeedItem) {
    if (!user) return
    const liked = item.likes.includes(user.id)
    setLikeLoading(s => new Set(s).add(item.id))
    if (liked) {
      await supabase.from('task_likes').delete().eq('task_id', item.id).eq('user_id', user.id)
    } else {
      const { error } = await supabase.from('task_likes').insert({ task_id: item.id, user_id: user.id })
      if (error && error.code !== '23505') toast.error('Failed to like')
    }
    setLikeLoading(s => { const next = new Set(s); next.delete(item.id); return next })
    queryClient.invalidateQueries({ queryKey: ['feed'] })
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="max-w-xl mx-auto px-4 py-8">
        <h1 className="text-xl font-bold mb-6">Feed</h1>

        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="border border-border rounded-xl p-4 animate-pulse">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-8 h-8 rounded-full bg-muted" />
                  <div className="h-4 bg-muted rounded w-32" />
                </div>
                <div className="h-4 bg-muted rounded w-48" />
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <p className="text-muted-foreground text-sm text-center py-12">
            No activity yet. Complete a task to appear here!
          </p>
        ) : (
          <div className="space-y-3">
            {items.map(item => {
              const liked = user ? item.likes.includes(user.id) : false
              return (
                <div key={item.id} className="border border-border rounded-xl p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Avatar className="w-8 h-8 flex-shrink-0">
                        <AvatarImage src={item.profiles?.avatar_url ?? undefined} />
                        <AvatarFallback className="text-xs">
                          {item.profiles?.username?.slice(0, 2).toUpperCase() ?? '??'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">
                          {item.profiles?.username ?? 'Unknown'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(item.completed_at), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => toggleLike(item)}
                      disabled={likeLoading.has(item.id)}
                      className={`flex items-center gap-1 text-xs transition-colors flex-shrink-0 ${
                        liked ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <Heart className={`w-4 h-4 ${liked ? 'fill-current' : ''}`} />
                      {item.likes.length > 0 && <span>{item.likes.length}</span>}
                    </button>
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    <span className="text-lg">{item.task_types?.icon ?? '📋'}</span>
                    <span className="text-sm text-muted-foreground">
                      Completed <strong className="text-foreground">{item.task_types?.name ?? 'task'}</strong> in{' '}
                      <strong className="text-foreground font-mono">
                        {formatSeconds(item.duration_seconds)}
                      </strong>
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
