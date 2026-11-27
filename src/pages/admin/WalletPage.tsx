import { useEffect, useMemo, useState } from 'react'
import { ArrowDownToLine, ArrowUpFromLine, Wallet as WalletIcon } from 'lucide-react'
import { listenAllWalletTransactions, computeWalletStats, listenAllTickets, computeTicketRevenue, WalletTransaction, TicketRecord } from '@/lib/adminData'
import { Skeleton } from '@/components/ui/skeleton'
import { AdminTableRowsSkeleton } from '@/components/ui/ListingSkeletons'

function formatDate(ts: any): string {
  if (!ts?.toDate) return '—'
  return ts.toDate().toLocaleString('en-NG', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function AdminWalletPage() {
  const [transactions, setTransactions] = useState<WalletTransaction[]>([])
  const [tickets, setTickets] = useState<TicketRecord[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubTx = listenAllWalletTransactions((data) => {
      setTransactions(data)
      setLoading(false)
    })
    const unsubTickets = listenAllTickets(setTickets)
    return () => { unsubTx(); unsubTickets() }
  }, [])

  const { totalFunded, totalSpentOrWithdrawn, totalWithdrawn } = useMemo(() => computeWalletStats(transactions), [transactions])
  const { platformCommission, grossFromSales } = useMemo(() => computeTicketRevenue(tickets), [tickets])

  const statsCards = [
    { title: 'Total Funded (all users)', value: `₦${totalFunded.toLocaleString()}`, icon: ArrowDownToLine, color: 'bg-palm text-white' },
    { title: 'Total Spent (events, etc.)', value: `₦${(totalSpentOrWithdrawn - totalWithdrawn).toLocaleString()}`, icon: WalletIcon, color: 'bg-marigold text-ink' },
    { title: 'Total Withdrawn', value: `₦${totalWithdrawn.toLocaleString()}`, icon: ArrowUpFromLine, color: 'bg-coral text-white' },
    { title: 'Platform Commission (tickets)', value: `₦${platformCommission.toLocaleString()}`, icon: WalletIcon, color: 'bg-ink text-ivory' },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl md:text-4xl font-extrabold text-ink">Wallet & Revenue</h1>
        <p className="text-sm text-ink/60 mt-1">Live wallet activity across every user</p>
      </div>

      <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 text-sm text-ink/70">
        These figures come directly from the same <code>wallets/&#123;userId&#125;/transactions</code> records
        the client app writes on every fund, spend, and withdrawal — not a separate admin-only ledger.
        Gross ticket sales volume across all events: ₦{grossFromSales.toLocaleString()}.
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statsCards.map((stat) => {
          const Icon = stat.icon
          return (
            <div key={stat.title} className="card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-ink/60">{stat.title}</p>
                  {loading ? (
                    <Skeleton className="h-8 w-24 mt-2" />
                  ) : (
                    <p className="font-display text-2xl font-extrabold text-ink mt-2">{stat.value}</p>
                  )}
                </div>
                <div className={`${stat.color} p-3 rounded-2xl`}>
                  <Icon className="h-6 w-6" />
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <div className="card">
        <h3 className="font-display text-lg font-bold text-ink mb-4">Recent Transactions (all users)</h3>
        {loading ? (
          <AdminTableRowsSkeleton cols={5} rows={6} asTable={false} />
        ) : transactions.length === 0 ? (
          <p className="text-sm text-ink/50 py-8 text-center">No wallet activity recorded yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs font-semibold uppercase tracking-wider text-ink/50 border-b border-sand-200">
                  <th className="pb-3">Type</th>
                  <th className="pb-3">Description</th>
                  <th className="pb-3">Amount</th>
                  <th className="pb-3">Method</th>
                  <th className="pb-3">Date</th>
                </tr>
              </thead>
              <tbody>
                {transactions.slice(0, 100).map((t) => (
                  <tr key={t.id} className="border-b border-sand-100 last:border-b-0">
                    <td className="py-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${t.type === 'credit' ? 'bg-palm/10 text-palm' : 'bg-coral/10 text-coral'}`}>
                        {t.type === 'credit' ? <ArrowDownToLine className="h-3 w-3" /> : <ArrowUpFromLine className="h-3 w-3" />}
                        {t.type}
                      </span>
                    </td>
                    <td className="py-3 text-ink/80">{t.description}</td>
                    <td className={`py-3 font-semibold ${t.type === 'credit' ? 'text-palm' : 'text-coral'}`}>
                      {t.type === 'credit' ? '+' : '-'}₦{(t.amount || 0).toLocaleString()}
                    </td>
                    <td className="py-3 text-ink/60">{t.method || '—'}</td>
                    <td className="py-3 text-ink/60">{formatDate(t.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {transactions.length > 100 && (
              <p className="text-xs text-ink/40 mt-3">Showing 100 most recent of {transactions.length} total transactions.</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
