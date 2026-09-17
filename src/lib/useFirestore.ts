import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  collection, getDocs, getDoc, query, where, doc,
  addDoc, updateDoc, deleteDoc, serverTimestamp,
  limit as fsLimit, orderBy, collectionGroup,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { stateVariants } from "@/lib/normalizeBusiness";

// ── Safe field formatter (handles GeoPoint, objects, etc.) ──
export const fmt = (val: any): string => {
  if (val === null || val === undefined) return "";
  if (typeof val === "string") return val;
  if (typeof val === "number") return String(val);
  if (val._lat !== undefined && val._long !== undefined) {
    return `${val._lat.toFixed(4)}, ${val._long.toFixed(4)}`;
  }
  return String(val);
};

// ── Cache config per collection ──
const CACHE = {
  businesses: { staleTime: 5 * 60 * 1000, gcTime: 30 * 60 * 1000 },   // 5 min fresh, 30 min GC
  marketplace: { staleTime: 3 * 60 * 1000, gcTime: 15 * 60 * 1000 },  // 3 min fresh, 15 min GC
  house_listings: { staleTime: 5 * 60 * 1000, gcTime: 30 * 60 * 1000 },
  properties: { staleTime: 5 * 60 * 1000, gcTime: 30 * 60 * 1000 },
  reviews: { staleTime: 2 * 60 * 1000, gcTime: 10 * 60 * 1000 },
  users: { staleTime: 10 * 60 * 1000, gcTime: 60 * 60 * 1000 },
};

// ────────────────────────────────────────────
// GENERIC HOOKS
// ────────────────────────────────────────────

/** Fetch all docs from a collection (optionally filtered) */
export function useCollection<T = any>(
  collectionName: string,
  filters?: ReturnType<typeof where>[],
  maxLimit?: number,
) {
  const cfg = (CACHE as any)[collectionName] || { staleTime: 5 * 60_000, gcTime: 30 * 60_000 };
  return useQuery({
    queryKey: [collectionName, filters?.map(f => `${f.field}${f.op}${f.value}`).join("|"), maxLimit],
    queryFn: async () => {
      let q: any = collection(db, collectionName);
      if (filters?.length) {
        q = query(q, ...filters);
      }
      if (maxLimit) {
        q = query(q, fsLimit(maxLimit));
      }
      const snap = await getDocs(q);
      return snap.docs.map((d) => ({ id: d.id, ...d.data() })) as T[];
    },
    staleTime: cfg.staleTime,
    gcTime: cfg.gcTime,
  });
}

/** Fetch a single doc by ID */
export function useDoc<T = any>(collectionName: string, docId: string | null) {
  const cfg = (CACHE as any)[collectionName] || { staleTime: 5 * 60_000, gcTime: 30 * 60_000 };
  return useQuery({
    queryKey: [collectionName, docId],
    queryFn: async () => {
      const snap = await getDoc(doc(db, collectionName, docId!));
      if (!snap.exists()) return null;
      return { id: snap.id, ...snap.data() } as T;
    },
    enabled: !!docId,
    staleTime: cfg.staleTime,
    gcTime: cfg.gcTime,
  });
}

// ────────────────────────────────────────────
// COLLECTION-SPECIFIC HOOKS
// ────────────────────────────────────────────

export function useMarketplaceItems() {
  // Products live in two places: business subcollections
  // (businesses/{bid}/products) AND legacy top-level `marketplace`
  // (individual sellers). Merge both, dedupe by doc id.
  return useQuery({
    queryKey: ["marketplace_all"],
    queryFn: async () => {
      const [groupSnap, topSnap] = await Promise.all([
        getDocs(collectionGroup(db, "products")).catch(() => ({ docs: [] }) as any),
        getDocs(collection(db, "marketplace")).catch(() => ({ docs: [] }) as any),
      ]);
      const seen = new Set<string>();
      const out: any[] = [];
      for (const d of [...groupSnap.docs, ...topSnap.docs]) {
        if (seen.has(d.id)) continue;
        seen.add(d.id);
        out.push({ id: d.id, ...d.data() });
      }
      return out;
    },
    staleTime: 3 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
  });
}

export function useBusinesses(state?: string) {
  // DB stores city names ("Port Harcourt") while RegionContext uses state
  // names ("Rivers") — query all variants so seeded rows are not filtered out.
  const variants = state ? stateVariants(state) : undefined;
  const filters = variants ? [where("state", "in", variants.slice(0, 10))] : undefined;
  return useCollection("businesses", filters);
}

