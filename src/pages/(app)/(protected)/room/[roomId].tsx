/**
 * Room page - reached at /room/:roomId. Sign-in is required because it sits
 * under (protected)/.
 *
 * Shows the question, lets anyone add options, and lets each person cast one
 * vote. Counts are computed from the live `votes` records, so they update for
 * everyone as soon as the server broadcasts a change.
 */

import { useState, type FormEvent } from 'react'
import { useParams, Link } from 'react-router-dom'
import { getAuthToken, useMutations, useQuery, useUser, type RecordData } from 'deepspace'
import { Button, Input, cn, useToast } from '@/components/ui'

type Room = { question: string }
type Option = { roomId: string; label: string }
// `userId` is stamped by the server (userBound), so we never send it.
type VoteInput = { roomId: string; optionId: string }
type Vote = VoteInput & { userId: string }

export default function RoomPage() {
  const { roomId = '' } = useParams<{ roomId: string }>()
  const { user } = useUser()
  const { success, error } = useToast()

  // Rooms are few and small, so we subscribe to all of them and pick this one.
  const { records: rooms, status } = useQuery<Room>('rooms')
  const room = rooms.find((r) => r.recordId === roomId)

  // Only this room's options and votes; `where` is applied on the server.
  const { records: options } = useQuery<Option>('options', {
    where: { roomId },
    orderBy: 'createdAt',
    orderDir: 'asc',
  })
  const { records: votes } = useQuery<Vote>('votes', { where: { roomId } })

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

  const myVote = votes.find((v) => v.data.userId === user?.id)

  return (
    <div className="min-h-full text-foreground">
      <div className="mx-auto max-w-xl px-6 py-20">
        <p className="text-sm text-muted-foreground">Question</p>
        <h1 data-testid="room-question" className="mt-1 text-3xl font-bold tracking-tight">{room.data.question}</h1>
        <Button variant="secondary" className="mt-6" onClick={copyLink}>
          Copy room link
        </Button>

        <section className="mt-10 space-y-3">
          <div className="flex items-baseline justify-between">
            <h2 className="text-lg font-semibold">Options</h2>
            <p data-testid="vote-total" className="text-sm text-muted-foreground">
              {votes.length} {votes.length === 1 ? 'vote' : 'votes'}
            </p>
          </div>
          <OptionList roomId={roomId} options={options} votes={votes} myVote={myVote} />
          <AddOptionForm roomId={roomId} />
        </section>

        <PlaceSearch roomId={roomId} existingLabels={options.map((o) => o.data.label)} />
        <AiSummary roomId={roomId} totalVotes={votes.length} />
        <WeatherBox />
      </div>
    </div>
  )
}

function OptionList({
  roomId,
  options,
  votes,
  myVote,
}: {
  roomId: string
  options: RecordData<Option>[]
  votes: RecordData<Vote>[]
  myVote: RecordData<Vote> | undefined
}) {
  const { ready, createConfirmed, putConfirmed, removeConfirmed } =
    useMutations<VoteInput>('votes')
  const { error } = useToast()
  const [pending, setPending] = useState(false)

  if (options.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
        No options yet. Add the first one below.
      </p>
    )
  }

  // Count votes per option from the live records.
  const counts = new Map<string, number>()
  for (const v of votes) counts.set(v.data.optionId, (counts.get(v.data.optionId) ?? 0) + 1)
  const maxCount = Math.max(1, ...counts.values())

  async function vote(optionId: string) {
    setPending(true)
    try {
      if (!myVote) {
        await createConfirmed({ roomId, optionId })
      } else if (myVote.data.optionId === optionId) {
        // Clicking your current choice again takes the vote back.
        await removeConfirmed(myVote.recordId)
      } else {
        await putConfirmed(myVote.recordId, { optionId })
      }
    } catch (err) {
      error('Could not save your vote', String(err))
    } finally {
      setPending(false)
    }
  }

  return (
    <ul className="space-y-2">
      {options.map((option) => {
        const count = counts.get(option.recordId) ?? 0
        const isMine = myVote?.data.optionId === option.recordId
        return (
          <li key={option.recordId} data-testid="option">
            <button
              type="button"
              onClick={() => vote(option.recordId)}
              disabled={!ready || pending}
              aria-pressed={isMine}
              className={cn(
                'relative w-full overflow-hidden rounded-lg border bg-card px-4 py-3 text-left transition-colors',
                'hover:border-primary disabled:cursor-not-allowed disabled:opacity-60',
                isMine ? 'border-primary' : 'border-border',
              )}
            >
              {/* Bar behind the text, sized relative to the leading option. */}
              <span
                aria-hidden
                className="absolute inset-y-0 left-0 bg-primary/10 transition-[width] duration-300"
                style={{ width: `${(count / maxCount) * 100}%` }}
              />
              <span className="relative flex items-center justify-between gap-4">
                <span className="font-medium">
                  {option.data.label}
                  {isMine && <span className="ml-2 text-xs text-primary">Your vote</span>}
                </span>
                <span data-testid="option-count" className="tabular-nums text-muted-foreground">
                  {count}
                </span>
              </span>
            </button>
          </li>
        )
      })}
    </ul>
  )
}

