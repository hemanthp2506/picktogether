/**
 * Home - create a room with a question, then jump to the room page.
 */

import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { AuthOverlay, useAuthProfileReady, useMutations } from 'deepspace'
import { Button, Input, Label, useToast } from '@/components/ui'

type Room = { question: string }

export default function HomePage() {
  const { isSignedIn } = useAuthProfileReady({ requireUser: true })
  const [showAuthModal, setShowAuthModal] = useState(false)

  return (
    <div className="min-h-full text-foreground">
      <div className="mx-auto max-w-xl px-6 py-20">
        <h1 className="text-4xl font-bold tracking-tight">Decide together</h1>
        <p className="mt-3 text-muted-foreground">
          Ask a question, share the link, and let everyone add options and vote.
        </p>

        <div className="mt-10 rounded-lg border border-border bg-card p-6">
          {isSignedIn ? (
            <CreateRoomForm />
          ) : (
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Sign in to create a room.</p>
              <Button className="mt-4" onClick={() => setShowAuthModal(true)}>
                Sign in
              </Button>
            </div>
          )}
        </div>
      </div>

      {showAuthModal && <AuthOverlay onClose={() => setShowAuthModal(false)} />}
    </div>
  )
}

function CreateRoomForm() {
  const { ready, createConfirmed } = useMutations<Room>('rooms')
  const navigate = useNavigate()
  const { error } = useToast()
  const [question, setQuestion] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const trimmed = question.trim()
    if (!trimmed) return

    setSubmitting(true)
    try {
      // Confirmed: wait for the server to accept the room before navigating to it.
      const roomId = await createConfirmed({ question: trimmed })
      navigate(`/room/${roomId}`)
    } catch (err) {
      error('Could not create room', String(err))
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="question">Your question</Label>
        <Input
          id="question"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Where should we eat Friday?"
          maxLength={200}
          autoFocus
        />
      </div>
      <Button type="submit" className="w-full" disabled={!ready || submitting || !question.trim()}>
        {submitting ? 'Creating…' : 'Create room'}
      </Button>
    </form>
  )
}
