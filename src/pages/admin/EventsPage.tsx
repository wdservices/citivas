import { useEffect, useMemo, useState } from 'react'
import { Calendar, MapPin, Ticket } from 'lucide-react'
import { listenAllBusinesses, splitBusinessesAndEvents, groupByState, AdminBusiness } from '@/lib/adminData'
import { AdminCardGridSkeleton } from '@/components/ui/ListingSkeletons'

function formatDate(iso?: string): string {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })
  } catch {
    return iso
  }
}

export default function AdminEventsPage() {
  const [allItems, setAllItems] = useState<AdminBusiness[]>([])
  const [loading, setLoading] = useState(true)
  const [stateFilter, setStateFilter] = useState<string>('All')

  useEffect(() => {
    const unsub = listenAllBusinesses((items) => {
      setAllItems(items)
      setLoading(false)
    })
    return unsub
  }, [])

  const { events } = useMemo(() => splitBusinessesAndEvents(allItems), [allItems])
  const eventsByState = useMemo(() => groupByState(events), [events])
  const states = useMemo(() => ['All', ...Object.keys(eventsByState).sort()], [eventsByState])

  const filteredEvents = useMemo(
    () => (stateFilter === 'All' ? events : events.filter((e) => (e.state || 'Unspecified') === stateFilter)),
    [events, stateFilter]
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl md:text-4xl font-extrabold text-ink">Events</h1>
          <p className="text-sm text-ink/60 mt-1">{events.length.toLocaleString()} total events across all states</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {states.map((s) => (
          <button
            key={s}
            onClick={() => setStateFilter(s)}
            className={`px-4 py-2 rounded-full text-sm font-medium border transition-colors ${
              stateFilter === s ? 'bg-ink text-ivory border-ink' : 'bg-white text-ink/70 border-sand-200 hover:border-ink/30'
            }`}
          >
            {s} {s !== 'All' && `(${eventsByState[s]})`}
          </button>
        ))}
      </div>

      <div className="card">
        {loading ? (
          <AdminCardGridSkeleton count={6} />
        ) : filteredEvents.length === 0 ? (
          <div className="py-12 text-center">
            <Calendar className="h-10 w-10 text-ink/20 mx-auto mb-3" />
            <p className="text-sm text-ink/50">No events found for this filter.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredEvents.map((event) => (
              <div key={event.id} className="rounded-2xl border border-sand-200 overflow-hidden bg-white">
                <div className="h-32 bg-sand-100" style={event.imageUrl || event.image ? {
                  backgroundImage: `url(${event.imageUrl || event.image})`, backgroundSize: 'cover', backgroundPosition: 'center',
                } : undefined} />
                <div className="p-4">
                  <p className="font-display font-bold text-ink truncate">{event.title}</p>
                  <div className="flex items-center gap-1.5 text-xs text-ink/60 mt-1">
                    <MapPin className="h-3.5 w-3.5" />
                    {[event.city, event.state].filter(Boolean).join(', ') || event.location || 'Location not set'}
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-ink/60 mt-1">
                    <Calendar className="h-3.5 w-3.5" />
                    {formatDate(event.startDate)}
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-ink/60 mt-1">
                    <Ticket className="h-3.5 w-3.5" />
                    {event.isActive ? 'Active' : 'Inactive'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