export function useEvents() {
  // Events live in business subcollections (businesses/{bid}/events) AND
  // legacy top-level `events`. Merge both, dedupe by doc id.
  return useQuery({
    queryKey: ["events_all"],
    queryFn: async () => {
      const [groupSnap, topSnap] = await Promise.all([
        getDocs(collectionGroup(db, "events")).catch(() => ({ docs: [] }) as any),
        getDocs(collection(db, "events")).catch(() => ({ docs: [] }) as any),
      ]);
      const seen = new Set<string>();
      const out: any[] = [];
      for (const d of [...groupSnap.docs, ...topSnap.docs]) {
        if (seen.has(d.id)) continue;
        seen.add(d.id);
        out.push({ id: d.id, ...d.data() });
      }
      return out;
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}

export function useHouseListings() {
  // Properties live in business subcollections (businesses/{bid}/properties)
  // AND legacy top-level `house_listings`. Merge both, dedupe by doc id.
  return useQuery({
    queryKey: ["house_listings_and_properties"],
    queryFn: async () => {
      const [groupSnap, topSnap] = await Promise.all([
        getDocs(collectionGroup(db, "properties")).catch(() => ({ docs: [] }) as any),
        getDocs(collection(db, "house_listings")).catch(() => ({ docs: [] }) as any),
      ]);
      const seen = new Set<string>();
      const out: any[] = [];
      for (const d of [...groupSnap.docs, ...topSnap.docs]) {
        if (seen.has(d.id)) continue;
        seen.add(d.id);
        out.push({ id: d.id, ...d.data() });
      }
      return out;
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}

export const useProperties = useHouseListings;

export function usePropertyBookings(ownerId: string | null) {
  return useQuery({
    queryKey: ["property_bookings", ownerId],
    queryFn: async () => {
      if (!ownerId) return [];
      const q = query(collection(db, "property_bookings"), where("ownerId", "==", ownerId));
      const snap = await getDocs(q);
      return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    },
    enabled: !!ownerId,
  });
}

/** Fetch bookings made by the current user (guest). */
export function useMyPropertyBookings(userId: string | null) {
  return useQuery({
    queryKey: ["my_property_bookings", userId],
    queryFn: async () => {
      if (!userId) return [];
      const q = query(collection(db, "property_bookings"), where("payerId", "==", userId));
      const snap = await getDocs(q);
      return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    },
    enabled: !!userId,
  });
}

/** Fetch products, properties, events and menu items belonging to a specific business */
export function useBusinessChildren(businessId: string | null) {
  return useQuery({
    queryKey: ["businessChildren", businessId],
    queryFn: async () => {
      if (!businessId) return { products: [], properties: [], menu: [], events: [] };
      try {
        const [propSnap, prodSnap, menuSnap, eventSnap] = await Promise.all([
          getDocs(collection(db, "businesses", businessId, "properties")),
          getDocs(collection(db, "businesses", businessId, "products")),
          getDocs(collection(db, "businesses", businessId, "menu")),
          getDocs(collection(db, "businesses", businessId, "events")),
        ]);

        return {
          products: prodSnap.docs.map((d) => ({ id: d.id, ...d.data() } as any)),
          properties: propSnap.docs.map((d) => ({ id: d.id, ...d.data() } as any)),
          menu: menuSnap.docs.map((d) => ({ id: d.id, ...d.data() } as any)),
          events: eventSnap.docs.map((d) => ({ id: d.id, ...d.data() } as any)),
        };
      } catch (error) {
        console.error("[useBusinessChildren] Error:", error);
        return { products: [], properties: [], menu: [], events: [] };
      }
    },
    enabled: !!businessId,
    staleTime: 2 * 60_000,
    gcTime: 10 * 60_000,
  });
}

/** Fetch all products and properties for multiple businesses (for DetailPage) */
export function useBusinessesProducts(businessIds: string[]) {
  return useQuery({
    queryKey: ["businessesProducts", businessIds.sort().join(",")],
    queryFn: async () => {
      if (businessIds.length === 0) return { products: [], properties: [] };
      try {
        // Business-first: fetch from subcollections via collectionGroup + client filter
        const [prodGroup, propGroup] = await Promise.all([
          getDocs(collectionGroup(db, "products")),
          getDocs(collectionGroup(db, "properties")),
        ]);
        const idSet = new Set(businessIds);
        return {
          products: prodGroup.docs.map((d) => ({ id: d.id, ...d.data() } as any)).filter((p: any) => p.businessId && idSet.has(p.businessId) || true) // keep all, filter if businessId present
            .filter((p: any) => !p.businessId || idSet.has(p.businessId)),
          properties: propGroup.docs.map((d) => ({ id: d.id, ...d.data() } as any)).filter((p: any) => !p.businessId || idSet.has(p.businessId)),
        };
      } catch (error) {
        console.error("[useBusinessesProducts] Error:", error);
        return { products: [], properties: [] };
      }
    },
    enabled: businessIds.length > 0,
    staleTime: 3 * 60_000,
    gcTime: 15 * 60_000,
  });
}

export function useMyListings(userId: string | null) {
  return useQuery({
    queryKey: ["myListings", userId],
    queryFn: async () => {
      if (!userId) return { businesses: [], products: [], properties: [], events: [] };
      
      try {
        const [bizSnap, propGroupSnap, prodGroupSnap, eventGroupSnap, marketplaceSnap, houseListingsSnap] = await Promise.all([
          getDocs(query(collection(db, "businesses"), where("ownerId", "==", userId))),
          getDocs(collectionGroup(db, "properties")).catch(() => ({ docs: [] } as any)),
          getDocs(collectionGroup(db, "products")).catch(() => ({ docs: [] } as any)),
          getDocs(collectionGroup(db, "events")).catch(() => ({ docs: [] } as any)),
          getDocs(query(collection(db, "marketplace"), where("ownerId", "==", userId))).catch(() => ({ docs: [] } as any)),
          getDocs(query(collection(db, "house_listings"), where("ownerId", "==", userId))).catch((err) => { console.error("[useMyListings] house_listings query failed:", err); return { docs: [] } as any; }),
        ]);

        const userBizIds = new Set(bizSnap.docs.map((d) => d.id));

        // Business-first: only subcollections
        const propMap = new Map<string, any>();
        propGroupSnap.docs.forEach((d: any) => {
          const data = d.data();
          if (data.ownerId === userId || (data.businessId && userBizIds.has(data.businessId))) {
            propMap.set(d.id, { id: d.id, ...data });
          }
        });
        houseListingsSnap.docs.forEach((d: any) => {
          const data = d.data();
          if (data.ownerId === userId || (data.businessId && userBizIds.has(data.businessId))) {
            propMap.set(d.id, { id: d.id, ...data });
          }
        });

        const prodMap = new Map<string, any>();
        prodGroupSnap.docs.forEach((d: any) => {
          const data = d.data();
          if (data.ownerId === userId || (data.businessId && userBizIds.has(data.businessId))) {
            prodMap.set(d.id, { id: d.id, ...data });
          }
        });
        marketplaceSnap.docs.forEach((d: any) => {
          const data = d.data();
          if (data.ownerId === userId || (data.businessId && userBizIds.has(data.businessId))) {
            prodMap.set(d.id, { id: d.id, ...data });
          }
        });

        const eventMap = new Map<string, any>();
        eventGroupSnap.docs.forEach((d: any) => {
          const data = d.data();
          if (data.ownerId === userId || (data.businessId && userBizIds.has(data.businessId))) {
            eventMap.set(d.id, { id: d.id, ...data });
          }
        });
        
        const props = Array.from(propMap.values());
        console.log("[useMyListings] Debug:", { bizCount: bizSnap.docs.length, propCount: props.length, prodCount: Array.from(prodMap.values()).length, eventCount: Array.from(eventMap.values()).length, houseListingsCount: houseListingsSnap.docs.length });
        return {
          businesses: bizSnap.docs.map((d) => ({ id: d.id, ...d.data() } as any)).filter((b: any) => b.category !== "Event" && b.category !== "Events"),
          events: Array.from(eventMap.values()),
          products: Array.from(prodMap.values()),
          properties: props,
        };
      } catch (error) {
        console.error("[useMyListings] Error:", error);
        throw error;
      }
    },
    enabled: !!userId,
    staleTime: 2 * 60_000,
    gcTime: 10 * 60_000,
  });
}

export function useReviews(targetId: string | null) {
  return useCollection(
    "reviews",
    targetId ? [where("targetId", "==", targetId)] : undefined,
  );
}

/** Fetch all ticket orders for a specific event */
export function useTicketOrders(eventId: string | null) {
  return useCollection(
    "ticket_orders",
    eventId ? [where("eventId", "==", eventId)] : undefined,
  );
}

/** Fetch all ticket orders for a user's events (as organizer) */
export function useMyEventOrders(userId: string | null, eventIds: string[]) {
  return useQuery({
    queryKey: ["myEventOrders", userId, eventIds.sort().join(",")],
    queryFn: async () => {
      if (!userId || eventIds.length === 0) return [];
      const snap = await getDocs(
        query(collection(db, "ticket_orders"), where("eventId", "in", eventIds))
      );
      return snap.docs.map((d) => ({ id: d.id, ...d.data() })) as any[];
    },
    enabled: !!userId && eventIds.length > 0,
    staleTime: 0,
    gcTime: 5 * 60_000,
  });
}

/** Fetch all ticket orders for a user (as buyer) */
export function useMyTicketOrders(userId: string | null) {
  return useQuery({
    queryKey: ["myTicketOrders", userId],
    queryFn: async () => {
      if (!userId) return [];
      const snap = await getDocs(
        query(collection(db, "ticket_orders"), where("buyerId", "==", userId))
      );
      return snap.docs.map((d) => ({ id: d.id, ...d.data() })) as any[];
    },
    enabled: !!userId,
    staleTime: 1 * 60_000,
    gcTime: 5 * 60_000,
  });
}

/** Fetch events a user has tickets for */
export function useMyAttendedEvents(userId: string | null, eventIds: string[]) {
  return useQuery({
    queryKey: ["myAttendedEvents", userId, eventIds.sort().join(",")],
    queryFn: async () => {
      if (!userId || eventIds.length === 0) return [];
      const snap = await getDocs(
        query(collection(db, "businesses"), where("category", "==", "Event"))
      );
      // Filter in-memory since we need to match eventIds from orders
      return snap.docs
        .map((d) => ({ id: d.id, ...d.data() } as any))
        .filter((e) => eventIds.includes(e.id));
    },
    enabled: !!userId && eventIds.length > 0,
    staleTime: 2 * 60_000,
    gcTime: 10 * 60_000,
  });
}

// ────────────────────────────────────────────
// MUTATIONS (with cache invalidation)
// ────────────────────────────────────────────

export function useCreateDoc(collectionName: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: any) => {
      return addDoc(collection(db, collectionName), {
        ...data,
        createdAt: serverTimestamp(),
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [collectionName] });
      qc.invalidateQueries({ queryKey: ["myListings"] });
    },
  });
}

export function useUpdateDoc(collectionName: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      return updateDoc(doc(db, collectionName, id), data);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [collectionName] });
      qc.invalidateQueries({ queryKey: ["myListings"] });
    },
  });
}

