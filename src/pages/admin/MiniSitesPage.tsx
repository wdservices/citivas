import { useEffect, useState } from 'react'
import { collection, getDocs, setDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { Trash2, RotateCcw, UtensilsCrossed, BedDouble, Building, Search } from 'lucide-react'
import { MINI_SITES } from '@/data/admin/miniSites'
import { AdminTableRowsSkeleton } from '@/components/ui/ListingSkeletons'

export default function AdminMiniSitesPage() {
  const [removed, setRemoved] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)
  const [query, setQuery] = useState('')

  const load = async () => {
    setLoading(true)
    try {
      const snap = await getDocs(collection(db, 'mini_site_removals'))
      setRemoved(new Set(snap.docs.map((d) => d.id)))
    } catch (e) {
      console.error('Failed to load mini site removals', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const toggle = async (slug: string, remove: boolean) => {
    setBusy(slug)
    try {
      if (remove) {
        await setDoc(doc(db, 'mini_site_removals', slug), { slug, removedAt: serverTimestamp() })
        setRemoved((p) => new Set(p).add(slug))
      } else {
        await deleteDoc(doc(db, 'mini_site_removals', slug))
        setRemoved((p) => { const n = new Set(p); n.delete(slug); return n })
      }
    } catch (e) {
      console.error(e)
      alert('Could not update this listing. Check your connection and try again.')
    } finally {
      setBusy(null)
    }
  }

  const rows = MINI_SITES.filter(
    (s) => !query || s.name.toLowerCase().includes(query.toLowerCase()) || s.city.toLowerCase().includes(query.toLowerCase())
  )

  const iconFor = (t: string) => (t === 'restaurant' ? UtensilsCrossed : t === 'hotel' ? Building : BedDouble)

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-2xl font-extrabold text-ink">Mini Websites</h1>
        <p className="mt-1 text-sm text-sand-500">
          Hotel, shortlet and restaurant storefronts seeded by Citivas admin. Removing one hides it everywhere in the app.
        </p>
      </header>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-sand-400" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name or city..."
          className="w-full rounded-xl border border-sand-200 bg-white py-2.5 pl-10 pr-4 text-sm outline-none focus:border-marigold"
        />
      </div>

      <div className="overflow-hidden rounded-2xl border border-sand-200 bg-white shadow-card">
        <table className="w-full text-left text-sm">
          <thead className="bg-sand-100 text-xs uppercase tracking-wider text-sand-500">
            <tr>
              <th className="px-5 py-3">Business</th>
              <th className="px-5 py-3">Type</th>
              <th className="px-5 py-3">City</th>
              <th className="px-5 py-3">Listed by</th>
              <th className="px-5 py-3">Status</th>
              <th className="px-5 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-sand-200">
            {loading ? (
              <AdminTableRowsSkeleton cols={6} rows={6} asTable />
            ) : rows.map((s) => {
              const Icon = iconFor(s.type)
              const isRemoved = removed.has(s.slug)
              return (
                <tr key={s.slug} className={isRemoved ? 'opacity-60' : ''}>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <img src={s.cover} alt="" className="h-10 w-10 rounded-lg object-cover" />
                      <div>
                        <p className="font-semibold text-ink">{s.name}</p>
                        <p className="text-xs text-sand-500">/m/{s.slug}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    <span className="inline-flex items-center gap-1.5 text-ink">
                      <Icon className="h-4 w-4 text-marigold" />
                      <span className="capitalize">{s.type}</span>
                    </span>
                  </td>
                  <td className="px-5 py-3 text-sand-500">{s.city}</td>
                  <td className="px-5 py-3">
                    <span className="rounded-full bg-palm/10 px-2.5 py-1 text-xs font-semibold text-palm">Admin</span>
                  </td>
                  <td className="px-5 py-3">
                    {isRemoved
                      ? <span className="rounded-full bg-coral/10 px-2.5 py-1 text-xs font-semibold text-coral">Removed</span>
                      : <span className="rounded-full bg-marigold/10 px-2.5 py-1 text-xs font-semibold text-marigold-dark">Live</span>}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <button
                      disabled={busy === s.slug}
                      onClick={() => toggle(s.slug, !isRemoved)}
                      className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition-colors disabled:opacity-50 ${
                        isRemoved ? 'bg-sand-100 text-ink hover:bg-sand-200' : 'bg-coral text-white hover:bg-coral-light'
                      }`}
                    >
                      {isRemoved ? <><RotateCcw className="h-3.5 w-3.5" /> Restore</> : <><Trash2 className="h-3.5 w-3.5" /> Delete</>}
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