function AddOptionForm({ roomId }: { roomId: string }) {
  const { ready, create } = useMutations<Option>('options')
  const [label, setLabel] = useState('')

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const trimmed = label.trim()
    if (!trimmed) return
    // Fire-and-forget: a rejected write shows a toast via the app layout's onWriteError.
    create({ roomId, label: trimmed })
    setLabel('')
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 pt-2">
      <Input
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        placeholder="Add an option, e.g. Thai place"
        maxLength={100}
        aria-label="New option"
      />
      <Button type="submit" disabled={!ready || !label.trim()}>
        Add
      </Button>
    </form>
  )
}

type SummaryState =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'done'; summary: string }
  | { kind: 'error'; message: string }

/**
 * "Summarize with AI" - asks the server action `summarizeRoom` for a short
 * summary. The AI call happens on the server; the browser only sends the room id.
 * The summary is shown to whoever clicked, not saved or synced.
 */
function AiSummary({ roomId, totalVotes }: { roomId: string; totalVotes: number }) {
  const [state, setState] = useState<SummaryState>({ kind: 'idle' })

  async function summarize() {
    // Nothing to summarize: skip the AI call entirely.
    if (totalVotes === 0) {
      setState({ kind: 'done', summary: 'No votes yet.' })
      return
    }

    setState({ kind: 'loading' })
    try {
      const res = await fetch('/api/actions/summarizeRoom', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${await getAuthToken()}`,
        },
        body: JSON.stringify({ roomId }),
      })
      const body = (await res.json().catch(() => null)) as
        | { success: true; data: { summary: string } }
        | { success: false; error: string }
        | null
      if (!res.ok || !body || !body.success) {
        const message =
          body && !body.success && body.error
            ? body.error
            : "Couldn't get a summary. Please try again."
        setState({ kind: 'error', message })
        return
      }
      setState({ kind: 'done', summary: body.data.summary })
    } catch {
      setState({ kind: 'error', message: "Couldn't reach the server. Check your connection and try again." })
    }
  }

  const loading = state.kind === 'loading'

  return (
    <section className="mt-10 rounded-lg border border-border bg-card p-6">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-lg font-semibold">AI summary</h2>
        <Button variant="secondary" onClick={summarize} disabled={loading}>
          {loading ? 'Summarizing…' : 'Summarize with AI'}
        </Button>
      </div>
      <div aria-live="polite" className="mt-4 text-sm">
        {state.kind === 'idle' && (
          <p className="text-muted-foreground">Get a quick read on where the vote stands.</p>
        )}
        {state.kind === 'loading' && <p className="text-muted-foreground">Thinking…</p>}
        {state.kind === 'done' && <p data-testid="ai-summary">{state.summary}</p>}
        {state.kind === 'error' && (
          <p role="alert" data-testid="ai-summary-error" className="text-destructive">
            {state.message}
          </p>
        )}
      </div>
    </section>
  )
}

type ForecastDay = { date: string; day: string; high: number; low: number; description: string }

type WeatherState =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'done'; location: string; days: ForecastDay[] }
  | { kind: 'error'; message: string }

/**
 * "Check the weather" - asks the server action `getForecast` for a 5-day
 * forecast. Shown only to whoever clicked; the city isn't saved.
 */
function WeatherBox() {
  const [city, setCity] = useState('')
  const [state, setState] = useState<WeatherState>({ kind: 'idle' })

  async function check(e: FormEvent) {
    e.preventDefault()
    const location = city.trim()
    if (!location) return

    setState({ kind: 'loading' })
    try {
      const res = await fetch('/api/actions/getForecast', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${await getAuthToken()}`,
        },
        body: JSON.stringify({ location }),
      })
      const body = (await res.json().catch(() => null)) as
        | { success: true; data: { location: string; days: ForecastDay[] } }
        | { success: false; error: string }
        | null
      if (!res.ok || !body || !body.success) {
        const message =
          body && !body.success && body.error
            ? body.error
            : "Couldn't get the weather. Please try again."
        setState({ kind: 'error', message })
        return
      }
      setState({ kind: 'done', ...body.data })
    } catch {
      setState({ kind: 'error', message: "Couldn't reach the server. Check your connection and try again." })
    }
  }

  const loading = state.kind === 'loading'

  return (
    <section className="mt-6 rounded-lg border border-border bg-card p-6">
      <h2 className="text-lg font-semibold">Check the weather</h2>
      <form onSubmit={check} className="mt-4 flex gap-2">
        <Input
          value={city}
          onChange={(e) => setCity(e.target.value)}
          placeholder="City, e.g. Austin"
          maxLength={100}
          aria-label="City"
        />
        <Button type="submit" variant="secondary" disabled={loading || !city.trim()}>
          {loading ? 'Checking…' : 'Check'}
        </Button>
      </form>
      <div aria-live="polite" className="mt-4 text-sm">
        {state.kind === 'idle' && (
          <p className="text-muted-foreground">Planning something outdoors? See the next 5 days.</p>
        )}
        {state.kind === 'loading' && <p className="text-muted-foreground">Looking up the forecast…</p>}
        {state.kind === 'done' && (
          <div data-testid="weather-forecast">
            <p className="text-muted-foreground">Next 5 days in {state.location}</p>
            <ul className="mt-2 space-y-1">
              {state.days.map((d) => (
                <li key={d.date} className="flex justify-between gap-4">
                  <span className="w-10 font-medium">{d.day}</span>
                  <span className="flex-1 capitalize text-muted-foreground">{d.description}</span>
                  <span className="tabular-nums">
                    {d.high}° / {d.low}°C
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
        {state.kind === 'error' && (
          <p role="alert" data-testid="weather-error" className="text-destructive">
            {state.message}
          </p>
        )}
      </div>
    </section>
  )
}

type Place = { placeId: string; name: string; rating?: number; reviews?: number; address?: string; type?: string }

type PlaceSearchState =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'done'; places: Place[] }
  | { kind: 'error'; message: string }

/**
 * "Find places" - searches Google Maps through the server action
 * `searchPlaces` and lets you add a result as an option in one click.
 * Results are shown only to whoever searched; added options sync to everyone.
 */
function PlaceSearch({ roomId, existingLabels }: { roomId: string; existingLabels: string[] }) {
  const { ready, create } = useMutations<Option>('options')
  const [query, setQuery] = useState('')
  const [state, setState] = useState<PlaceSearchState>({ kind: 'idle' })
  const existing = new Set(existingLabels.map((l) => l.trim().toLowerCase()))

  async function search(e: FormEvent) {
    e.preventDefault()
    const q = query.trim()
    if (!q) return

    setState({ kind: 'loading' })
    try {
      const res = await fetch('/api/actions/searchPlaces', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${await getAuthToken()}`,
        },
        body: JSON.stringify({ query: q }),
      })
      const body = (await res.json().catch(() => null)) as
        | { success: true; data: { places: Place[] } }
        | { success: false; error: string }
        | null
      if (!res.ok || !body || !body.success) {
        const message =
          body && !body.success && body.error ? body.error : "Couldn't search places. Please try again."
        setState({ kind: 'error', message })
        return
      }
      setState({ kind: 'done', places: body.data.places })
    } catch {
      setState({ kind: 'error', message: "Couldn't reach the server. Check your connection and try again." })
    }
  }

  const loading = state.kind === 'loading'

  return (
    <section className="mt-10 rounded-lg border border-border bg-card p-6">
      <h2 className="text-lg font-semibold">Find places</h2>
      <form onSubmit={search} className="mt-4 flex gap-2">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="e.g. thai food in Buffalo NY"
          maxLength={100}
          aria-label="Search places"
        />
        <Button type="submit" variant="secondary" disabled={loading || !query.trim()}>
          {loading ? 'Searching…' : 'Search'}
        </Button>
      </form>
      <div aria-live="polite" className="mt-4 text-sm">
        {state.kind === 'idle' && (
          <p className="text-muted-foreground">Search Google Maps and add real places as options.</p>
        )}
        {state.kind === 'loading' && <p className="text-muted-foreground">Searching Google Maps…</p>}
        {state.kind === 'done' && state.places.length === 0 && (
          <p className="text-muted-foreground">No places found. Try different words.</p>
        )}
        {state.kind === 'done' && state.places.length > 0 && (
          <ul data-testid="place-results" className="space-y-2">
            {state.places.map((p) => {
              const added = existing.has(p.name.trim().toLowerCase())
              return (
                <li key={p.placeId} className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{p.name}</p>
                    <p className="truncate text-muted-foreground">
                      {[
                        p.rating !== undefined &&
                          `★ ${p.rating}${p.reviews !== undefined ? ` (${p.reviews})` : ''}`,
                        p.type,
                        p.address,
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </p>
                  </div>
                  <Button
                    variant="secondary"
                    disabled={!ready || added}
                    onClick={() => create({ roomId, label: p.name })}
                  >
                    {added ? 'Added' : 'Add'}
                  </Button>
                </li>
              )
            })}
          </ul>
        )}
        {state.kind === 'error' && (
          <p role="alert" data-testid="place-error" className="text-destructive">
            {state.message}
          </p>
        )}
      </div>
    </section>
  )
}