export function useDeleteDoc(collectionName: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      return deleteDoc(doc(db, collectionName, id));
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [collectionName] });
      qc.invalidateQueries({ queryKey: ["myListings"] });
    },
  });
}

export function useCreateReview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: any) => {
      return addDoc(collection(db, "reviews"), {
        ...data,
        createdAt: serverTimestamp(),
      });
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ["reviews", variables.targetId] });
    },
  });
}

// ── User Image Asset Library ──

export interface UserUpload {
  id: string;
  url: string;
  publicId: string;
  folder: string;
  bytes: number;
  createdAt: any;
}

export function useUserAssets(userId: string | null) {
  return useQuery({
    queryKey: ["userAssets", userId],
    queryFn: async () => {
      if (!userId) return [];
      try {
        const snap = await getDocs(
          query(collection(db, "user_uploads"), where("userId", "==", userId))
        );
        return snap.docs
          .map((d) => ({ id: d.id, ...d.data() } as UserUpload))
          .sort((a, b) => {
            const ta = a.createdAt?.toMillis?.() ?? 0;
            const tb = b.createdAt?.toMillis?.() ?? 0;
            return tb - ta;
          });
      } catch (err) {
        console.error("[useUserAssets] Error:", err);
        return [];
      }
    },
    enabled: !!userId,
    staleTime: 30_000,
    gcTime: 5 * 60_000,
  });
}

export function useTrackUpload() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: { userId: string; url: string; publicId: string; folder: string; bytes: number }) => {
      return addDoc(collection(db, "user_uploads"), {
        ...data,
        createdAt: serverTimestamp(),
      });
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ["userAssets", variables.userId] });
    },
  });
}

export function useDeleteAsset() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, userId }: { id: string; userId: string }) => {
      await deleteDoc(doc(db, "user_uploads", id));
      return id;
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ["userAssets", variables.userId] });
    },
  });
}
