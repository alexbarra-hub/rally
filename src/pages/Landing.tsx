import { useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Zap, Trophy, Timer, Users } from 'lucide-react'
import { toast } from 'sonner'

type AuthMode = 'signin' | 'signup'

export default function Landing() {
  const [waitlistEmail, setWaitlistEmail] = useState('')
  const [waitlistLoading, setWaitlistLoading] = useState(false)
  const [waitlistDone, setWaitlistDone] = useState(false)

  const [authOpen, setAuthOpen] = useState(false)
  const [authMode, setAuthMode] = useState<AuthMode>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [authLoading, setAuthLoading] = useState(false)

  async function handleWaitlist(e: React.FormEvent) {
    e.preventDefault()
    setWaitlistLoading(true)
    const { error } = await supabase.from('waitlist').insert({ email: waitlistEmail })
    setWaitlistLoading(false)
    if (error) {
      if (error.code === '23505') toast.error('You\'re already on the list!')
      else toast.error('Something went wrong. Try again.')
    } else {
      setWaitlistDone(true)
      toast.success('You\'re on the list!')
    }
  }

  async function handleAuth(e: React.FormEvent) {
    e.preventDefault()
    setAuthLoading(true)
    if (authMode === 'signup') {
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) toast.error(error.message)
      else toast.success('Check your email to confirm your account!')
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) toast.error(error.message)
    }
    setAuthLoading(false)
  }

  async function handleForgotPassword() {
    if (!email) { toast.error('Enter your email first'); return }
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    if (error) toast.error(error.message)
    else toast.success('Password reset email sent!')
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Nav */}
      <header className="border-b border-border">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-1.5 font-bold text-lg">
            <Zap className="w-5 h-5" /> Rally
          </div>
          <button
            onClick={() => { setAuthMode('signin'); setAuthOpen(true) }}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Sign in
          </button>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 text-center py-20">
        <div className="max-w-2xl space-y-6">
          <div className="inline-flex items-center gap-2 text-xs font-medium bg-muted text-muted-foreground px-3 py-1.5 rounded-full">
            <Zap className="w-3 h-3" /> Built for the ADHD brain
          </div>

          <h1 className="text-5xl sm:text-6xl font-bold tracking-tight leading-tight">
            Turn procrastination<br />into <span className="underline decoration-4">action</span>.
          </h1>

          <p className="text-xl text-muted-foreground max-w-lg mx-auto leading-relaxed">
            Rally turns mundane household tasks into timed challenges with social competition.
            Urgency that actually works.
          </p>

          {/* Waitlist */}
          {waitlistDone ? (
            <div className="bg-muted rounded-xl p-6 max-w-sm mx-auto">
              <p className="font-semibold">You're on the list 🎉</p>
              <p className="text-sm text-muted-foreground mt-1">We'll let you know when you're in.</p>
            </div>
          ) : (
            <form onSubmit={handleWaitlist} className="flex flex-col sm:flex-row gap-2 max-w-sm mx-auto">
              <Input
                type="email"
                placeholder="your@email.com"
                value={waitlistEmail}
                onChange={e => setWaitlistEmail(e.target.value)}
                required
                className="flex-1"
              />
              <Button type="submit" disabled={waitlistLoading}>
                {waitlistLoading ? 'Joining…' : 'Join waitlist'}
              </Button>
            </form>
          )}

          <button
            onClick={() => { setAuthMode('signin'); setAuthOpen(true) }}
            className="text-sm text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors"
          >
            Already have an account? Sign in
          </button>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl w-full mt-20">
          {[
            { icon: Timer, title: 'Timed Challenges', desc: 'Race against the clock on everyday tasks. The stopwatch keeps you honest.' },
            { icon: Trophy, title: 'Leaderboards', desc: 'See how you stack up against others. Daily rankings per task type.' },
            { icon: Users, title: 'Social Feed', desc: 'Cheer on friends, like their wins, build streaks together.' },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="text-left p-5 rounded-xl border border-border">
              <Icon className="w-5 h-5 mb-3" />
              <h3 className="font-semibold mb-1">{title}</h3>
              <p className="text-sm text-muted-foreground">{desc}</p>
            </div>
          ))}
        </div>
      </main>

      {/* Auth Dialog */}
      <Dialog open={authOpen} onOpenChange={setAuthOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{authMode === 'signin' ? 'Sign in' : 'Create account'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAuth} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} />
            </div>
            <Button type="submit" className="w-full" disabled={authLoading}>
              {authLoading ? 'Loading…' : authMode === 'signin' ? 'Sign in' : 'Create account'}
            </Button>
          </form>

          <div className="flex flex-col items-center gap-2 pt-2 text-sm">
            {authMode === 'signin' && (
              <button onClick={handleForgotPassword} className="text-muted-foreground hover:text-foreground transition-colors">
                Forgot password?
              </button>
            )}
            <button
              onClick={() => setAuthMode(m => m === 'signin' ? 'signup' : 'signin')}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              {authMode === 'signin' ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
