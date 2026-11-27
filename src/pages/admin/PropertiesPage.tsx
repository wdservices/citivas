import { useEffect, useMemo, useState, FormEvent } from 'react'
import { Home, MapPin, Star, Search, Plus, Trash2, X, Building2 } from 'lucide-react'
import { listenHouseListings, createHouseListing, deleteHouseListing } from '@/lib/adminData'
import { MOCK_PROPERTY_LISTINGS, type PropertyListing } from '@/data/admin/propertyListings'
import { useAuth } from '@/contexts/AuthContext'
import { AdminCardGridSkeleton } from '@/components/ui/ListingSkeletons'

const DELETED_MOCKS_KEY = 'citivas.admin.deletedPropertyMocks'

const HOUSE_TYPES = [
  'Apartment', 'Studio', 'Penthouse', 'Villa', 'House',
  'Loft', 'Townhouse', 'Hotel', 'Shortlet', 'Land', 'For Rent', 'For Sale',
]
const SUB_TYPES = ['rent', 'sale', 'land', 'hotel', 'shortlet']

export default function AdminPropertiesPage() {
  const { user } = useAuth()
  const uid = user?.id || ''
  const [firestoreListings, setFirestoreListings] = useState<PropertyListing[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)
  const [deletedMockIds, setDeletedMockIds] = useState<Set<string>>(() => {
    if (typeof window === 'undefined') return new Set()
    try {
      const raw = localStorage.getItem(DELETED_MOCKS_KEY)
      return raw ? new Set(JSON.parse(raw)) : new Set()
    } catch {
      return new Set()
    }
  })
  const [showForm, setShowForm] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    const unsub = listenHouseListings((data) => {
      setFirestoreListings(data as PropertyListing[])
      setLoading(false)
    })
    return unsub
  }, [])

  const listings = useMemo(() => {
    const activeMocks = MOCK_PROPERTY_LISTINGS.filter(
      (m) => !deletedMockIds.has(m.id),
    ).map((m) => ({ ...m, isMock: true } as PropertyListing))

    const dedupedFirestore = firestoreListings.filter(
      (f) => !activeMocks.some((m) => m.id === f.id),
    )

    return [...dedupedFirestore, ...activeMocks]
  }, [firestoreListings, deletedMockIds])

  const filtered = useMemo(
    () => listings.filter((l) => l.title?.toLowerCase().includes(searchTerm.toLowerCase())),
    [listings, searchTerm],
  )

  const counts = useMemo(() => {
    const c = { rent: 0, sale: 0, land: 0, hotel: 0, shortlet: 0 }
    for (const l of listings) {
      const key = (l.propertySubType || 'shortlet') as keyof typeof c
      c[key] = (c[key] || 0) + 1
    }
    return c
  }, [listings])

  const handleDelete = async (listing: PropertyListing) => {
    if (!confirm(`Delete "${listing.title}"? This cannot be undone.`)) return
    if (listing.isMock) {
      const next = new Set(deletedMockIds)
      next.add(listing.id)
      setDeletedMockIds(next)
      try {
        localStorage.setItem(DELETED_MOCKS_KEY, JSON.stringify(Array.from(next)))
      } catch (err) {
        console.warn('Could not persist deleted mock ID', err)
      }
    } else {
      await deleteHouseListing(listing.id)
    }
  }

  const handleCreate = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    setIsSaving(true)
    try {
      const bedrooms = Number(form.get('bedrooms')) || 0
      const bathrooms = Number(form.get('bathrooms')) || 0
      const price = String(form.get('price') || '')
      await createHouseListing({
        title: form.get('title'),
        description: form.get('description'),
        type: form.get('type'),
        propertySubType: form.get('propertySubType'),
        price: price.startsWith('₦') ? price : price ? `₦${price}` : '',
        image: form.get('image') || '',
        location: form.get('location'),
        state: form.get('state'),
        city: form.get('city'),
        bedrooms,
        bathrooms,
        guests: bedrooms * 2,
        rating: 0,
        reviews: 0,
        phone: form.get('phone') || '',
        email: form.get('email') || '',
        listedOn: new Date().toISOString().slice(0, 10),
      }, uid)
      setShowForm(false)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-display text-3xl md:text-4xl font-extrabold text-ink">Properties</h1>
          <p className="text-sm text-ink/60 mt-1">{listings.length.toLocaleString()} listings</p>
          <div className="flex flex-wrap gap-2 mt-3 text-xs font-semibold">
            <span className="px-2 py-1 rounded-lg bg-ink/5 text-ink/80">{counts.shortlet} Shortlets</span>
            <span className="px-2 py-1 rounded-lg bg-ink/5 text-ink/80">{counts.rent} Rent</span>
            <span className="px-2 py-1 rounded-lg bg-ink/5 text-ink/80">{counts.sale} For Sale</span>
            <span className="px-2 py-1 rounded-lg bg-ink/5 text-ink/80">{counts.land} Land</span>
            <span className="px-2 py-1 rounded-lg bg-ink/5 text-ink/80">{counts.hotel} Hotels</span>
          </div>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-marigold text-ink font-semibold text-sm"
        >
          <Plus className="h-4 w-4" /> Add Property
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink/40" />
        <input
          type="text"
          placeholder="Search properties..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 rounded-xl border border-sand-200 bg-white text-sm"
        />
      </div>

      {loading ? (
        <AdminCardGridSkeleton count={6} />
      ) : filtered.length === 0 ? (
        <div className="card py-12 text-center">
          <Home className="h-10 w-10 text-ink/20 mx-auto mb-3" />
          <p className="text-sm text-ink/50">
            {listings.length === 0 ? 'No properties listed yet.' : 'No properties match your search.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((listing) => (
            <div key={listing.id} className="card">
              <div
                className="h-32 rounded-xl bg-sand-100 mb-3 relative"
                style={listing.image ? { backgroundImage: `url(${listing.image})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}
              >
                <div className="absolute top-2 left-2 flex gap-1">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-white/90 text-ink">
                    {listing.type}
                  </span>
                  {listing.isMock && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-marigold/90 text-ink">
                      Sample
                    </span>
                  )}
                </div>
                <button
                  onClick={() => handleDelete(listing)}
                  className="absolute top-2 right-2 p-1.5 rounded-full bg-white/90 text-coral hover:bg-white"
                  title="Delete listing"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <div className="flex items-start justify-between">
                <div className="min-w-0 flex-1">
                  <p className="font-display font-bold text-ink truncate">{listing.title}</p>
                  <p className="text-xs text-ink/50">{listing.type}</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-ink/60 mt-1">
                <MapPin className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{listing.location}</span>
              </div>
              <div className="flex items-center justify-between mt-2">
                <span className="text-sm font-semibold text-marigold truncate">{listing.price}</span>
                <span className="flex items-center gap-1 text-xs text-ink/60 shrink-0">
                  <Star className="h-3.5 w-3.5 fill-marigold text-marigold" /> {listing.rating || 0} ({listing.reviews || 0})
                </span>
              </div>
              <div className="flex items-center gap-3 text-xs text-ink/60 mt-2">
                {listing.bedrooms ? <span className="inline-flex items-center gap-1"><Building2 className="h-3.5 w-3.5" /> {listing.bedrooms}bd</span> : null}
                {listing.bathrooms ? <span>{listing.bathrooms}ba</span> : null}
              </div>
              <span className={`inline-block mt-2 px-2 py-0.5 rounded-full text-xs font-semibold ${
                listing.status === 'Approved' ? 'bg-palm/10 text-palm' : 'bg-marigold/10 text-marigold'
              }`}>
                {listing.status || 'Active'}
              </span>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-xl font-bold text-ink">Add Property Listing</h3>
              <button onClick={() => setShowForm(false)}><X className="h-5 w-5 text-ink/60" /></button>
            </div>
            <form onSubmit={handleCreate} className="space-y-3 text-sm">
              <input name="title" required placeholder="Title" className="w-full px-3 py-2 rounded-xl border border-sand-200" />
              <div className="grid grid-cols-2 gap-2">
                <select name="type" required className="w-full px-3 py-2 rounded-xl border border-sand-200">
                  {HOUSE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
                <select name="propertySubType" required className="w-full px-3 py-2 rounded-xl border border-sand-200">
                  {SUB_TYPES.map((s) => <option key={s} value={s}>{s[0].toUpperCase()}{s.slice(1)}</option>)}
                </select>
              </div>
              <textarea name="description" required placeholder="Description" className="w-full px-3 py-2 rounded-xl border border-sand-200" rows={3} />
              <input name="price" required placeholder="Price (e.g. 95000 or 120,000/night)" className="w-full px-3 py-2 rounded-xl border border-sand-200" />
              <input name="location" required placeholder="Location" className="w-full px-3 py-2 rounded-xl border border-sand-200" />
              <div className="grid grid-cols-2 gap-2">
                <input name="state" placeholder="State" className="w-full px-3 py-2 rounded-xl border border-sand-200" />
                <input name="city" placeholder="City" className="w-full px-3 py-2 rounded-xl border border-sand-200" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input name="bedrooms" type="number" placeholder="Bedrooms" className="w-full px-3 py-2 rounded-xl border border-sand-200" />
                <input name="bathrooms" type="number" placeholder="Bathrooms" className="w-full px-3 py-2 rounded-xl border border-sand-200" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input name="phone" placeholder="Phone" className="w-full px-3 py-2 rounded-xl border border-sand-200" />
                <input name="email" type="email" placeholder="Email" className="w-full px-3 py-2 rounded-xl border border-sand-200" />
              </div>
              <input name="image" placeholder="Image URL" className="w-full px-3 py-2 rounded-xl border border-sand-200" />
              <button type="submit" disabled={isSaving} className="w-full py-2.5 rounded-xl bg-marigold text-ink font-semibold">
                {isSaving ? 'Saving...' : 'Create Listing'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
