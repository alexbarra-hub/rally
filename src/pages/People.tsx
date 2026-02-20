import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import Header from '@/components/Header'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Search } from 'lucide-react'
import { toast } from 'sonner'
import type { Profile } from '@/integrations/supabase/types'

function UserRow({
  profile,
  isFollowing,
  isSelf,
  onFollow,
  onUnfollow,
  loading,
}: {
  profile: Profile
  isFollowing: boolean
  isSelf: boolean
  onFollow: () => void
  onUnfollow: () => void
  loading: boolean
}) {
  return (
    <div className="flex items-center justify-between py-3">
      <div className="flex items-center gap-3 min-w-0">
        <Avatar className="w-8 h-8 flex-shrink-0">
          <AvatarImage src={profile.avatar_url ?? undefined} />
          <AvatarFallback className="text-xs">
            {profile.username.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <p className="text-sm font-medium truncate">{profile.username}</p>
          {profile.location && (
            <p className="text-xs text-muted-foreground truncate">{profile.location}</p>
          )}
        </div>
      </div>
      {!isSelf && (
        <Button
          size="sm"
          variant={isFollowing ? 'outline' : 'default'}
          onClick={isFollowing ? onUnfollow : onFollow}
          disabled={loading}
          className="flex-shrink-0 ml-3"
        >
          {loading ? '…' : isFollowing ? 'Unfollow' : 'Follow'}
        </Button>
      )}
    </div>
  )
}

export default function People() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [actionLoading, setActionLoading] = useState<Set<string>>(new Set())

  // All profiles
  const { data: allProfiles = [] } = useQuery({
    queryKey: ['profiles_all'],
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('*').order('username')
      if (error) throw error
      return data as Profile[]
    },
  })

  // Who I follow
  const { data: followingIds = [] } = useQuery({
    queryKey: ['following', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_relationships')
        .select('following_id')
        .eq('follower_id', user!.id)
      if (error) throw error
      return data.map(r => r.following_id)
    },
  })

  // Who follows me
  const { data: followerIds = [] } = useQuery({
    queryKey: ['followers', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_relationships')
        .select('follower_id')
        .eq('following_id', user!.id)
      if (error) throw error
      return data.map(r => r.follower_id)
    },
  })

  async function follow(targetId: string) {
    if (!user) return
    setActionLoading(s => new Set(s).add(targetId))
    const { error } = await supabase.from('user_relationships').insert({
      follower_id: user.id,
      following_id: targetId,
    })
    if (error) toast.error('Failed to follow')
    setActionLoading(s => { const n = new Set(s); n.delete(targetId); return n })
    queryClient.invalidateQueries({ queryKey: ['following', user.id] })
  }

  async function unfollow(targetId: string) {
    if (!user) return
    setActionLoading(s => new Set(s).add(targetId))
    await supabase
      .from('user_relationships')
      .delete()
      .eq('follower_id', user.id)
      .eq('following_id', targetId)
    setActionLoading(s => { const n = new Set(s); n.delete(targetId); return n })
    queryClient.invalidateQueries({ queryKey: ['following', user.id] })
  }

  const profileMap = new Map(allProfiles.map(p => [p.id, p]))

  const filtered = allProfiles.filter(p =>
    p.username.toLowerCase().includes(search.toLowerCase()) ||
    (p.location ?? '').toLowerCase().includes(search.toLowerCase())
  )

  const followingProfiles = followingIds
    .map(id => profileMap.get(id))
    .filter(Boolean) as Profile[]

  const followerProfiles = followerIds
    .map(id => profileMap.get(id))
    .filter(Boolean) as Profile[]

  function renderRow(p: Profile) {
    return (
      <UserRow
        key={p.id}
        profile={p}
        isFollowing={followingIds.includes(p.id)}
        isSelf={p.id === user?.id}
        onFollow={() => follow(p.id)}
        onUnfollow={() => unfollow(p.id)}
        loading={actionLoading.has(p.id)}
      />
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="max-w-xl mx-auto px-4 py-8 space-y-6">
        <h1 className="text-xl font-bold">People</h1>
        <Tabs defaultValue="discover">
          <TabsList>
            <TabsTrigger value="discover">Discover</TabsTrigger>
            <TabsTrigger value="following">
              Following {followingIds.length > 0 && `(${followingIds.length})`}
            </TabsTrigger>
            <TabsTrigger value="followers">
              Followers {followerIds.length > 0 && `(${followerIds.length})`}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="discover" className="mt-5 space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or location…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="divide-y divide-border">
              {filtered.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4">No users found.</p>
              ) : (
                filtered.map(renderRow)
              )}
            </div>
          </TabsContent>

          <TabsContent value="following" className="mt-5">
            <div className="divide-y divide-border">
              {followingProfiles.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4">
                  You're not following anyone yet. Discover people above!
                </p>
              ) : (
                followingProfiles.map(renderRow)
              )}
            </div>
          </TabsContent>

          <TabsContent value="followers" className="mt-5">
            <div className="divide-y divide-border">
              {followerProfiles.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4">No followers yet.</p>
              ) : (
                followerProfiles.map(renderRow)
              )}
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
