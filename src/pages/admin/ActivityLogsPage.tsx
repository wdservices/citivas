import { useState, useEffect } from 'react'
import { db } from '@/lib/firebase'
import { collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore'
import { Search, Download, Clock, User, FileText, Filter } from 'lucide-react'
import { AdminTableRowsSkeleton } from '@/components/ui/ListingSkeletons'

interface ActivityLog {
  id: string
  userId: string
  userEmail: string
  userName: string
  action: string
  targetType: string
  targetId: string
  targetName: string
  details: string
  timestamp: any
  createdAt: string
}

const ACTION_LABELS: Record<string, string> = {
  create_listing: 'Created Listing',
  edit_listing: 'Edited Listing',
  delete_listing: 'Deleted Listing',
  create_event: 'Created Event',
  edit_event: 'Edited Event',
  delete_event: 'Deleted Event',
  fund_wallet: 'Funded Wallet',
  withdraw: 'Withdrew Funds',
  register_event: 'Registered for Event',
  submit_review: 'Submitted Review',
  sign_in: 'Signed In',
  sign_out: 'Signed Out',
  sign_up: 'Signed Up',
}

const ACTION_COLORS: Record<string, string> = {
  create_listing: 'bg-green-100 text-green-800',
  create_event: 'bg-green-100 text-green-800',
  edit_listing: 'bg-blue-100 text-blue-800',
  edit_event: 'bg-blue-100 text-blue-800',
  delete_listing: 'bg-red-100 text-red-800',
  delete_event: 'bg-red-100 text-red-800',
  fund_wallet: 'bg-emerald-100 text-emerald-800',
  withdraw: 'bg-orange-100 text-orange-800',
  register_event: 'bg-purple-100 text-purple-800',
  submit_review: 'bg-yellow-100 text-yellow-800',
  sign_in: 'bg-gray-100 text-gray-800',
  sign_out: 'bg-gray-100 text-gray-800',
  sign_up: 'bg-indigo-100 text-indigo-800',
}

function formatDate(timestamp: any, createdAt: string): string {
  let date: Date
  if (timestamp?.toDate) {
    date = timestamp.toDate()
  } else if (timestamp?.seconds) {
    date = new Date(timestamp.seconds * 1000)
  } else if (createdAt) {
    date = new Date(createdAt)
  } else {
    date = new Date()
  }
  return date.toLocaleDateString('en-NG', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

function exportToPDF(logs: ActivityLog[], searchEmail: string) {
  const printWindow = window.open('', '_blank')
  if (!printWindow) return

  const rows = logs.map(log => `
    <tr>
      <td style="padding:8px;border:1px solid #ddd;font-size:13px">${formatDate(log.timestamp, log.createdAt)}</td>
      <td style="padding:8px;border:1px solid #ddd;font-size:13px">${log.userName || '—'}</td>
      <td style="padding:8px;border:1px solid #ddd;font-size:13px">${log.userEmail}</td>
      <td style="padding:8px;border:1px solid #ddd;font-size:13px"><span style="padding:2px 8px;border-radius:12px;font-size:12px;background:#f0f0f0">${ACTION_LABELS[log.action] || log.action}</span></td>
      <td style="padding:8px;border:1px solid #ddd;font-size:13px">${log.targetType}</td>
      <td style="padding:8px;border:1px solid #ddd;font-size:13px">${log.targetName || '—'}</td>
      <td style="padding:8px;border:1px solid #ddd;font-size:13px">${log.details || '—'}</td>
    </tr>
  `).join('')

  printWindow.document.write(`
    <html>
    <head>
      <title>Activity Log${searchEmail ? ' - ' + searchEmail : ''}</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 20px; }
        h1 { font-size: 20px; margin-bottom: 4px; }
        p { color: #666; font-size: 13px; margin-bottom: 20px; }
        table { width: 100%; border-collapse: collapse; }
        th { background: #f5f5f5; padding: 8px; border: 1px solid #ddd; text-align: left; font-size: 12px; font-weight: bold; }
        @media print {
          body { padding: 0; }
          table { page-break-inside: auto; }
          tr { page-break-inside: avoid; }
        }
      </style>
    </head>
    <body>
      <h1>Citivas — User Activity Log</h1>
      <p>${searchEmail ? `Filtered by: ${searchEmail}` : 'All users'} | Generated: ${new Date().toLocaleString('en-NG')} | Total: ${logs.length} activities</p>
      <table>
        <thead>
          <tr>
            <th>Date & Time</th>
            <th>User</th>
            <th>Email</th>
            <th>Action</th>
            <th>Type</th>
            <th>Target</th>
            <th>Details</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </body>
    </html>
  `)
  printWindow.document.close()
  printWindow.print()
}

export default function AdminActivityLogsPage() {
  const [logs, setLogs] = useState<ActivityLog[]>([])
  const [loading, setLoading] = useState(false)
  const [searchEmail, setSearchEmail] = useState('')
  const [searchAction, setSearchAction] = useState('')
  const [hasSearched, setHasSearched] = useState(false)

  const fetchLogs = async () => {
    setLoading(true)
    try {
      let q
      const constraints: any[] = [orderBy('timestamp', 'desc'), limit(200)]

      if (searchEmail.trim()) {
        q = query(collection(db, 'activity_logs'), where('userEmail', '==', searchEmail.trim()), ...constraints)
      } else {
        q = query(collection(db, 'activity_logs'), ...constraints)
      }

      const snapshot = await getDocs(q)
      let results: ActivityLog[] = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ActivityLog[]

      if (searchAction) {
        results = results.filter(log => log.action === searchAction)
      }

      setLogs(results)
      setHasSearched(true)
    } catch (error) {
      console.error('Error fetching logs:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    fetchLogs()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink">Activity Logs</h1>
          <p className="text-sm text-ink/60 mt-1">Track all user activities on Citivas</p>
        </div>
        {logs.length > 0 && (
          <button
            onClick={() => exportToPDF(logs, searchEmail)}
            className="flex items-center gap-2 px-4 py-2 bg-marigold text-ink rounded-xl font-semibold hover:bg-marigold/90 transition-colors"
          >
            <Download className="w-4 h-4" />
            Export PDF
          </button>
        )}
      </div>

      <form onSubmit={handleSearch} className="bg-white rounded-xl border border-sand-200 p-4">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink/40" />
            <input
              type="text"
              value={searchEmail}
              onChange={(e) => setSearchEmail(e.target.value)}
              placeholder="Search by email..."
              className="w-full pl-10 pr-4 py-2.5 border border-sand-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-marigold/50"
            />
          </div>
          <div className="w-full md:w-48 relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink/40" />
            <select
              value={searchAction}
              onChange={(e) => setSearchAction(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-sand-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-marigold/50 appearance-none bg-white"
            >
              <option value="">All Actions</option>
              {Object.entries(ACTION_LABELS).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2.5 bg-ink text-ivory rounded-xl font-semibold hover:bg-ink/90 transition-colors disabled:opacity-50"
          >
            {loading ? 'Searching...' : 'Search'}
          </button>
        </div>
      </form>

      {loading && (
        <div className="bg-white rounded-xl border border-sand-200 overflow-hidden">
          <AdminTableRowsSkeleton rows={6} asTable={false} />
        </div>
      )}

      {!loading && hasSearched && logs.length === 0 && (
        <div className="text-center py-12 bg-white rounded-xl border border-sand-200">
          <FileText className="w-12 h-12 text-ink/20 mx-auto mb-3" />
          <p className="text-ink/60">No activity logs found</p>
          {searchEmail && <p className="text-sm text-ink/40 mt-1">Try a different email address</p>}
        </div>
      )}

      {!loading && logs.length > 0 && (
        <div className="bg-white rounded-xl border border-sand-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-sand-200 bg-sand-50">
            <p className="text-sm text-ink/60">
              Showing <strong className="text-ink">{logs.length}</strong> activities
              {searchEmail && <> for <strong className="text-ink">{searchEmail}</strong></>}
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-sand-200 bg-sand-50">
                  <th className="text-left px-4 py-3 text-xs font-bold text-ink/60 uppercase tracking-wider">Date & Time</th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-ink/60 uppercase tracking-wider">User</th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-ink/60 uppercase tracking-wider">Action</th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-ink/60 uppercase tracking-wider">Type</th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-ink/60 uppercase tracking-wider">Target</th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-ink/60 uppercase tracking-wider">Details</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} className="border-b border-sand-100 hover:bg-sand-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 text-sm text-ink">
                        <Clock className="w-3.5 h-3.5 text-ink/40" />
                        <div>
                          <div className="font-medium">{formatDate(log.timestamp, log.createdAt)}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 bg-marigold/20 rounded-full flex items-center justify-center flex-shrink-0">
                          <User className="w-3.5 h-3.5 text-marigold" />
                        </div>
                        <div>
                          <div className="text-sm font-medium text-ink">{log.userName || '—'}</div>
                          <div className="text-xs text-ink/50">{log.userEmail}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${ACTION_COLORS[log.action] || 'bg-gray-100 text-gray-800'}`}>
                        {ACTION_LABELS[log.action] || log.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-ink capitalize">{log.targetType}</td>
                    <td className="px-4 py-3 text-sm text-ink font-medium">{log.targetName || '—'}</td>
                    <td className="px-4 py-3 text-sm text-ink/60 max-w-xs truncate">{log.details || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!hasSearched && !loading && (
        <div className="text-center py-12 bg-white rounded-xl border border-sand-200">
          <Search className="w-12 h-12 text-ink/20 mx-auto mb-3" />
          <p className="text-ink/60 font-medium">Search for a user's activity log</p>
          <p className="text-sm text-ink/40 mt-1">Enter an email address to view their activity history</p>
        </div>
      )}
    </div>
  )
}
