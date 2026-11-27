import { useEffect, useMemo, useState } from 'react'
import { Search, Mail, Users as UsersIcon, Trash2, AlertTriangle, X, Check, Loader2 } from 'lucide-react'
import { listenUsers, AdminUser } from '@/lib/adminData'
import { getFunctions, httpsCallable } from 'firebase/functions'
import firebaseApp from '@/lib/firebase'
import { AdminTableRowsSkeleton } from '@/components/ui/ListingSkeletons'

function formatDate(ts: any): string {
  if (!ts?.toDate) return '—'
  return ts.toDate().toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })
}

interface AdminUserExtended extends AdminUser {
  userType?: string
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUserExtended[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [confirmStep, setConfirmStep] = useState<0 | 1 | 2>(0)
  const [confirmEmail, setConfirmEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)
  const [usersDeletedCount, setUsersDeletedCount] = useState(0)

  useEffect(() => {
    const unsub = listenUsers((data) => {
      setUsers(data as AdminUserExtended[])
      setLoading(false)
    })
    return unsub
  }, [usersDeletedCount])

  const filteredUsers = useMemo(() => {
    const term = searchTerm.toLowerCase()
    return users.filter((u) => u.name?.toLowerCase().includes(term) || u.email?.toLowerCase().includes(term))
  }, [users, searchTerm])

  const targetUser = deletingId ? users.find((u) => u.id === deletingId) || null : null

  const openDelete = (u: AdminUserExtended) => {
    setDeletingId(u.id)
    setConfirmEmail('')
    setConfirmStep(1)
  }

  const closeDelete = () => {
    setDeletingId(null)
    setConfirmStep(0)
    setConfirmEmail('')
  }

  const showToast = (type: 'success' | 'error', msg: string) => {
    setToast({ type, msg })
    setTimeout(() => setToast(null), 4500)
  }

  const proceedToStep2 = () => {
    if (confirmStep === 1) setConfirmStep(2)
  }

  const handleDeleteConfirm = async () => {
    if (!targetUser) return
    if (confirmEmail.trim().toLowerCase() !== targetUser.email?.trim().toLowerCase()) {
      showToast('error', 'Email does not match. Please type the user\'s email to confirm.')
      return
    }
    setBusy(true)
    try {
      const functions = getFunctions(firebaseApp)
      const archiveAndDeleteUser = httpsCallable(functions, 'archiveAndDeleteUser')
      const res = await archiveAndDeleteUser({ userId: targetUser.id })
      const data: any = res.data
      const ok = data?.ok === true
      if (!ok) throw new Error('Function returned ok:false')
      showToast(
        'success',
        `User archived & deleted. ${data?.deletedCount ?? 0} docs removed, ${data?.cloudinaryDestroyed ?? 0} images destroyed.`,
      )
      setUsersDeletedCount((n) => n + 1)
    } catch (e: any) {
      const msg = e?.message || String(e)
      showToast('error', `Delete failed: ${msg}`)
    } finally {
      setBusy(false)
      closeDelete()
    }
  }

  return (
    <div className="space-y-6 relative">
      {toast && (
        <div
          className={
            'fixed top-4 right-4 z-50 max-w-sm rounded-xl border px-4 py-3 shadow-lg flex items-start gap-3 ' +
            (toast.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-red-50 border-red-200 text-red-900')
          }
        >
          {toast.type === 'success' ? (
            <Check className="h-5 w-5 shrink-0 mt-0.5 text-emerald-600" />
          ) : (
            <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5 text-red-600" />
          )}
          <div className="text-sm flex-1">{toast.msg}</div>
          <button onClick={() => setToast(null)} className="text-ink/40 hover:text-ink/70">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl md:text-4xl font-extrabold text-ink">Users</h1>
          <p className="text-sm text-ink/60 mt-1">{users.length.toLocaleString()} total registered users</p>
        </div>
      </div>

      <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 text-sm text-ink/70">
        Users are mirrored into this list automatically the first time each person signs in on the
        website or app — this reflects real accounts, not a manually maintained list.
      </div>

      <div className="card">
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink/40" />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-sand-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>

        {loading ? (
          <AdminTableRowsSkeleton cols={6} rows={6} asTable={false} />
        ) : filteredUsers.length === 0 ? (
          <div className="py-12 text-center">
            <UsersIcon className="h-10 w-10 text-ink/20 mx-auto mb-3" />
            <p className="text-sm text-ink/50">
              {users.length === 0 ? 'No users have signed in yet.' : 'No users match your search.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs font-semibold uppercase tracking-wider text-ink/50 border-b border-sand-200">
                  <th className="pb-3">Name</th>
                  <th className="pb-3">Email</th>
                  <th className="pb-3">User Type</th>
                  <th className="pb-3">Joined</th>
                  <th className="pb-3">Last Seen</th>
                  <th className="pb-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="border-b border-sand-100 last:border-b-0">
                    <td className="py-3 font-medium text-ink">{user.name}</td>
                    <td className="py-3 text-ink/70">
                      <span className="inline-flex items-center gap-1.5">
                        <Mail className="h-3.5 w-3.5 text-ink/40" />
                        {user.email}
                      </span>
                    </td>
                    <td className="py-3 text-ink/70">
                      <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold bg-ink/5 text-ink/70 uppercase tracking-wide">
                        {user.userType || 'user'}
                      </span>
                    </td>
                    <td className="py-3 text-ink/70">{formatDate(user.createdAt)}</td>
                    <td className="py-3 text-ink/70">{formatDate(user.lastSeenAt)}</td>
                    <td className="py-3 text-right">
                      <button
                        onClick={() => openDelete(user)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-red-600 hover:bg-red-50 border border-red-200"
                        title="Delete account & all owned data"
                      >
                        <Trash2 className="h-3.5 w-3.5" /> Delete Account
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {(confirmStep === 1 || confirmStep === 2) && targetUser && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden">
            <div className="flex items-start justify-between p-5 border-b border-slate-200">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-xl bg-red-100 text-red-600 shrink-0">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="font-display font-bold text-ink text-lg">Delete User Account</h2>
                  <p className="text-sm text-ink/60 mt-1">
                    This action permanently deletes the account and all owned data.
                  </p>
                </div>
              </div>
              <button
                onClick={closeDelete}
                disabled={busy}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-700 disabled:opacity-40"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="rounded-xl bg-slate-50 border border-slate-200 p-4">
                <div className="text-xs font-semibold uppercase tracking-wider text-ink/50">Target user</div>
                <div className="mt-1 font-semibold text-ink">{targetUser.name || '(no name)'}</div>
                <div className="text-sm text-ink/70 flex items-center gap-1.5 mt-0.5">
                  <Mail className="h-3.5 w-3.5 text-ink/40" />
                  {targetUser.email}
                </div>
                <div className="text-xs text-ink/50 mt-1">uid: {targetUser.id}</div>
              </div>

              {confirmStep === 1 ? (
                <>
                  <div className="text-sm text-ink/70 space-y-2">
                    <p>
                      <strong className="text-red-600">This cannot be undone directly.</strong> The system will:
                    </p>
                    <ul className="list-disc pl-5 space-y-1">
                      <li>Create a full archive snapshot in <code className="px-1.5 py-0.5 rounded bg-slate-100 text-xs">deleted_accounts_log</code></li>
                      <li>Hard-delete <strong>users, wallet, businesses, marketplace, house_listings, mini_sites</strong> owned by this user</li>
                      <li>Destroy all associated Cloudinary images (logos, photos, room images)</li>
                    </ul>
                    <p className="text-ink/60 text-xs mt-2">
                      Tip: if deleted by mistake, the archive snapshot can be restored via the <code className="px-1.5 py-0.5 rounded bg-slate-100 text-xs">restoreDeletedAccount</code> callable using the archive id logged in the success toast.
                    </p>
                  </div>
                  <div className="flex items-center justify-end gap-2 pt-2">
                    <button
                      onClick={closeDelete}
                      disabled={busy}
                      className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-40"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={proceedToStep2}
                      className="px-4 py-2 rounded-xl text-sm font-semibold bg-red-600 text-white hover:bg-red-700"
                    >
                      I understand — continue
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-600 block mb-2">
                      Confirm by typing this user's email
                    </label>
                    <input
                      autoFocus
                      type="text"
                      placeholder={targetUser.email}
                      value={confirmEmail}
                      onChange={(e) => setConfirmEmail(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && confirmEmail.trim().toLowerCase() === targetUser.email?.trim().toLowerCase() && !busy) {
                          handleDeleteConfirm()
                        }
                      }}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-red-500/30"
                    />
                    <p className="text-xs text-ink/50 mt-2">
                      Type <span className="font-mono text-red-600 font-semibold">{targetUser.email}</span> to enable the delete button.
                    </p>
                  </div>
                  <div className="flex items-center justify-end gap-2 pt-2">
                    <button
                      onClick={() => setConfirmStep(1)}
                      disabled={busy}
                      className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-40"
                    >
                      Back
                    </button>
                    <button
                      onClick={handleDeleteConfirm}
                      disabled={busy || confirmEmail.trim().toLowerCase() !== targetUser.email?.trim().toLowerCase()}
                      className="px-4 py-2 rounded-xl text-sm font-semibold bg-red-600 text-white hover:bg-red-700 disabled:opacity-40 inline-flex items-center gap-2"
                    >
                      {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                      {busy ? 'Deleting...' : 'Permanently Delete Account'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
