/**
 * Room page - reached at /room/:roomId. Sign-in is required because it sits
 * under (protected)/.
 *
 * Step 1: shows the question and a copy-link button. Options and votes come next.
 */

import { useParams, Link } from 'react-router-dom'
import { useQuery } from 'deepspace'
import { Button, useToast } from '@/components/ui'

type Room = { question: string }

export default function RoomPage() {
  const { roomId } = useParams<{ roomId: string }>()
  const { success, error } = useToast()
  // Rooms are few and small, so we subscribe to all of them and pick this one.
  const { records, status } = useQuery<Room>('rooms')
  const room = records.find((r) => r.recordId === roomId)

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href)
      success('Link copied', 'Send it to your group.')
    } catch {
      error('Could not copy link', window.location.href)
    }
  }

  if (status === 'loading') {
    return <p className="px-6 py-20 text-center text-muted-foreground">Loading room…</p>
  }

  if (!room) {
    return (
      <div className="px-6 py-20 text-center">
        <p className="text-muted-foreground">This room doesn&apos;t exist.</p>
        <Link to="/home" className="mt-4 inline-block text-sm underline underline-offset-4">
          Create a new room
        </Link>
      </div>
    )
  }

  return (
    <div className="min-h-full text-foreground">
      <div className="mx-auto max-w-xl px-6 py-20">
        <p className="text-sm text-muted-foreground">Question</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">{room.data.question}</h1>
        <Button variant="secondary" className="mt-6" onClick={copyLink}>
          Copy room link
        </Button>
      </div>
    </div>
  )
}
