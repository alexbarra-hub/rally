import { useState, useEffect } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import Header from '@/components/Header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'

export default function Profile() {
  const { user, profile } = useAuth()
  const [username, setUsername] = useState('')
  const [location, setLocation] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (profile) {
      setUsername(profile.username ?? '')
      setLocation(profile.location ?? '')
    }
  }, [profile])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!user) return
    setSaving(true)
    const { error } = await supabase
      .from('profiles')
      .update({ username: username.trim(), location: location.trim() || null })
      .eq('id', user.id)
    setSaving(false)
    if (error) toast.error(error.message)
    else toast.success('Profile updated!')
  }

  const initials = profile?.username?.slice(0, 2).toUpperCase() ?? '??'

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="max-w-md mx-auto px-4 py-8 space-y-8">
        <h1 className="text-xl font-bold">Profile</h1>

        {/* Avatar */}
        <div className="flex flex-col items-center gap-3">
          <Avatar className="w-20 h-20">
            <AvatarImage src={profile?.avatar_url ?? undefined} />
            <AvatarFallback className="text-2xl">{initials}</AvatarFallback>
          </Avatar>
          <Badge variant="outline" className="text-xs">Avatar upload coming soon</Badge>
        </div>

        {/* Form */}
        <form onSubmit={handleSave} className="space-y-5">
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={user?.email ?? ''}
              disabled
              className="opacity-60"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="your_username"
              required
              minLength={2}
              maxLength={32}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="location">Location</Label>
            <Input
              id="location"
              value={location}
              onChange={e => setLocation(e.target.value)}
              placeholder="e.g. San Francisco, CA"
              maxLength={64}
            />
          </div>

          <Button type="submit" className="w-full" disabled={saving}>
            {saving ? 'Saving…' : 'Save changes'}
          </Button>
        </form>
      </main>
    </div>
  )
}
