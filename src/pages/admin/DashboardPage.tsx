import { useEffect, useMemo, useState } from 'react'
import { Users, Calendar, Building2, DollarSign, Eye } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import {
  listenUsers, listenAllBusinesses, listenAllTickets,
  listenHouseListings, listenMarketplaceItems, listenAllEvents,
  splitBusinessesAndEvents, groupByState, computeTicketRevenue,
  AdminUser, AdminBusiness, AdminMarketplaceItem, AdminPropertyItem, TicketRecord,
} from '@/lib/adminData'
import { AdminDashboardSkeleton } from '@/components/ui/ListingSkeletons'
import { PlatformHealthCharts } from '@/components/admin/PlatformHealthCharts'

function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`
  const days = Math.floor(hours / 24)
  return `${days} day${days === 1 ? '' : 's'} ago`
}

const CHART_COLORS = ['#D9891F', '#D9422E', '#146B5E', '#1C1710', '#5FB0F0', '#B8A889', '#8C6F3F', '#6B4226']

export default function AdminDashboardPage() {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [allItems, setAllItems] = useState<AdminBusiness[]>([])
  const [properties, setProperties] = useState<AdminPropertyItem[]>([])
  const [marketplace, setMarketplace] = useState<AdminMarketplaceItem[]>([])
  const [topEvents, setTopEvents] = useState<AdminBusiness[]>([])
  const [tickets, setTickets] = useState<TicketRecord[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubUsers = listenUsers(setUsers)
    const unsubBusinesses = listenAllBusinesses((items) => {
      setAllItems(items)
      setLoading(false)
    })
    const unsubProps = listenHouseListings(setProperties)
    const unsubMarket = listenMarketplaceItems(setMarketplace)
    const unsubEvents = listenAllEvents(setTopEvents)
    const unsubTickets = listenAllTickets(setTickets)
    return () => {
      unsubUsers()
      unsubBusinesses()
      unsubProps()
      unsubMarket()
      unsubEvents()
      unsubTickets()
    }
  }, [])

  const { events: legacyEvents, businesses } = useMemo(() => splitBusinessesAndEvents(allItems), [allItems])
  const events = useMemo(() => {
    const seen = new Set<string>()
    const merged: AdminBusiness[] = []
    for (const ev of [...topEvents, ...legacyEvents]) {
      if (!seen.has(ev.id)) {
        seen.add(ev.id)
        merged.push(ev)
      }
    }
    return merged
  }, [topEvents, legacyEvents])

  const eventsByState = useMemo(() => groupByState(events), [events])
  const { platformCommission } = useMemo(() => computeTicketRevenue(tickets), [tickets])

  const eventsByStateChartData = useMemo(
    () => Object.entries(eventsByState)
      .sort((a, b) => b[1] - a[1])
      .map(([state, count]) => ({ state, count })),
    [eventsByState]
  )

  const categoryBreakdown = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const b of businesses) {
      const key = b.category || 'Other'
      counts[key] = (counts[key] || 0) + 1
    }
    return Object.entries(counts).map(([name, value], i) => ({
      name, value, color: CHART_COLORS[i % CHART_COLORS.length],
    }))
  }, [businesses])

  const recentActivity = useMemo(() => {
    const combined = [
      ...allItems.map((i) => ({
        label: i.category === 'Event' ? `New event: ${i.title}` : `New listing: ${i.title}`,
        sub: i.category,
        createdAt: i.createdAt?.toDate ? i.createdAt.toDate() : null,
      })),
      ...topEvents.map((i) => ({
        label: `New event: ${i.title}`,
        sub: i.category || 'Event',
        createdAt: i.createdAt?.toDate ? i.createdAt.toDate() : null,
      })),
      ...users.map((u) => ({
        label: 'New user registration',
        sub: u.name,
        createdAt: u.createdAt?.toDate ? u.createdAt.toDate() : null,
      })),
    ].filter((a) => a.createdAt)
    return combined.sort((a, b) => (b.createdAt as Date).getTime() - (a.createdAt as Date).getTime()).slice(0, 8)
  }, [allItems, topEvents, users])

  const statsCards = [
    { title: 'Total Users', value: users.length.toLocaleString(), icon: Users, color: 'bg-marigold text-ink' },
    { title: 'Total Events', value: events.length.toLocaleString(), icon: Calendar, color: 'bg-palm text-white' },
    { title: 'Total Businesses', value: businesses.length.toLocaleString(), icon: Building2, color: 'bg-coral text-white' },
    { title: 'Ticket Commission Revenue', value: `₦${platformCommission.toLocaleString()}`, icon: DollarSign, color: 'bg-ink text-ivory' },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl md:text-4xl font-extrabold text-ink">Dashboard</h1>
          <p className="text-sm text-ink/60 mt-1">
            Platform overview — {new Date().toLocaleDateString('en-NG', { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
      </div>

      {loading ? (
        <AdminDashboardSkeleton />
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {statsCards.map((stat) => {
              const Icon = stat.icon
              return (
                <div key={stat.title} className="card">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-ink/60">{stat.title}</p>
                      <p className="font-display text-3xl font-extrabold text-ink mt-2 tabular-nums">{stat.value}</p>
                    </div>
                    <div className={`${stat.color} p-3 rounded-2xl`}>
                      <Icon className="h-6 w-6" />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          <PlatformHealthCharts
            users={users}
            businesses={allItems}
            properties={properties}
            marketplace={marketplace}
            events={topEvents}
          />

          <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 text-sm text-ink/70">
            <strong>Note on revenue:</strong> "Ticket Commission Revenue" reflects only event ticket
            sales commission. Marketplace purchases do not yet have commission tracking implemented
            in the client app, so this figure is not total platform revenue — treat it as a partial,
            honest number until marketplace commission logic is built.
          </div>

          <div className="card">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-display text-lg font-bold text-ink">Events per State</h3>
              <Eye className="h-5 w-5 text-ink/40" />
            </div>
            {eventsByStateChartData.length === 0 ? (
              <p className="text-sm text-ink/50">No events recorded yet.</p>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={eventsByStateChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E8E0D4" />
                  <XAxis dataKey="state" stroke="#6B6255" angle={-30} textAnchor="end" height={70} />
                  <YAxis stroke="#6B6255" allowDecimals={false} />
                  <Tooltip contentStyle={{ background: '#FFF', border: '1px solid #E8E0D4', borderRadius: 12 }} />
                  <Bar dataKey="count" fill="#D9891F" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
            {eventsByState['Unspecified'] > 0 && (
              <p className="text-xs text-ink/50 mt-3">
                {eventsByState['Unspecified']} event{eventsByState['Unspecified'] === 1 ? '' : 's'} predate the
                state/city fields and can't be attributed to a specific state — grouped under "Unspecified"
                rather than omitted.
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="card lg:col-span-1">
              <h3 className="font-display text-lg font-bold text-ink mb-6">Business Categories</h3>
              {categoryBreakdown.length === 0 ? (
                <p className="text-sm text-ink/50">No businesses listed yet.</p>
              ) : (
                <>
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie data={categoryBreakdown} cx="50%" cy="50%" innerRadius={55} outerRadius={95} paddingAngle={4} dataKey="value">
                        {categoryBreakdown.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="mt-4 space-y-2">
                    {categoryBreakdown.map((item) => (
                      <div key={item.name} className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: item.color }} />
                          <span className="text-sm text-ink/70">{item.name}</span>
                        </div>
                        <span className="text-sm font-semibold text-ink tabular-nums">{item.value}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            <div className="card lg:col-span-2">
              <h3 className="font-display text-lg font-bold text-ink mb-6">Recent Activity</h3>
              {recentActivity.length === 0 ? (
                <p className="text-sm text-ink/50">No activity yet.</p>
              ) : (
                <div className="space-y-3">
                  {recentActivity.map((activity, index) => (
                    <div key={index} className="flex items-center justify-between py-3 border-b border-sand-200 last:border-b-0">
                      <div>
                        <p className="text-sm font-medium text-ink">{activity.label}</p>
                        <p className="text-xs text-ink/50">{activity.sub}</p>
                      </div>
                      <span className="text-xs text-ink/40">{timeAgo(activity.createdAt as Date)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
