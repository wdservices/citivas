import { useCallback, useEffect, useState, useRef } from 'react';
import { collection, collectionGroup, getDocs } from 'firebase/firestore';
import { db } from './firebase';
import { fmt } from './fmt';
import { dataCache, cacheKey } from './cache';

export type ExploreListing = {
  id: string;
  title: string;
  description: string;
  image: string;
  category: string;
  rating?: number;
  location?: string;
  price?: string;
  promoPrice?: string;
  condition?: string;
  businessId?: string;
  ownerId?: string;
  state?: string;
  city?: string;
  lat?: number;
  lon?: number;
  startDate?: string;
  endDate?: string;
  startTime?: string;
  endTime?: string;
  ticketTypes?: { name: string; price: string | number; quantity: string | number }[];
  tags?: string[];
  venue?: string;
  createdAt?: string;
  kind: 'business' | 'event' | 'marketplace' | 'property';
};

export type ExploreData = {
  businesses: ExploreListing[];
  events: ExploreListing[];
  marketplace: ExploreListing[];
  properties: ExploreListing[];
};

export function mapBusiness(b: Record<string, unknown> & { id: string }): ExploreListing {
  const ticketTypes = Array.isArray(b.ticketTypes)
    ? (b.ticketTypes as any[]).map((t) => ({
        name: fmt(t.name) || 'Ticket',
        price: typeof t.price === 'number' ? t.price : Number(t.price) || 0,
        quantity: typeof t.quantity === 'number' ? t.quantity : Number(t.quantity) || 0,
      }))
    : undefined;

  return {
    id: b.id,
    title: fmt(b.title) || fmt(b.name),
    description: fmt(b.description),
    image: fmt(b.image) || fmt(b.imageUrl) || (Array.isArray(b.images) && b.images[0] ? fmt(b.images[0]) : ''),
    category: fmt(b.category),
    rating: typeof b.rating === 'number' ? b.rating : Number(b.rating) || 0,
    location: fmt(b.location) || fmt(b.city),
    price: fmt(b.price),
    promoPrice: fmt(b.promoPrice) || undefined,
    condition: fmt(b.condition) || undefined,
    businessId: fmt(b.businessId) || undefined,
    ownerId: fmt(b.ownerId) || fmt(b.userId) || fmt(b.uid) || undefined,
    state: fmt(b.state) || undefined,
    city: fmt(b.city) || undefined,
    lat: typeof b.lat === 'number' ? b.lat : undefined,
    lon: typeof b.lon === 'number' ? b.lon : undefined,
    startDate: fmt(b.startDate) || undefined,
    endDate: fmt(b.endDate) || undefined,
    startTime: fmt(b.startTime) || undefined,
    endTime: fmt(b.endTime) || undefined,
    ticketTypes,
    tags: Array.isArray(b.tags) ? b.tags.map(fmt).filter(Boolean) : undefined,
    venue: fmt(b.venue) || undefined,
    createdAt: (() => {
      const v = b.createdAt;
      if (!v) return undefined;
      if (typeof v === 'string') return v;
      if (typeof v === 'number') return new Date(v).toISOString();
      if (v && typeof v === 'object' && 'seconds' in v) {
        return new Date((v as any).seconds * 1000).toISOString();
      }
      return fmt(v) || undefined;
    })(),
    kind: 'business',
  };
}

const EXPLORE_CACHE_KEY = cacheKey('explore', 'all', 'v2');

export function useExploreData() {
  const cached = dataCache.get<ExploreData>(EXPLORE_CACHE_KEY);
  const [loading, setLoading] = useState(!cached);
  const [businesses, setBusinesses] = useState<ExploreListing[]>(cached?.businesses || []);
  const [events, setEvents] = useState<ExploreListing[]>(cached?.events || []);
  const [marketplace, setMarketplace] = useState<ExploreListing[]>(cached?.marketplace || []);
  const [properties, setProperties] = useState<ExploreListing[]>(cached?.properties || []);
  const [error, setError] = useState<string | null>(null);
  const fetched = useRef(!!cached);

  const load = useCallback(async (force = false) => {
    if (!force && dataCache.has(EXPLORE_CACHE_KEY)) {
      const c = dataCache.get<ExploreData>(EXPLORE_CACHE_KEY)!;
      setBusinesses(c.businesses);
      setEvents(c.events);
      setMarketplace(c.marketplace);
      setProperties(c.properties);
      setLoading(false);
      fetched.current = true;
      return;
    }

    setLoading(true);
    setError(null);
    try {
      // Mirror the website's fetch strategy (src/lib/useFirestore.ts): each
      // entity lives in BOTH business subcollections AND a legacy top-level
      // collection. Products additionally live in `house_listings`. Reading
      // only the collectionGroup queries left the app's marketplace empty
      // even though the data exists in the DB.
      const [bizSnap, evtGroupSnap, evtTopSnap, mktGroupSnap, mktTopSnap, houseSnap, propGroupSnap] =
        await Promise.all([
          getDocs(collection(db, 'businesses')),
          getDocs(collectionGroup(db, 'events')).catch(() => ({ docs: [] } as any)),
          getDocs(collection(db, 'events')).catch(() => ({ docs: [] } as any)),
          getDocs(collectionGroup(db, 'products')).catch(() => ({ docs: [] } as any)),
          getDocs(collection(db, 'marketplace')).catch(() => ({ docs: [] } as any)),
          getDocs(collection(db, 'house_listings')).catch(() => ({ docs: [] } as any)),
          getDocs(collectionGroup(db, 'properties')).catch(() => ({ docs: [] } as any)),
        ]);

      const allBiz = bizSnap.docs.map((d) => mapBusiness({ id: d.id, ...d.data() }));
      const biz = allBiz.filter((b) => b.category !== 'Event' && b.category !== 'Events');

      const seenEvt = new Set<string>();
      const evt: (ExploreListing & { kind: 'event' })[] = [];
      [...evtGroupSnap.docs, ...evtTopSnap.docs].forEach((d) => {
        if (!seenEvt.has(d.id)) {
          seenEvt.add(d.id);
          evt.push({
            ...mapBusiness({ id: d.id, ...d.data() }),
            kind: 'event' as const,
          });
        }
      });

      const seenMkt = new Set<string>();
      const mkt: (ExploreListing & { kind: 'marketplace' })[] = [];
      [...mktGroupSnap.docs, ...mktTopSnap.docs, ...houseSnap.docs].forEach((d) => {
        if (!seenMkt.has(d.id)) {
          seenMkt.add(d.id);
          mkt.push({
            ...mapBusiness({ id: d.id, ...d.data() }),
            kind: 'marketplace' as const,
          });
        }
      });

      const seenProp = new Set<string>();
      const prop: (ExploreListing & { kind: 'property' })[] = [];
      [...propGroupSnap.docs, ...houseSnap.docs].forEach((d) => {
        const data = d.data();
        // Dedupe by title+ownerId (not doc id): ProfileDashboard writes the
        // same listing to both collections under different doc IDs.
        const key = `${String(data.title || '').toLowerCase().trim()}|${data.ownerId || ''}`;
        if (!seenProp.has(key)) {
          seenProp.add(key);
          prop.push({
            ...mapBusiness({ id: d.id, ...data }),
            kind: 'property' as const,
            category: fmt(data.category || data.type) || 'Property',
          });
        }
      });

      dataCache.set<ExploreData>(EXPLORE_CACHE_KEY, { businesses: biz, events: evt, marketplace: mkt, properties: prop });

      setBusinesses(biz);
      setEvents(evt);
      setMarketplace(mkt);
      setProperties(prop);
      fetched.current = true;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load listings');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!fetched.current) load();
  }, [load]);

  const refresh = useCallback(() => load(true), [load]);

  return { loading, error, businesses, events, marketplace, properties, refresh };
}

export function rotateListingWindow<T>(items: T[], count: number, tick: number, offset = 0): T[] {
  if (items.length === 0) return [];
  if (items.length <= count) return items;
  const start = (tick + offset) % items.length;
  const out: T[] = [];
  for (let i = 0; i < count; i += 1) {
    out.push(items[(start + i) % items.length]);
  }
  return out;
}

export function filterListings(items: ExploreListing[], query: string): ExploreListing[] {
  const q = query.trim().toLowerCase();
  if (!q) return items;
  return items.filter(
    (item) =>
      item.title.toLowerCase().includes(q) ||
      item.category.toLowerCase().includes(q) ||
      (item.location?.toLowerCase().includes(q) ?? false),
  );
}
